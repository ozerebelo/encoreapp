import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyFriendGoing } from "@/lib/notify";

const STATUSES = ["interested", "going"] as const;
type Status = (typeof STATUSES)[number];

// Set or update a user's intent toward a performance (want-to-go / going).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const performanceId = String(body?.performanceId ?? "");
  const status = body?.status as Status;
  if (!performanceId || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "performanceId and valid status required" }, { status: 400 });
  }

  const perf = await prisma.performance.findUnique({ where: { id: performanceId }, select: { id: true } });
  if (!perf) return NextResponse.json({ error: "Unknown performance." }, { status: 404 });

  const prior = await prisma.plan.findUnique({
    where: { userId_performanceId: { userId: user.id, performanceId } },
    select: { status: true },
  });
  await prisma.plan.upsert({
    where: { userId_performanceId: { userId: user.id, performanceId } },
    create: { userId: user.id, performanceId, status },
    update: { status },
  });
  // Notify followers only when newly committing to "going".
  if (status === "going" && prior?.status !== "going") {
    await notifyFriendGoing(user.id, performanceId);
  }
  return NextResponse.json({ status });
}

// Remove a plan (no longer going / not interested).
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const performanceId = String(body?.performanceId ?? "");
  await prisma.plan
    .delete({ where: { userId_performanceId: { userId: user.id, performanceId } } })
    .catch(() => null);
  return NextResponse.json({ status: null });
}
