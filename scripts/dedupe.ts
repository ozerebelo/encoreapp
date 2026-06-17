/**
 * Remove duplicate performances — the same artist at the same venue on the same
 * date (Ticketmaster lists one show under several ticket-type event ids).
 *
 *   DATABASE_URL=<direct> npx tsx scripts/dedupe.ts          # dry run
 *   DATABASE_URL=<direct> npx tsx scripts/dedupe.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  // Keep the lowest id per (artist, venue, date); the rest are duplicates.
  const dupIds = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM (
       SELECT pf.id,
              row_number() OVER (PARTITION BY pf.artist_id, e.venue_id, pf.performance_date
                                 ORDER BY (pf.setlistfm_id IS NOT NULL) DESC, pf.id) AS rn
       FROM performance pf JOIN event e ON e.id = pf.event_id
       WHERE e.venue_id IS NOT NULL
     ) t WHERE rn > 1`
  );
  console.log(`Duplicate performances: ${dupIds.length}`);

  if (!APPLY) { console.log("Dry run. Re-run with --apply."); return; }

  const ids = dupIds.map((d) => d.id);
  for (let i = 0; i < ids.length; i += 1000) {
    await prisma.performance.deleteMany({ where: { id: { in: ids.slice(i, i + 1000) } } });
  }
  const events = await prisma.event.deleteMany({ where: { performances: { none: {} } } });
  console.log(`Removed ${ids.length} duplicate performances, ${events.count} orphan events.`);
  const [perfs, evs] = await Promise.all([prisma.performance.count(), prisma.event.count()]);
  console.log(`Now: ${perfs} performances, ${evs} events.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
