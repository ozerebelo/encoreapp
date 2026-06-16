/**
 * Import UPCOMING concerts + festivals from Ticketmaster for catalogued artists.
 *
 *   TICKETMASTER_API_KEY=xxx npx tsx scripts/import-upcoming.ts
 *
 * Festivals (detected via TM classification/name) become shared type='festival'
 * events so multiple artists form one lineup. Skips dates already covered by a
 * setlist.fm entry for the same artist (avoids cross-source duplicates).
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { fetchUpcomingByArtist, hasTicketmasterKey, festivalKey } from "../src/lib/ticketmaster";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

async function venueFor(v: { name: string; city: string; countryCode: string; lat: number | null; long: number | null }) {
  const slug = slugify(v.name);
  const found = await prisma.venue.findUnique({
    where: { slug_city_countryCode: { slug, city: v.city, countryCode: v.countryCode } },
  });
  if (found) return found;
  return prisma.venue.create({
    data: {
      name: v.name, slug, city: v.city, countryCode: v.countryCode,
      latitude: v.lat != null ? new Prisma.Decimal(v.lat) : null,
      longitude: v.long != null ? new Prisma.Decimal(v.long) : null,
    },
  });
}

async function main() {
  if (!hasTicketmasterKey()) {
    console.error("✗ TICKETMASTER_API_KEY is not set.");
    process.exit(1);
  }
  const artists = await prisma.artist.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  console.log(`Checking Ticketmaster for upcoming dates (${artists.length} artists)...`);

  let concerts = 0, festivalSets = 0, skipped = 0;
  for (const artist of artists) {
    const events = await fetchUpcomingByArtist(artist.name).catch((e) => {
      console.error(`  ! ${artist.name}: ${e.message}`);
      return [];
    });
    for (const ev of events) {
      const date = new Date(ev.date);

      // Skip if setlist.fm already has this artist on this date (cross-source dupe).
      const sfmDupe = await prisma.performance.findFirst({
        where: { artistId: artist.id, performanceDate: date, setlistfmId: { not: null } },
        select: { id: true },
      });
      if (sfmDupe) { skipped++; continue; }

      const venue = await venueFor(ev.venue);

      if (ev.isFestival && ev.festivalName) {
        // One shared festival event per (base name, city, year); artists become its lineup.
        const year = ev.date.slice(0, 4);
        const slug = slugify(festivalKey(ev.festivalName, ev.venue.city, year));
        const event = await prisma.event.upsert({
          where: { slug },
          create: { type: "festival", name: ev.festivalName, slug, venueId: venue.id, startDate: date },
          update: {},
        });
        const dup = await prisma.performance.findFirst({ where: { artistId: artist.id, eventId: event.id }, select: { id: true } });
        if (dup) continue;
        await prisma.performance.create({ data: { eventId: event.id, artistId: artist.id, performanceDate: date } });
        festivalSets++;
      } else {
        const dup = await prisma.performance.findFirst({
          where: { artistId: artist.id, performanceDate: date, event: { venueId: venue.id } },
          select: { id: true },
        });
        if (dup) continue;
        const event = await prisma.event.create({
          data: {
            type: "concert",
            name: `${artist.name} at ${venue.name}`,
            slug: slugify(`${artist.name}-${venue.name}-${ev.date}-${ev.ticketmasterId.slice(0, 6)}`),
            venueId: venue.id, startDate: date,
          },
        });
        await prisma.performance.create({ data: { eventId: event.id, artistId: artist.id, performanceDate: date, isHeadliner: true } });
        concerts++;
      }
    }
    if (events.length) console.log(`  ✓ ${artist.name}: ${events.length} upcoming`);
  }
  console.log(`\nDone. ${concerts} concerts, ${festivalSets} festival sets, ${skipped} skipped (setlist.fm dupes).`);
  const fests = await prisma.event.count({ where: { type: "festival" } });
  console.log(`Festival events now: ${fests}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
