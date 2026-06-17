/**
 * Bulk catalogue import from Ticketmaster — the scalable replacement for the
 * hardcoded per-artist pulls. Sweeps all upcoming music events across countries,
 * auto-discovering artists, venues, concerts and festival lineups.
 *
 *   TICKETMASTER_API_KEY=xxx npx tsx scripts/import-catalogue.ts [pagesPerCountry]
 *
 * Artists are created without images (run backfill-images.ts after). Builds the
 * graph in memory with client-side UUIDs, then bulk-inserts.
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { fetchMusicEvents, hasTicketmasterKey, festivalKey, type CatalogueEvent } from "../src/lib/ticketmaster";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();
const COUNTRIES = ["GB", "US", "IE", "FR", "DE", "NL", "ES", "PT", "IT", "SE", "BE", "DK"];
const PAGES = Number(process.argv[2]) || 5;

async function chunkCreate<T>(rows: T[], create: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += 1000) await create(rows.slice(i, i + 1000));
}

async function main() {
  if (!hasTicketmasterKey()) { console.error("✗ TICKETMASTER_API_KEY not set."); process.exit(1); }

  // Preload existing artists/venues/events so we resolve ids and never duplicate.
  const artistBySlug = new Map<string, string>();
  for (const a of await prisma.artist.findMany({ select: { id: true, slug: true } })) artistBySlug.set(a.slug, a.id);
  const venueByKey = new Map<string, string>();
  for (const v of await prisma.venue.findMany({ select: { id: true, slug: true, city: true, countryCode: true } }))
    venueByKey.set(`${v.slug}|${v.city}|${v.countryCode}`, v.id);
  const eventBySlug = new Map<string, string>();
  for (const e of await prisma.event.findMany({ select: { id: true, slug: true } })) eventBySlug.set(e.slug, e.id);

  const newArtists: { id: string; name: string; slug: string }[] = [];
  const newVenues: { id: string; name: string; slug: string; city: string; countryCode: string; latitude: number | null; longitude: number | null }[] = [];
  const newEvents: { id: string; type: "concert" | "festival"; name: string; slug: string; venueId: string; startDate: Date }[] = [];
  const newPerfs: { id: string; eventId: string; artistId: string; performanceDate: Date; isHeadliner: boolean }[] = [];
  const perfSeen = new Set<string>();

  function eventId(slug: string, make: () => Omit<(typeof newEvents)[number], "id">): string {
    let id = eventBySlug.get(slug);
    if (!id) { id = randomUUID(); eventBySlug.set(slug, id); newEvents.push({ id, ...make() }); }
    return id;
  }

  function artistId(name: string): string {
    const slug = slugify(name) || slugify(`${name}-x`);
    let id = artistBySlug.get(slug);
    if (!id) { id = randomUUID(); artistBySlug.set(slug, id); newArtists.push({ id, name, slug }); }
    return id;
  }
  function venueId(v: CatalogueEvent["venue"]): string {
    const slug = slugify(v.name);
    const key = `${slug}|${v.city}|${v.countryCode}`;
    let id = venueByKey.get(key);
    if (!id) { id = randomUUID(); venueByKey.set(key, id); newVenues.push({ id, name: v.name, slug, city: v.city, countryCode: v.countryCode, latitude: v.lat, longitude: v.long }); }
    return id;
  }

  let scanned = 0;
  for (const cc of COUNTRIES) {
    for (let page = 0; page < PAGES; page++) {
      let res;
      try { res = await fetchMusicEvents(cc, page, 100); }
      catch (e) { console.error(`  ! ${cc} p${page}: ${(e as Error).message}`); break; }
      if (res.events.length === 0) break;
      for (const ev of res.events) {
        scanned++;
        const date = new Date(ev.date);
        const vId = venueId(ev.venue);
        // Concerts are keyed by headliner+venue+date (NOT TM event id) so the same
        // show listed under multiple ticket types collapses into one event.
        const concertSlug = slugify(`${ev.artistNames[0]}-${ev.venue.name}-${ev.date}`);
        const eId = (ev.isFestival && ev.festivalName)
          ? eventId(slugify(festivalKey(ev.festivalName, ev.venue.city, ev.date.slice(0, 4))),
              () => ({ type: "festival", name: ev.festivalName!, slug: slugify(festivalKey(ev.festivalName!, ev.venue.city, ev.date.slice(0, 4))), venueId: vId, startDate: date }))
          : eventId(concertSlug,
              () => ({ type: "concert", name: ev.name, slug: concertSlug, venueId: vId, startDate: date }));
        ev.artistNames.forEach((name, i) => {
          const aId = artistId(name);
          const k = `${aId}|${eId}`;
          if (perfSeen.has(k)) return;
          perfSeen.add(k);
          newPerfs.push({ id: randomUUID(), eventId: eId, artistId: aId, performanceDate: date, isHeadliner: i === 0 && !ev.isFestival });
        });
      }
      if (page >= res.totalPages - 1) break;
    }
    console.log(`  ${cc}: scanned=${scanned} artists+=${newArtists.length} events+=${newEvents.length}`);
  }

  console.log(`\nInserting: ${newArtists.length} artists, ${newVenues.length} venues, ${newEvents.length} events, ${newPerfs.length} performances...`);
  await chunkCreate(newVenues, (b) => prisma.venue.createMany({ data: b, skipDuplicates: true }));
  await chunkCreate(newArtists, (b) => prisma.artist.createMany({ data: b, skipDuplicates: true }));
  await chunkCreate(newEvents, (b) => prisma.event.createMany({ data: b, skipDuplicates: true }));
  await chunkCreate(newPerfs, (b) => prisma.performance.createMany({ data: b, skipDuplicates: true }));

  const [artists, venues, events, perfs, fests] = await Promise.all([
    prisma.artist.count(), prisma.venue.count(), prisma.event.count(), prisma.performance.count(), prisma.event.count({ where: { type: "festival" } }),
  ]);
  console.log(`\nDone. Catalogue now: ${artists} artists, ${venues} venues, ${events} events (${fests} festivals), ${perfs} performances.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
