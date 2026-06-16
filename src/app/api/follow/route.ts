import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyNewFollower } from "@/lib/notify";

async function resolveTarget(body: unknown, user: { id: string }) {
  const handle = String((body as { handle?: string })?.handle ?? "");
  if (!handle) return { error: "handle required" as const };
  const target = await prisma.user.findUnique({ where: { handle } });
  if (!target) return { error: "No such user." as const };
  if (target.id === user.id) return { error: "You can't follow yourself." as const };
  return { target };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const r = await resolveTarget(await req.json().catch(() => null), user);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId: user.id, followeeId: r.target.id } },
  });
  await prisma.follow.upsert({
    where: {
      followerId_followeeId: { followerId: user.id, followeeId: r.target.id },
    },
    create: { followerId: user.id, followeeId: r.target.id },
    update: {},
  });
  if (!existing) await notifyNewFollower(user.id, r.target.id);
  return NextResponse.json({ following: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const r = await resolveTarget(await req.json().catch(() => null), user);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });

  await prisma.follow
    .delete({
      where: {
        followerId_followeeId: { followerId: user.id, followeeId: r.target.id },
      },
    })
    .catch(() => null);
  return NextResponse.json({ following: false });
}
