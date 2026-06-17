/**
 * Conservative festival pass over PAST shows (setlist.fm has no festival flag).
 * Only high-confidence signals, to avoid mislabeling normal gigs:
 *   A. venue name literally contains "Festival".
 *   B. 2+ distinct artists at the same venue on the same date (a real lineup).
 *
 *   DATABASE_URL=<direct> npx tsx scripts/festival-pass.ts          # dry run
 *   DATABASE_URL=<direct> npx tsx scripts/festival-pass.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const TODAY = (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();

async function main() {
  // Rule A: past concert events whose venue is literally a "…Festival".
  const ruleA = await prisma.event.findMany({
    where: { type: "concert", startDate: { lt: TODAY }, venue: { name: { contains: "Festival", mode: "insensitive" } } },
    select: { id: true, name: true, venue: { select: { name: true } } },
  });

  // Rule B: (venue, date) in the past hosting 2+ distinct artists.
  const groups = await prisma.$queryRawUnsafe<{ venue_id: string; d: Date; artists: bigint }[]>(
    `SELECT e.venue_id, pf.performance_date::date AS d, count(DISTINCT pf.artist_id) AS artists
     FROM performance pf JOIN event e ON e.id = pf.event_id
     WHERE pf.performance_date < $1 AND e.type = 'concert' AND e.venue_id IS NOT NULL
     GROUP BY e.venue_id, pf.performance_date::date HAVING count(DISTINCT pf.artist_id) >= 2`,
    TODAY
  );

  console.log(`Rule A (venue named "Festival"): ${ruleA.length} events`);
  ruleA.slice(0, 10).forEach((e) => console.log("   ", e.venue?.name));
  console.log(`Rule B (2+ artists same venue+date): ${groups.length} festival days`);

  if (!APPLY) { console.log("\nDry run. Re-run with --apply."); return; }

  // Apply Rule A: retype + name after the festival (the venue).
  for (const e of ruleA) {
    await prisma.event.update({ where: { id: e.id }, data: { type: "festival", name: e.venue?.name ?? e.name } });
  }

  // Apply Rule B: make one festival event per (venue, date) and move performances under it.
  let madeB = 0;
  for (const g of groups) {
    const venue = await prisma.venue.findUnique({ where: { id: g.venue_id }, select: { name: true, city: true } });
    if (!venue) continue;
    const day = g.d.toISOString().slice(0, 10);
    const slug = slugify(`${venue.name}-${venue.city}-${day}-fest`);
    const fest = await prisma.event.upsert({
      where: { slug },
      create: { type: "festival", name: venue.name, slug, venueId: g.venue_id, startDate: g.d },
      update: { type: "festival" },
    });
    const perfs = await prisma.performance.findMany({
      where: { performanceDate: g.d, event: { venueId: g.venue_id, type: "concert" } },
      select: { id: true, eventId: true },
    });
    for (const pf of perfs) await prisma.performance.update({ where: { id: pf.id }, data: { eventId: fest.id, isHeadliner: false } });
    // delete the now-empty concert events
    await prisma.event.deleteMany({ where: { id: { in: [...new Set(perfs.map((p) => p.eventId))] }, performances: { none: {} } } });
    madeB++;
  }

  console.log(`\nApplied. Rule A retyped ${ruleA.length} events; Rule B formed ${madeB} festival days.`);
  const fests = await prisma.event.count({ where: { type: "festival" } });
  console.log(`Festival events now: ${fests}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
