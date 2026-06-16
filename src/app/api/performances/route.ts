import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSetlist } from "@/lib/format";

// Canonical performances for a given artist. Users attach to these; they
// don't invent shows. Returns event + venue context and the seeded setlist.
export async function GET(req: Request) {
  const artistId = new URL(req.url).searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ error: "artistId required" }, { status: 400 });
  }

  const performances = await prisma.performance.findMany({
    where: { artistId },
    orderBy: { performanceDate: "desc" },
    take: 25,
    include: {
      artist: { select: { name: true, imageUrl: true } },
      event: {
        select: {
          name: true,
          type: true,
          venue: { select: { name: true, city: true, countryCode: true } },
        },
      },
    },
  });

  return NextResponse.json({
    performances: performances.map((p) => ({
      id: p.id,
      date: p.performanceDate,
      stage: p.stage,
      isHeadliner: p.isHeadliner,
      artist: p.artist.name,
      artistImage: p.artist.imageUrl,
      eventName: p.event.name,
      eventType: p.event.type,
      venue: p.event.venue?.name ?? null,
      city: p.event.venue?.city ?? null,
      setlist: parseSetlist(p.setlist),
    })),
  });
}
