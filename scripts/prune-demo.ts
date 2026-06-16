/**
 * Remove the demo/seed data, keeping only the real imported catalogue.
 *
 *   DATABASE_URL=<direct> npx tsx scripts/prune-demo.ts          # dry run
 *   DATABASE_URL=<direct> npx tsx scripts/prune-demo.ts --apply  # execute
 *
 * Seeded events are identifiable because their slug ends in a full date
 * (YYYY-MM-DD), whereas imported events end in a source id hash; plus the one
 * seeded festival. Demo users are deleted by handle (cascades their social data).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const DEMO_HANDLES = ["ava", "leo", "noor", "kit"];
// Seeded event = a festival, or a slug ending in a literal date.
const SEEDED_EVENT = `type = 'festival' OR slug ~ '[0-9]{4}-[0-9]{2}-[0-9]{2}$'`;

async function n(sql: string): Promise<number> {
  const r = await prisma.$queryRawUnsafe<{ n: number }[]>(sql);
  return r[0].n;
}

const TODAY = `date_trunc('day', now())`;
// The 12 seeded upcoming events, verified by dry-run (a real TM Strokes/Summerfest
// show also ends in a date, so we match these exact slugs, not a regex).
const SEEDED_FUTURE_SLUGS = [
  "big-thief-brooklyn-steel-2026-10-19",
  "caroline-polachek-alexandra-palace-2026-09-21",
  "charli-xcx-razzmatazz-2026-08-30",
  "florence-the-machine-olympia-2026-10-10",
  "fontaines-d-c-razzmatazz-2026-07-18",
  "lana-del-rey-coliseu-dos-recreios-2026-11-01",
  "mitski-brixton-academy-2026-07-09",
  "phoebe-bridgers-brooklyn-steel-2026-08-12",
  "slowdive-roundhouse-2026-11-14",
  "tame-impala-coliseu-dos-recreios-2026-09-05",
  "the-1975-roundhouse-2026-10-02",
  "the-strokes-paradiso-2026-07-25",
];

async function main() {
  const demoUsers = await prisma.user.count({ where: { handle: { in: DEMO_HANDLES } } });
  // Unambiguous: a past show with no setlist id is seeded (real past=setlist.fm has id; real TM is future).
  const seededPast = await n(`SELECT count(*)::int AS n FROM performance WHERE setlistfm_id IS NULL AND performance_date < ${TODAY}`);
  const seededFuture = await prisma.performance.count({
    where: { setlistfmId: null, performanceDate: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) }, event: { slug: { in: SEEDED_FUTURE_SLUGS } } },
  });
  const futureNull = await prisma.performance.count({ where: { setlistfmId: null, performanceDate: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } } });
  const realSetlist = await prisma.performance.count({ where: { setlistfmId: { not: null } } });
  const festivals = await prisma.event.count({ where: { type: "festival" } });

  console.log("Demo users to delete:          ", demoUsers, `(${DEMO_HANDLES.join(", ")})`);
  console.log("Seeded PAST perfs (null id):   ", seededPast);
  console.log("Seeded FUTURE perfs (12 slugs):", seededFuture, "(must be 12)");
  console.log("— keep: real setlist.fm shows: ", realSetlist);
  console.log("— keep: real Ticketmaster shows:", futureNull - seededFuture);
  console.log("Festival events (seeded):      ", festivals);
  console.log("Total seeded perfs to remove:  ", seededPast + seededFuture);

  if (seededFuture !== SEEDED_FUTURE_SLUGS.length) {
    console.error(`\n✗ Aborting: expected ${SEEDED_FUTURE_SLUGS.length} future seeded perfs, found ${seededFuture}.`);
    process.exit(1);
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to execute.");
    return;
  }

  console.log("\nApplying…");
  await prisma.user.deleteMany({ where: { handle: { in: DEMO_HANDLES } } });
  // Remove seeded performances: all past null-id shows, and the 12 known future ones.
  await prisma.$executeRawUnsafe(`DELETE FROM performance WHERE setlistfm_id IS NULL AND performance_date < ${TODAY}`);
  await prisma.performance.deleteMany({ where: { setlistfmId: null, event: { slug: { in: SEEDED_FUTURE_SLUGS } } } });
  // Remove now-empty events (every real imported event still has its performance)
  const events = await prisma.$executeRawUnsafe(`DELETE FROM event e WHERE NOT EXISTS (SELECT 1 FROM performance p WHERE p.event_id=e.id)`);
  const venuesDel = await prisma.$executeRawUnsafe(`DELETE FROM venue WHERE id NOT IN (SELECT venue_id FROM event WHERE venue_id IS NOT NULL)`);

  console.log(`Removed ${events} orphan events, ${venuesDel} orphan venues.`);
  const [users, artists, venues, perfs, fests] = await Promise.all([
    prisma.user.count(), prisma.artist.count(), prisma.venue.count(), prisma.performance.count(), prisma.event.count({ where: { type: "festival" } }),
  ]);
  console.log(`Now: users=${users}, artists=${artists}, venues=${venues}, performances=${perfs}, festivals=${fests}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
