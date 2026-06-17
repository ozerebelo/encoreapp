/**
 * Backfill artist photos from Deezer for artists missing an image.
 * Prioritizes artists with the most upcoming shows (most likely to be seen).
 *
 *   DATABASE_URL=<direct> npx tsx scripts/backfill-images.ts [limit]
 */
import { PrismaClient } from "@prisma/client";
import { fetchArtistImages } from "../src/lib/deezer";

const prisma = new PrismaClient();
const LIMIT = Number(process.argv[2]) || 1500;

async function main() {
  // Artists with no image, ordered by total number of shows (most likely seen).
  const rows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT a.id, a.name
     FROM artist a
     LEFT JOIN performance p ON p.artist_id = a.id
     WHERE a.image_url IS NULL
     GROUP BY a.id, a.name
     ORDER BY count(p.id) DESC
     LIMIT $1`,
    LIMIT
  );
  console.log(`Backfilling images for up to ${rows.length} artists...`);

  let found = 0;
  for (let i = 0; i < rows.length; i++) {
    const img = await fetchArtistImages(rows[i].name);
    if (img?.imageUrl) {
      await prisma.artist.update({ where: { id: rows[i].id }, data: { imageUrl: img.imageUrl } });
      found++;
    }
    if (i % 100 === 0) process.stdout.write(`\r  ${i}/${rows.length} (${found} found)`);
    await new Promise((r) => setTimeout(r, 120)); // be nice to Deezer
  }
  console.log(`\nDone. ${found} images set.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
