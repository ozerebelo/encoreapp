import { headers } from "next/headers";
import { prisma } from "./db";

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type UpcomingShow = {
  id: string;
  date: Date;
  artist: string;
  artistSlug: string;
  artistImage: string | null;
  venue: string | null;
  city: string | null;
  festival: string | null; // festival name when this set is part of one
  goingCount: number;
};

const upcomingWhere = () => ({
  performanceDate: { gte: startOfToday() },
  event: { venue: { isNot: null } },
});

/** Cities with upcoming shows, alphabetical (predictable for the picker). */
export async function citiesWithUpcoming(): Promise<string[]> {
  const rows = await prisma.performance.findMany({
    where: upcomingWhere(),
    select: { event: { select: { venue: { select: { city: true } } } } },
  });
  const set = new Set<string>();
  for (const r of rows) if (r.event.venue?.city) set.add(r.event.venue.city);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Fallback default: the city playing host to the most distinct artists (a real hub). */
export async function busiestUpcomingCity(): Promise<string | null> {
  const rows = await prisma.performance.findMany({
    where: upcomingWhere(),
    select: { artistId: true, event: { select: { venue: { select: { city: true } } } } },
  });
  const byCity = new Map<string, Set<string>>();
  for (const r of rows) {
    const c = r.event.venue?.city;
    if (!c) continue;
    if (!byCity.has(c)) byCity.set(c, new Set());
    byCity.get(c)!.add(r.artistId);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [c, artists] of byCity) {
    if (artists.size > bestN) { bestN = artists.size; best = c; }
  }
  return best;
}

/** Nearest city (to a lat/lon) that actually has upcoming shows, using venue coords. */
export async function nearestUpcomingCity(lat: number, lon: number): Promise<string | null> {
  const venues = await prisma.venue.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      events: { some: { performances: { some: { performanceDate: { gte: startOfToday() } } } } },
    },
    select: { city: true, latitude: true, longitude: true },
  });
  let best: string | null = null;
  let bestD = Infinity;
  for (const v of venues) {
    const d = haversine(lat, lon, Number(v.latitude), Number(v.longitude));
    if (d < bestD) { bestD = d; best = v.city; }
  }
  return best;
}

/**
 * Best default city before the browser asks for precise location:
 * Vercel IP geo → the user's home city → the busiest hub.
 */
export async function defaultUpcomingCity(homeCity: string | null, cities: string[]): Promise<string> {
  const h = await headers();
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lon = Number(h.get("x-vercel-ip-longitude"));
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    const near = await nearestUpcomingCity(lat, lon);
    if (near) return near;
  }
  if (homeCity && cities.includes(homeCity)) return homeCity;
  return (await busiestUpcomingCity()) ?? cities[0] ?? "London";
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
      event: { select: { type: true, name: true, venue: { select: { name: true, city: true } } } },
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
    festival: p.event.type === "festival" ? p.event.name : null,
    goingCount: p._count.plans,
  }));
}
