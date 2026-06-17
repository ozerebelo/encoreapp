import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toNumber, yearOf } from "@/lib/format";
import { StubCard, type StubData } from "@/components/StubCard";
import { Poster } from "@/components/Poster";
import { ShareButton } from "@/components/ShareButton";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const user = await prisma.user.findUnique({ where: { handle }, select: { displayName: true } });
  const name = user?.displayName ?? handle;
  return {
    title: `${name}'s year in live music — Encore`,
    description: `${name}'s ticket-stub wall and year in review on Encore.`,
  };
}

export default async function WallPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await prisma.user.findUnique({
    where: { handle },
    include: {
      logs: {
        orderBy: { loggedDate: "desc" }, // loggedDate == show date (set from performanceDate)
        take: 240,
        include: {
          performance: {
            include: {
              artist: { select: { name: true, imageUrl: true } },
              event: { select: { name: true, venue: { select: { name: true, city: true } } } },
            },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const years = [...new Set(user.logs.map((l) => yearOf(l.performance.performanceDate)))].sort((a, b) => b - a);
  const topYear = years[0];
  const yearLogs = user.logs.filter((l) => yearOf(l.performance.performanceDate) === topYear);
  const counts = new Map<string, number>();
  for (const l of yearLogs) counts.set(l.performance.artist.name, (counts.get(l.performance.artist.name) ?? 0) + 1);
  const topArtist = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const venues = new Set(yearLogs.map((l) => l.performance.event.venue?.name).filter(Boolean)).size;
  const ratings = yearLogs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  const favorites = user.logs.filter((l) => l.isFavorite);
  const stubs: StubData[] = user.logs.map((l) => ({
    performanceId: l.performanceId,
    artist: l.performance.artist.name,
    artistImage: l.performance.artist.imageUrl,
    venue: l.performance.event.venue?.name ?? l.performance.event.name ?? "—",
    city: l.performance.event.venue?.city ?? null,
    date: l.performance.performanceDate,
    rating: toNumber(l.rating),
    isFavorite: l.isFavorite,
    stubImageUrl: l.stubImageUrl,
  }));

  return (
    <main className="container">
      <div className="spread" style={{ marginTop: 22 }}>
        <Link href={`/u/${user.handle}`} className="faint" style={{ fontSize: 13 }}>← {user.displayName}&apos;s profile</Link>
        <ShareButton title={`${user.displayName}'s year in live music`} />
      </div>

      <section className="yir" style={{ marginTop: 14, textAlign: "center", padding: "34px 22px" }}>
        <div className="faint" style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 13 }}>Encore · Year in review</div>
        <h1 style={{ fontSize: 40, margin: "10px 0 4px" }}>{user.displayName}&apos;s {topYear} in live music</h1>
        <div className="yir-grid" style={{ maxWidth: 760, margin: "20px auto 0" }}>
          <div className="stat"><div className="stat-num">{yearLogs.length}</div><div className="stat-label">shows</div></div>
          <div className="stat"><div className="stat-num" style={{ fontSize: 18 }}>{topArtist}</div><div className="stat-label">most seen</div></div>
          <div className="stat"><div className="stat-num">{venues}</div><div className="stat-label">venues</div></div>
          <div className="stat"><div className="stat-num">★ {avg}</div><div className="stat-label">avg rating</div></div>
        </div>
      </section>

      {favorites.length > 0 && (
        <>
          <div className="label">The ones that mattered</div>
          <div className="poster-grid">
            {favorites.map((l) => (
              <Poster key={l.id} href={`/show/${l.performanceId}`} name={l.performance.artist.name}
                image={l.performance.artist.imageUrl} caption={l.performance.artist.name}
                subcaption={l.performance.event.venue?.name ?? null} rating={toNumber(l.rating)} favorite />
            ))}
          </div>
        </>
      )}

      <div className="label">The whole wall<span style={{ color: "var(--text-faint)" }}>{user.logs.length} shows</span></div>
      <div className="stub-grid">
        {stubs.map((s, i) => <StubCard key={i} stub={s} />)}
      </div>
    </main>
  );
}
