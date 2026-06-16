import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Give the list a title." }, { status: 400 });

  const list = await prisma.list.create({
    data: {
      userId: user.id,
      title,
      description: body.description ? String(body.description).trim() : null,
      isRanked: Boolean(body.isRanked),
    },
  });
  return NextResponse.json({ id: list.id });
}
