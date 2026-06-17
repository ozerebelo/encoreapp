import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toNumber, formatDate, untilLabel } from "@/lib/format";
import { ArtistImage } from "@/components/ArtistImage";
import { Stars } from "@/components/Stars";

const UPCOMING_TAKE = 40;
const PAST_TAKE = 60;

const perfInclude = {
  event: { select: { name: true, type: true, slug: true, venue: { select: { name: true, city: true } } } },
  logs: { select: { rating: true } },
} satisfies Prisma.PerformanceInclude;

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await prisma.artist.findUnique({
    where: { slug },
    select: { id: true, name: true, imageUrl: true },
  });
  if (!artist) notFound();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Bounded, split queries: soonest-first for upcoming, most-recent-first for
  // past. Header stats are aggregated in the DB rather than over loaded rows.
  const [showCount, logAgg, upcoming, past] = await Promise.all([
    prisma.performance.count({ where: { artistId: artist.id } }),
    prisma.log.aggregate({ where: { performance: { artistId: artist.id } }, _avg: { rating: true }, _count: true }),
    prisma.performance.findMany({
      where: { artistId: artist.id, performanceDate: { gte: today } },
      orderBy: { performanceDate: "asc" },
      take: UPCOMING_TAKE,
      include: perfInclude,
    }),
    prisma.performance.findMany({
      where: { artistId: artist.id, performanceDate: { lt: today } },
      orderBy: { performanceDate: "desc" },
      take: PAST_TAKE,
      include: perfInclude,
    }),
  ]);

  const avg = logAgg._avg.rating != null ? toNumber(logAgg._avg.rating)!.toFixed(1) : null;
  const totalLogs = logAgg._count;

  const PerfRow = ({ p, soon }: { p: (typeof past)[number]; soon?: boolean }) => {
    const rs = p.logs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null);
    const a = rs.length ? rs.reduce((x, y) => x + y, 0) / rs.length : null;
    return (
      <Link href={`/show/${p.id}`} className="card spread" style={{ alignItems: "center" }}>
        <div>
          <strong>{p.event.venue?.name ?? p.event.name}</strong>
          {p.event.venue?.city && <span className="muted"> · {p.event.venue.city}</span>}
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            <span className="faint" style={{ fontSize: 13 }}>
              {soon ? untilLabel(p.performanceDate) : formatDate(p.performanceDate)}
            </span>
            {p.event.type === "festival" && <span className="pill">🎪 {p.event.name}</span>}
            <span className="pill">{p.logs.length} log{p.logs.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        {a != null ? <Stars rating={Math.round(a * 2) / 2} /> : <span className="faint">—</span>}
      </Link>
    );
  };

  return (
    <main className="container container-narrow">
      <div className="hero-backdrop">
        {artist.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="bd-img" src={artist.imageUrl} alt="" />
        )}
        <div className="bd-grad" />
        <div className="hero-inner">
          <div className="hero-poster">
            <ArtistImage name={artist.name} src={artist.imageUrl} />
          </div>
          <div style={{ flex: 1 }}>
            <span className="label" style={{ margin: 0, border: "none", padding: 0 }}>Artist</span>
            <h1 style={{ fontSize: 34, margin: "2px 0 8px" }}>{artist.name}</h1>
            <div className="row" style={{ gap: 8 }}>
              <span className="pill">{showCount} catalogued show{showCount !== 1 ? "s" : ""}</span>
              <span className="pill">{totalLogs} log{totalLogs !== 1 ? "s" : ""}</span>
              {avg && <span className="pill" style={{ color: "var(--star)" }}>★ {avg} avg</span>}
            </div>
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <>
          <div className="label">Upcoming</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((p) => <PerfRow key={p.id} p={p} soon />)}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="label">Past shows</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {past.map((p) => <PerfRow key={p.id} p={p} />)}
          </div>
          {past.length === PAST_TAKE && (
            <p className="muted" style={{ marginTop: 12 }}>Showing the {PAST_TAKE} most recent shows.</p>
          )}
        </>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <p className="muted">No catalogued performances yet.</p>
      )}
    </main>
  );
}
