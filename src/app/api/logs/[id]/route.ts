import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const STANDINGS = ["pit", "ga_floor", "seated", "balcony", "other"] as const;

async function ownLog(id: string, userId: string) {
  const log = await prisma.log.findUnique({ where: { id }, select: { userId: true } });
  return log?.userId === userId;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!(await ownLog(id, user.id))) return NextResponse.json({ error: "Not your log." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  let rating: Prisma.Decimal | null = null;
  if (body.rating != null && body.rating !== "") {
    const r = Number(body.rating);
    if (!Number.isFinite(r) || r < 0.5 || r > 5 || (r * 2) % 1 !== 0) {
      return NextResponse.json({ error: "Rating must be 0.5–5 in half steps." }, { status: 400 });
    }
    rating = new Prisma.Decimal(r);
  }
  const standing = body.standing && STANDINGS.includes(body.standing) ? body.standing : null;
  const photos: string[] = Array.isArray(body.photos)
    ? body.photos.filter((u: unknown) => typeof u === "string" && u).slice(0, 8)
    : [];

  const companionHandles: string[] = Array.isArray(body.companions)
    ? body.companions.filter((h: unknown) => typeof h === "string").slice(0, 20)
    : [];
  const companionIds = companionHandles.length
    ? (await prisma.user.findMany({
        where: { handle: { in: companionHandles }, id: { not: user.id } },
        select: { id: true },
      })).map((u) => u.id)
    : [];

  await prisma.$transaction([
    prisma.logPhoto.deleteMany({ where: { logId: id } }),
    prisma.logCompanion.deleteMany({ where: { logId: id } }),
    prisma.log.update({
      where: { id },
      data: {
        rating,
        review: body.review ? String(body.review).trim() : null,
        standing,
        attendedWith: body.attendedWith ? String(body.attendedWith).trim() : null,
        stubImageUrl: body.stubImageUrl ? String(body.stubImageUrl).trim() : null,
        isFavorite: Boolean(body.isFavorite),
        photos: photos.length ? { create: photos.map((url, i) => ({ url, position: i })) } : undefined,
        companions: companionIds.length ? { create: companionIds.map((userId) => ({ userId })) } : undefined,
      },
    }),
  ]);
  return NextResponse.json({ handle: user.handle });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!(await ownLog(id, user.id))) return NextResponse.json({ error: "Not your log." }, { status: 403 });

  await prisma.log.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
