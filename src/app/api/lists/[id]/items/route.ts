import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ownList(listId: string, userId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  return list?.userId === userId;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!(await ownList(id, user.id))) {
    return NextResponse.json({ error: "Not your list." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const performanceId = String(body?.performanceId ?? "");
  if (!performanceId) return NextResponse.json({ error: "performanceId required" }, { status: 400 });

  const count = await prisma.listItem.count({ where: { listId: id } });
  await prisma.listItem.upsert({
    where: { listId_performanceId: { listId: id, performanceId } },
    create: { listId: id, performanceId, position: count + 1, note: body.note ? String(body.note).trim() : null },
    update: { note: body.note ? String(body.note).trim() : undefined },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!(await ownList(id, user.id))) {
    return NextResponse.json({ error: "Not your list." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const performanceId = String(body?.performanceId ?? "");
  await prisma.listItem
    .delete({ where: { listId_performanceId: { listId: id, performanceId } } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
