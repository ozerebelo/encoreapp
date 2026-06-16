import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSetlist } from "@/lib/format";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.performance.findUnique({
    where: { id },
    include: {
      artist: { select: { id: true, name: true, slug: true, imageUrl: true } },
      event: { select: { name: true, type: true, slug: true, venue: { select: { name: true, city: true } } } },
    },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: p.id,
    date: p.performanceDate,
    stage: p.stage,
    isHeadliner: p.isHeadliner,
    artistId: p.artist.id,
    artist: p.artist.name,
    artistImage: p.artist.imageUrl,
    eventName: p.event.name,
    eventType: p.event.type,
    venue: p.event.venue?.name ?? null,
    city: p.event.venue?.city ?? null,
    setlist: parseSetlist(p.setlist),
  });
}
