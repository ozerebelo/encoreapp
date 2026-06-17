import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const STANDINGS = ["pit", "ga_floor", "seated", "balcony", "other"] as const;
type Standing = (typeof STANDINGS)[number];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const performanceId = String(body.performanceId ?? "");
  if (!performanceId) {
    return NextResponse.json({ error: "Pick a show to log." }, { status: 400 });
  }

  const performance = await prisma.performance.findUnique({
    where: { id: performanceId },
    select: { id: true, performanceDate: true },
  });
  if (!performance) {
    return NextResponse.json({ error: "Unknown performance." }, { status: 404 });
  }

  // rating: 0.5..5.0 in 0.5 steps, or null
  let rating: Prisma.Decimal | null = null;
  if (body.rating != null && body.rating !== "") {
    const r = Number(body.rating);
    if (!Number.isFinite(r) || r < 0.5 || r > 5 || (r * 2) % 1 !== 0) {
      return NextResponse.json({ error: "Rating must be 0.5–5 in half steps." }, { status: 400 });
    }
    rating = new Prisma.Decimal(r);
  }

  const standing: Standing | null =
    body.standing && STANDINGS.includes(body.standing) ? body.standing : null;

  const loggedDate = body.loggedDate
    ? new Date(String(body.loggedDate))
    : performance.performanceDate;

  const photos: string[] = Array.isArray(body.photos)
    ? body.photos.filter((u: unknown) => typeof u === "string" && u).slice(0, 8)
    : [];

  // Tagged companions are real users, identified by handle. Resolve to ids,
  // dropping anything unknown or the author themselves.
  const companionHandles: string[] = Array.isArray(body.companions)
    ? body.companions.filter((h: unknown) => typeof h === "string").slice(0, 20)
    : [];
  const companionIds = companionHandles.length
    ? (await prisma.user.findMany({
        where: { handle: { in: companionHandles }, id: { not: user.id } },
        select: { id: true },
      })).map((u) => u.id)
    : [];

  try {
    const log = await prisma.log.create({
      data: {
        userId: user.id,
        performanceId: performance.id,
        rating,
        review: body.review ? String(body.review).trim() : null,
        standing,
        attendedWith: body.attendedWith ? String(body.attendedWith).trim() : null,
        stubImageUrl: body.stubImageUrl ? String(body.stubImageUrl).trim() : null,
        isFavorite: Boolean(body.isFavorite),
        loggedDate,
        photos: photos.length
          ? { create: photos.map((url, i) => ({ url, position: i })) }
          : undefined,
        companions: companionIds.length
          ? { create: companionIds.map((userId) => ({ userId })) }
          : undefined,
      },
    });
    return NextResponse.json({ id: log.id, handle: user.handle });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "You've already logged this show." },
        { status: 409 }
      );
    }
    throw e;
  }
}
