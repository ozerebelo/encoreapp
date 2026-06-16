import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyLogInteraction } from "@/lib/notify";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const logId = String(body?.logId ?? "");
  const text = String(body?.body ?? "").trim();
  if (!logId || !text) return NextResponse.json({ error: "Say something first." }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "Too long." }, { status: 400 });

  const comment = await prisma.comment.create({
    data: { userId: user.id, logId, body: text },
    include: { user: { select: { handle: true, displayName: true, avatarUrl: true } } },
  });
  await notifyLogInteraction("log_commented", user.id, logId);

  return NextResponse.json({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    user: comment.user,
  });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const comment = await prisma.comment.findUnique({ where: { id }, select: { userId: true } });
  if (!comment) return NextResponse.json({ ok: true });
  if (comment.userId !== user.id) return NextResponse.json({ error: "Not yours." }, { status: 403 });

  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
