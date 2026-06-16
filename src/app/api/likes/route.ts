import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyLogInteraction } from "@/lib/notify";

// Toggle a like on a log/review.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const logId = String(body?.logId ?? "");
  if (!logId) return NextResponse.json({ error: "logId required" }, { status: 400 });

  const existing = await prisma.like.findUnique({
    where: { userId_logId: { userId: user.id, logId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { userId_logId: { userId: user.id, logId } } });
  } else {
    await prisma.like.create({ data: { userId: user.id, logId } });
    await notifyLogInteraction("log_liked", user.id, logId);
  }

  const count = await prisma.like.count({ where: { logId } });
  return NextResponse.json({ liked: !existing, count });
}
