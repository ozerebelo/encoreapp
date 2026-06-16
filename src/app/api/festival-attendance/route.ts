import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// A user's overall "I did this festival" take (the wristband/trip), distinct
// from their per-set logs pointing at performances inside the event.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const eventId = String(body?.eventId ?? "");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { type: true } });
  if (!event || event.type !== "festival") {
    return NextResponse.json({ error: "Not a festival." }, { status: 400 });
  }

  let rating: Prisma.Decimal | null = null;
  if (body.rating != null && body.rating !== "") {
    const r = Number(body.rating);
    if (!Number.isFinite(r) || r < 0.5 || r > 5 || (r * 2) % 1 !== 0) {
      return NextResponse.json({ error: "Rating must be 0.5–5." }, { status: 400 });
    }
    rating = new Prisma.Decimal(r);
  }

  await prisma.festivalAttendance.upsert({
    where: { userId_eventId: { userId: user.id, eventId } },
    create: { userId: user.id, eventId, rating, review: body.review ? String(body.review).trim() : null },
    update: { rating, review: body.review ? String(body.review).trim() : null },
  });
  return NextResponse.json({ ok: true });
}
