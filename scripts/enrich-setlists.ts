/**
 * Fill missing setlists on PAST performances by matching them to setlist.fm
 * (artist name + exact date). Most past shows came from Ticketmaster, which
 * carries no setlist, so they render empty; this backfills the songs wherever
 * setlist.fm has them.
 *
 *   SETLISTFM_API_KEY=xxx DATABASE_URL=<direct> npx tsx scripts/enrich-setlists.ts [limit]
 *
 * Idempotent + resumable (only targets empty-setlist past shows), throttled by
 * the setlist.fm client, and resilient to transient rate-limit/connection drops.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { searchSetlists, hasSetlistFmKey } from "../src/lib/setlistfm";

const prisma = new PrismaClient();
const LIMIT = Number(process.argv[2]) || 500;

function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

async function main() {
  if (!hasSetlistFmKey()) {
    console.error("✗ SETLISTFM_API_KEY not set.");
    process.exit(1);
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Past shows with no setlist, most-recent first (likeliest to be on setlist.fm).
  const rows = await prisma.$queryRawUnsafe<{ id: string; date: Date; artist: string; city: string | null }[]>(
    `SELECT p.id, p.performance_date AS date, a.name AS artist, v.city AS city
     FROM performance p
     JOIN artist a ON a.id = p.artist_id
     JOIN event e ON e.id = p.event_id
     LEFT JOIN venue v ON v.id = e.venue_id
     WHERE p.performance_date < $1
       AND (p.setlist IS NULL OR jsonb_typeof(p.setlist) <> 'array' OR jsonb_array_length(p.setlist) = 0)
     ORDER BY p.performance_date DESC
     LIMIT $2`,
    today,
    LIMIT
  );
  console.log(`Candidates (empty-setlist past shows): ${rows.length}`);

  let filled = 0, miss = 0, err = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const { shows } = await searchSetlists(
        `artistName=${encodeURIComponent(r.artist)}&date=${ddmmyyyy(new Date(r.date))}`,
        1
      );
      // A real setlist = at least one named song. Prefer a same-city match.
      const named = shows.filter((s) => s.setlist.some((e) => e.song && e.song.trim() !== ""));
      const pick =
        (r.city && named.find((s) => s.venue.city.toLowerCase() === r.city!.toLowerCase())) || named[0];
      if (!pick) {
        miss++;
      } else {
        await prisma.performance.update({
          where: { id: r.id },
          data: { setlist: pick.setlist as unknown as Prisma.InputJsonValue },
        });
        filled++;
      }
    } catch {
      err++;
      await new Promise((res) => setTimeout(res, 1500)); // back off on rate-limit / drop
    }
    if (i % 50 === 0) process.stdout.write(`\r  ${i}/${rows.length} (filled ${filled}, miss ${miss}, err ${err})`);
  }
  console.log(`\nDone. Filled ${filled} setlists, ${miss} no-match, ${err} errors.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
