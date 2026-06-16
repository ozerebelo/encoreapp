import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toNumber, formatDate } from "@/lib/format";
import { ArtistImage } from "@/components/ArtistImage";
import { Stars } from "@/components/Stars";

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      performances: {
        orderBy: { performanceDate: "desc" },
        include: {
          event: { select: { name: true, type: true, slug: true, venue: { select: { name: true, city: true } } } },
          logs: { select: { rating: true } },
        },
      },
    },
  });
  if (!artist) notFound();

  const allRatings = artist.performances.flatMap((p) =>
    p.logs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null)
  );
  const avg = allRatings.length ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : null;
  const totalLogs = artist.performances.reduce((n, p) => n + p.logs.length, 0);

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
              <span className="pill">{artist.performances.length} catalogued show{artist.performances.length !== 1 ? "s" : ""}</span>
              <span className="pill">{totalLogs} log{totalLogs !== 1 ? "s" : ""}</span>
              {avg && <span className="pill" style={{ color: "var(--star)" }}>★ {avg} avg</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="label">Performances</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {artist.performances.map((p) => {
          const rs = p.logs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null);
          const a = rs.length ? (rs.reduce((x, y) => x + y, 0) / rs.length) : null;
          return (
            <Link key={p.id} href={`/show/${p.id}`} className="card spread" style={{ alignItems: "center" }}>
              <div>
                <strong>{p.event.venue?.name ?? p.event.name}</strong>
                {p.event.venue?.city && <span className="muted"> · {p.event.venue.city}</span>}
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <span className="faint" style={{ fontSize: 13 }}>{formatDate(p.performanceDate)}</span>
                  {p.event.type === "festival" && <span className="pill">🎪 {p.event.name}</span>}
                  <span className="pill">{p.logs.length} log{p.logs.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              {a != null ? <Stars rating={Math.round(a * 2) / 2} /> : <span className="faint">—</span>}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
