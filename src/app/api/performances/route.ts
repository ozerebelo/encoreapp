import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseSetlist } from "@/lib/format";

// Canonical performances for an artist, filterable by year and venue/city query
// so artists with hundreds of shows stay searchable in the log flow.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const artistId = url.searchParams.get("artistId");
  const year = url.searchParams.get("year");
  const q = url.searchParams.get("q")?.trim();
  if (!artistId) {
    return NextResponse.json({ error: "artistId required" }, { status: 400 });
  }

  // Distinct years this artist has shows in (for the year filter).
  const yearRows = await prisma.$queryRaw<{ y: number }[]>(
    Prisma.sql`SELECT DISTINCT EXTRACT(YEAR FROM performance_date)::int AS y
               FROM performance WHERE artist_id = ${artistId}::uuid ORDER BY y DESC`
  );
  const years = yearRows.map((r) => r.y);

  const where: Prisma.PerformanceWhereInput = { artistId };
  if (year && /^\d{4}$/.test(year)) {
    where.performanceDate = { gte: new Date(`${year}-01-01`), lt: new Date(`${Number(year) + 1}-01-01`) };
  }
  if (q) {
    where.event = { venue: { OR: [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } };
  }

  const performances = await prisma.performance.findMany({
    where,
    orderBy: { performanceDate: "desc" },
    take: 60,
    include: {
      artist: { select: { name: true, imageUrl: true } },
      event: {
        select: { name: true, type: true, venue: { select: { name: true, city: true, countryCode: true } } },
      },
    },
  });

  return NextResponse.json({
    years,
    total: performances.length,
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
