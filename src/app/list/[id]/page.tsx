import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toNumber, formatDate } from "@/lib/format";
import { ArtistImage } from "@/components/ArtistImage";
import { Stars } from "@/components/Stars";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      user: { select: { handle: true, displayName: true } },
      items: {
        orderBy: { position: "asc" },
        include: {
          performance: {
            include: {
              artist: true,
              event: { select: { name: true, type: true, venue: { select: { name: true, city: true } } } },
              logs: { select: { rating: true } },
            },
          },
        },
      },
    },
  });
  if (!list) notFound();

  return (
    <main className="container container-narrow">
      <div style={{ marginTop: 26 }}>
        {list.isRanked && <span className="pill">ranked list</span>}
        <h1 style={{ fontSize: 32, margin: "10px 0 6px" }}>{list.title}</h1>
        <div className="muted">
          by <Link href={`/u/${list.user.handle}`} style={{ color: "var(--accent)" }}>{list.user.displayName}</Link>
          {" · "}{list.items.length} shows
        </div>
        {list.description && <p className="muted" style={{ marginTop: 10 }}>{list.description}</p>}
      </div>

      <div className="label">Shows</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.items.map((it, idx) => {
          const p = it.performance;
          const rs = p.logs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null);
          const a = rs.length ? Math.round((rs.reduce((x, y) => x + y, 0) / rs.length) * 2) / 2 : null;
          return (
            <Link key={it.performanceId} href={`/show/${p.id}`} className="card row" style={{ gap: 14, alignItems: "center" }}>
              {list.isRanked && <span className="stat-num" style={{ width: 32, color: "var(--text-faint)" }}>{idx + 1}</span>}
              <div style={{ width: 56, height: 56, borderRadius: 9, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                <ArtistImage name={p.artist.name} src={p.artist.imageUrl} />
              </div>
              <div style={{ flex: 1 }}>
                <strong>{p.artist.name}</strong>
                <div className="faint" style={{ fontSize: 13 }}>
                  {p.event.venue?.name ?? p.event.name} · {formatDate(p.performanceDate)}
                </div>
                {it.note && <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>{it.note}</p>}
              </div>
              {a != null && <Stars rating={a} />}
            </Link>
          );
        })}
        {list.items.length === 0 && <p className="muted">This list is empty.</p>}
      </div>
    </main>
  );
}
