import { prisma } from "./db";

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export type UpcomingShow = {
  id: string;
  date: Date;
  artist: string;
  artistSlug: string;
  artistImage: string | null;
  venue: string | null;
  city: string | null;
  goingCount: number;
};

/** Cities with upcoming shows, busiest first (so the default view looks full). */
export async function citiesWithUpcoming(): Promise<string[]> {
  const rows = await prisma.performance.findMany({
    where: { performanceDate: { gte: startOfToday() }, event: { venue: { isNot: null } } },
    select: { event: { select: { venue: { select: { city: true } } } } },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    const c = r.event.venue?.city;
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
}

/** Upcoming shows, optionally filtered to a city, soonest first. */
export async function upcomingShows(city: string | null, limit = 8): Promise<UpcomingShow[]> {
  const perfs = await prisma.performance.findMany({
    where: {
      performanceDate: { gte: startOfToday() },
      ...(city ? { event: { venue: { city } } } : {}),
    },
    orderBy: { performanceDate: "asc" },
    take: limit,
    include: {
      artist: { select: { name: true, slug: true, imageUrl: true } },
      event: { select: { venue: { select: { name: true, city: true } } } },
      _count: { select: { plans: true } },
    },
  });
  return perfs.map((p) => ({
    id: p.id,
    date: p.performanceDate,
    artist: p.artist.name,
    artistSlug: p.artist.slug,
    artistImage: p.artist.imageUrl,
    venue: p.event.venue?.name ?? null,
    city: p.event.venue?.city ?? null,
    goingCount: p._count.plans,
  }));
}
