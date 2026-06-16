import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const displayName = String(body.displayName ?? "").trim();
  if (!displayName) return NextResponse.json({ error: "Display name can't be empty." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName,
      bio: body.bio != null ? String(body.bio).trim() || null : undefined,
      homeCity: body.homeCity != null ? String(body.homeCity).trim() || null : undefined,
      avatarUrl: body.avatarUrl !== undefined ? (body.avatarUrl || null) : undefined,
    },
  });
  return NextResponse.json({ handle: user.handle });
}
