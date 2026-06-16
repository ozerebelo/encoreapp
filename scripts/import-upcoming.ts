/**
 * Import UPCOMING concerts from Ticketmaster for artists already in the catalogue.
 *
 *   TICKETMASTER_API_KEY=xxx npx tsx scripts/import-upcoming.ts
 *
 * Only imports for artists we already have (keeps the catalogue coherent).
 * Idempotent: skips an artist/date/venue combination that already exists.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { fetchUpcomingByArtist, hasTicketmasterKey } from "../src/lib/ticketmaster";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  if (!hasTicketmasterKey()) {
    console.error("✗ TICKETMASTER_API_KEY is not set. Add it to .env or pass it inline.");
    process.exit(1);
  }
  const artists = await prisma.artist.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  console.log(`Checking Ticketmaster for upcoming dates (${artists.length} artists)...`);

  let created = 0;
  for (const artist of artists) {
    const events = await fetchUpcomingByArtist(artist.name).catch((e) => {
      console.error(`  ! ${artist.name}: ${e.message}`);
      return [];
    });
    for (const ev of events) {
      // Reuse a venue by (slug, city, country); else create.
      const vSlug = slugify(ev.venue.name);
      let venue = await prisma.venue.findUnique({
        where: { slug_city_countryCode: { slug: vSlug, city: ev.venue.city, countryCode: ev.venue.countryCode } },
      });
      if (!venue) {
        venue = await prisma.venue.create({
          data: {
            name: ev.venue.name, slug: vSlug, city: ev.venue.city, countryCode: ev.venue.countryCode,
            latitude: ev.venue.lat != null ? new Prisma.Decimal(ev.venue.lat) : null,
            longitude: ev.venue.long != null ? new Prisma.Decimal(ev.venue.long) : null,
          },
        });
      }

      const dup = await prisma.performance.findFirst({
        where: { artistId: artist.id, performanceDate: new Date(ev.date), event: { venueId: venue.id } },
        select: { id: true },
      });
      if (dup) continue;

      const event = await prisma.event.create({
        data: {
          type: "concert",
          name: `${artist.name} at ${venue.name}`,
          slug: slugify(`${artist.name}-${venue.name}-${ev.date}-${ev.ticketmasterId.slice(0, 6)}`),
          venueId: venue.id,
          startDate: new Date(ev.date),
        },
      });
      await prisma.performance.create({
        data: { eventId: event.id, artistId: artist.id, performanceDate: new Date(ev.date), isHeadliner: true },
      });
      created++;
    }
    if (events.length) console.log(`  ✓ ${artist.name}: ${events.length} upcoming`);
  }
  console.log(`\nDone. ${created} upcoming shows imported.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
