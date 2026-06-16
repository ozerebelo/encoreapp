import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Lightweight global search across artists, people and lists.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ artists: [], users: [], lists: [] });

  const ci = { contains: q, mode: "insensitive" as const };
  const [artists, users, lists] = await Promise.all([
    prisma.artist.findMany({
      where: { name: ci },
      take: 6,
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, imageUrl: true },
    }),
    prisma.user.findMany({
      where: { OR: [{ handle: ci }, { displayName: ci }] },
      take: 6,
      select: { handle: true, displayName: true, avatarUrl: true },
    }),
    prisma.list.findMany({
      where: { title: ci },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, user: { select: { displayName: true } } },
    }),
  ]);

  return NextResponse.json({ artists, users, lists });
}
