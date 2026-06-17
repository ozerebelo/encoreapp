/**
 * Historical backlog import from setlist.fm — the deep past catalogue that makes
 * this Letterboxd-for-gigs (log a show from 2015). Pulls setlists by country+year
 * (covers every city, e.g. Lisbon/Porto), auto-discovering artists and venues.
 *
 *   SETLISTFM_API_KEY=xxx npx tsx scripts/import-history.ts [pagesPerSegment] [startYear]
 *
 * Throttled + 429-resilient. Builds the graph in memory and bulk-inserts.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { searchSetlists, hasSetlistFmKey, type ImportedShow } from "../src/lib/setlistfm";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();
const COUNTRIES = ["PT", "ES", "GB", "IE", "FR", "DE", "NL", "US"];
const PAGES = Number(process.argv[2]) || 6;
const START_YEAR = Number(process.argv[3]) || 2015;
const END_YEAR = new Date().getUTCFullYear();

async function chunkCreate<T>(rows: T[], create: (b: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += 1000) await create(rows.slice(i, i + 1000));
}

async function main() {
  if (!hasSetlistFmKey()) { console.error("✗ SETLISTFM_API_KEY not set."); process.exit(1); }

  const artistBySlug = new Map<string, string>();
  const artistByMbid = new Map<string, string>();
  for (const a of await prisma.artist.findMany({ select: { id: true, slug: true, setlistfmMbid: true } })) {
    artistBySlug.set(a.slug, a.id);
    if (a.setlistfmMbid) artistByMbid.set(a.setlistfmMbid, a.id);
  }
  const venueByKey = new Map<string, string>();
  for (const v of await prisma.venue.findMany({ select: { id: true, slug: true, city: true, countryCode: true } }))
    venueByKey.set(`${v.slug}|${v.city}|${v.countryCode}`, v.id);
  const eventBySlug = new Map<string, string>();
  for (const e of await prisma.event.findMany({ select: { id: true, slug: true } })) eventBySlug.set(e.slug, e.id);
  const existingSetlistIds = new Set<string>(
    (await prisma.performance.findMany({ where: { setlistfmId: { not: null } }, select: { setlistfmId: true } }))
      .map((p) => p.setlistfmId!) );

  const newArtists: { id: string; name: string; slug: string; setlistfmMbid: string | null }[] = [];
  const newVenues: { id: string; name: string; slug: string; city: string; countryCode: string; latitude: number | null; longitude: number | null }[] = [];
  const newEvents: { id: string; type: "concert"; name: string; slug: string; venueId: string; startDate: Date }[] = [];
  const newPerfs: { id: string; eventId: string; artistId: string; performanceDate: Date; setlist: Prisma.InputJsonValue; setlistfmId: string }[] = [];
  const perfSeen = new Set<string>();

  function artistId(name: string, mbid: string): string {
    if (mbid && artistByMbid.has(mbid)) return artistByMbid.get(mbid)!;
    const slug = slugify(name) || slugify(`${name}-x`);
    if (artistBySlug.has(slug)) { const id = artistBySlug.get(slug)!; if (mbid) artistByMbid.set(mbid, id); return id; }
    const id = randomUUID();
    artistBySlug.set(slug, id); if (mbid) artistByMbid.set(mbid, id);
    newArtists.push({ id, name, slug, setlistfmMbid: mbid || null });
    return id;
  }
  function venueId(v: ImportedShow["venue"]): string {
    const slug = slugify(v.name);
    const key = `${slug}|${v.city}|${v.countryCode}`;
    if (venueByKey.has(key)) return venueByKey.get(key)!;
    const id = randomUUID(); venueByKey.set(key, id);
    newVenues.push({ id, name: v.name, slug, city: v.city, countryCode: v.countryCode, latitude: v.lat, longitude: v.long });
    return id;
  }

  let imported = 0;
  for (const cc of COUNTRIES) {
    for (let year = END_YEAR; year >= START_YEAR; year--) {
      for (let page = 1; page <= PAGES; page++) {
        let res;
        try { res = await searchSetlists(`countryCode=${cc}&year=${year}`, page); }
        catch (e) { console.error(`  ! ${cc} ${year} p${page}: ${(e as Error).message}`); break; }
        if (res.shows.length === 0) break;
        for (const s of res.shows) {
          if (existingSetlistIds.has(s.setlistfmId)) continue;
          const aId = artistId(s.artist.name, s.artist.mbid);
          const vId = venueId(s.venue);
          const date = new Date(s.date);
          const slug = slugify(`${s.artist.name}-${s.venue.name}-${s.date}`);
          let eId = eventBySlug.get(slug);
          if (!eId) { eId = randomUUID(); eventBySlug.set(slug, eId); newEvents.push({ id: eId, type: "concert", name: `${s.artist.name} at ${s.venue.name}`, slug, venueId: vId, startDate: date }); }
          const k = `${aId}|${eId}`;
          if (perfSeen.has(k)) continue;
          perfSeen.add(k);
          existingSetlistIds.add(s.setlistfmId);
          newPerfs.push({ id: randomUUID(), eventId: eId, artistId: aId, performanceDate: date, setlist: s.setlist as unknown as Prisma.InputJsonValue, setlistfmId: s.setlistfmId });
        }
        imported = newPerfs.length;
        if (page * res.itemsPerPage >= res.total) break;
      }
    }
    console.log(`  ${cc}: perfs+=${imported} artists+=${newArtists.length}`);
  }

  console.log(`\nInserting ${newArtists.length} artists, ${newVenues.length} venues, ${newEvents.length} events, ${newPerfs.length} performances...`);
  await chunkCreate(newVenues, (b) => prisma.venue.createMany({ data: b, skipDuplicates: true }));
  await chunkCreate(newArtists, (b) => prisma.artist.createMany({ data: b, skipDuplicates: true }));
  await chunkCreate(newEvents, (b) => prisma.event.createMany({ data: b, skipDuplicates: true }));
  await chunkCreate(newPerfs, (b) => prisma.performance.createMany({ data: b, skipDuplicates: true }));

  const [a, v, e, p] = await Promise.all([prisma.artist.count(), prisma.venue.count(), prisma.event.count(), prisma.performance.count()]);
  console.log(`\nDone. Catalogue: ${a} artists, ${v} venues, ${e} events, ${p} performances.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
