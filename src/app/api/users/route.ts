import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// User search for tagging companions on a log. Excludes the current user.
export async function GET(req: Request) {
  const me = await getCurrentUser();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ users: [] });

  const ci = { contains: q, mode: "insensitive" as const };
  const users = await prisma.user.findMany({
    where: {
      AND: [{ OR: [{ handle: ci }, { displayName: ci }] }, me ? { id: { not: me.id } } : {}],
    },
    take: 8,
    orderBy: { handle: "asc" },
    select: { handle: true, displayName: true, avatarUrl: true },
  });
  return NextResponse.json({ users });
}
