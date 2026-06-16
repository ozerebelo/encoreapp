import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Artist autocomplete for the "log a show" flow.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const artists = await prisma.artist.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, imageUrl: true },
  });
  return NextResponse.json({ artists });
}
