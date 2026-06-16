/**
 * Import the real past catalogue from setlist.fm into the database.
 *
 *   SETLISTFM_API_KEY=xxx npx tsx scripts/import-setlistfm.ts "Mitski" "The 1975" ...
 *
 * Idempotent per performance (keyed on setlistfm id). Artist photos are
 * back-filled from Deezer. Best run against a fresh DB (npm run db:reset first)
 * so it doesn't sit alongside the demo seed.
 *
 * Get a free key: https://api.setlist.fm/docs/1.0/index.html
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { importArtistShows, hasSetlistFmKey } from "../src/lib/setlistfm";
import { fetchArtistImages } from "../src/lib/deezer";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

const DEFAULT_ARTISTS = [
  "Phoebe Bridgers", "Mitski", "The 1975", "Fontaines D.C.", "Arctic Monkeys",
];

async function main() {
  if (!hasSetlistFmKey()) {
    console.error("✗ SETLISTFM_API_KEY is not set. Add it to .env or pass it inline.");
    process.exit(1);
  }
  const names = process.argv.slice(2);
  const artists = names.length ? names : DEFAULT_ARTISTS;
  console.log(`Importing ${artists.length} artist(s) from setlist.fm...`);

  let created = 0;
  let skipped = 0;

  for (const name of artists) {
    const shows = await importArtistShows(name, 2).catch((e) => {
      console.error(`  ! ${name}: ${e.message}`);
      return [];
    });
    if (shows.length === 0) {
      console.log(`  – ${name}: no shows`);
      continue;
    }

    // Artist (keyed on MusicBrainz id), enriched with a Deezer photo.
    const mbid = shows[0].artist.mbid;
    const img = await fetchArtistImages(name);
    const artist = await prisma.artist.upsert({
      where: { setlistfmMbid: mbid },
      create: { name, slug: slugify(name), setlistfmMbid: mbid, imageUrl: img?.imageUrl ?? null },
      update: { imageUrl: img?.imageUrl ?? undefined },
    });

    for (const show of shows) {
      const exists = await prisma.performance.findUnique({ where: { setlistfmId: show.setlistfmId } });
      if (exists) { skipped++; continue; }

      const venue = await prisma.venue.upsert({
        where: { setlistfmId: show.venue.setlistfmId },
        create: {
          name: show.venue.name,
          slug: slugify(show.venue.name),
          city: show.venue.city,
          countryCode: show.venue.countryCode,
          latitude: show.venue.lat != null ? new Prisma.Decimal(show.venue.lat) : null,
          longitude: show.venue.long != null ? new Prisma.Decimal(show.venue.long) : null,
          setlistfmId: show.venue.setlistfmId,
        },
        update: {},
      });

      const event = await prisma.event.create({
        data: {
          type: "concert",
          name: `${artist.name} at ${venue.name}`,
          slug: slugify(`${artist.name}-${venue.name}-${show.date}-${show.setlistfmId.slice(0, 6)}`),
          venueId: venue.id,
          startDate: new Date(show.date),
        },
      });
      await prisma.performance.create({
        data: {
          eventId: event.id,
          artistId: artist.id,
          performanceDate: new Date(show.date),
          isHeadliner: true,
          setlist: show.setlist as unknown as Prisma.InputJsonValue,
          setlistfmId: show.setlistfmId,
        },
      });
      created++;
    }
    console.log(`  ✓ ${name}: ${shows.length} fetched`);
  }

  console.log(`\nDone. ${created} performances imported, ${skipped} already present.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
