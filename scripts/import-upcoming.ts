/**
 * Import UPCOMING concerts from Bandsintown for artists already in the catalogue.
 *
 *   BANDSINTOWN_APP_ID=xxx npx tsx scripts/import-upcoming.ts
 *
 * Only imports for artists we already have (so the catalogue stays coherent).
 * Idempotent-ish: skips an artist/date/venue combination that already exists.
 */
import { PrismaClient } from "@prisma/client";
import { fetchUpcoming, hasBandsintownKey } from "../src/lib/bandsintown";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  if (!hasBandsintownKey()) {
    console.error("✗ BANDSINTOWN_APP_ID is not set. Add it to .env or pass it inline.");
    process.exit(1);
  }
  const artists = await prisma.artist.findMany({ select: { id: true, name: true } });
  console.log(`Checking upcoming dates for ${artists.length} catalogued artists...`);

  let created = 0;
  for (const artist of artists) {
    const events = await fetchUpcoming(artist.name).catch((e) => {
      console.error(`  ! ${artist.name}: ${e.message}`);
      return [];
    });
    for (const ev of events) {
      const venue = await prisma.venue.upsert({
        where: { slug_city_countryCode: { slug: slugify(ev.venue.name), city: ev.venue.city, countryCode: ev.venue.countryCode } },
        create: { name: ev.venue.name, slug: slugify(ev.venue.name), city: ev.venue.city, countryCode: ev.venue.countryCode },
        update: {},
      });

      const dup = await prisma.performance.findFirst({
        where: { artistId: artist.id, performanceDate: new Date(ev.date), event: { venueId: venue.id } },
        select: { id: true },
      });
      if (dup) continue;

      const event = await prisma.event.create({
        data: {
          type: "concert",
          name: `${artist.name} at ${venue.name}`,
          slug: slugify(`${artist.name}-${venue.name}-${ev.date}-${ev.bandsintownId.slice(0, 6)}`),
          venueId: venue.id,
          startDate: new Date(ev.date),
        },
      });
      await prisma.performance.create({
        data: { eventId: event.id, artistId: artist.id, performanceDate: new Date(ev.date), isHeadliner: true },
      });
      created++;
    }
  }
  console.log(`\nDone. ${created} upcoming shows imported.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
