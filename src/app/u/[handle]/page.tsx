import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toNumber, yearOf, formatDate, untilLabel } from "@/lib/format";
import { StubCard, type StubData } from "@/components/StubCard";
import { Poster } from "@/components/Poster";
import { ArtistImage } from "@/components/ArtistImage";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { Stars } from "@/components/Stars";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const me = await getCurrentUser();

  const user = await prisma.user.findUnique({
    where: { handle },
    include: {
      _count: { select: { followers: true, following: true, logs: true } },
      lists: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { items: true } } },
      },
      plans: {
        where: { performance: { performanceDate: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } } },
        orderBy: { performance: { performanceDate: "asc" } },
        include: {
          performance: {
            include: {
              artist: { select: { name: true, imageUrl: true } },
              event: { select: { name: true, venue: { select: { name: true } } } },
            },
          },
        },
      },
      logs: {
        orderBy: { loggedDate: "desc" },
        include: {
          performance: {
            include: {
              artist: { select: { name: true, slug: true, imageUrl: true } },
              event: { select: { name: true, venue: { select: { name: true, city: true } } } },
            },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const isMe = me?.id === user.id;
  let isFollowing = false;
  if (me && !isMe) {
    isFollowing = !!(await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: me.id, followeeId: user.id } },
    }));
  }

  const toStub = (log: (typeof user.logs)[number]): StubData => ({
    performanceId: log.performanceId,
    artist: log.performance.artist.name,
    artistImage: log.performance.artist.imageUrl,
    venue: log.performance.event.venue?.name ?? log.performance.event.name ?? "—",
    city: log.performance.event.venue?.city ?? null,
    date: log.loggedDate,
    rating: toNumber(log.rating),
    isFavorite: log.isFavorite,
    stubImageUrl: log.stubImageUrl,
  });

  const favorites = user.logs.filter((l) => l.isFavorite);
  const stubs = user.logs.map(toStub);

  // Year in review (most recent year with shows)
  const years = [...new Set(user.logs.map((l) => yearOf(l.loggedDate)))].sort((a, b) => b - a);
  const topYear = years[0];
  const yearLogs = user.logs.filter((l) => yearOf(l.loggedDate) === topYear);
  const artistCounts = new Map<string, number>();
  for (const l of yearLogs) {
    const n = l.performance.artist.name;
    artistCounts.set(n, (artistCounts.get(n) ?? 0) + 1);
  }
  const topArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const venuesThisYear = new Set(yearLogs.map((l) => l.performance.event.venue?.name).filter(Boolean)).size;
  const ratings = yearLogs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  return (
    <main className="container">
      {/* Header */}
      <header className="card" style={{ marginTop: 24, display: "flex", gap: 18, alignItems: "center" }}>
        <Avatar name={user.displayName} src={user.avatarUrl} size={64} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, marginBottom: 2 }}>{user.displayName}</h1>
          <div className="muted">@{user.handle}{user.homeCity ? ` · ${user.homeCity}` : ""}</div>
          {user.bio && <p className="muted" style={{ marginTop: 6 }}>{user.bio}</p>}
          <div className="row" style={{ marginTop: 8, gap: 16 }}>
            <span className="faint"><strong style={{ color: "var(--text)" }}>{user._count.logs}</strong> shows</span>
            <span className="faint"><strong style={{ color: "var(--text)" }}>{user._count.followers}</strong> followers</span>
            <span className="faint"><strong style={{ color: "var(--text)" }}>{user._count.following}</strong> following</span>
          </div>
        </div>
        {isMe ? (
          <div className="row" style={{ gap: 8 }}>
            <Link href="/settings" className="btn btn-ghost btn-sm">Settings</Link>
            <Link href="/log/new" className="btn btn-primary btn-sm">+ Log a show</Link>
          </div>
        ) : me ? (
          <FollowButton handle={user.handle} initialFollowing={isFollowing} />
        ) : null}
      </header>

      {/* Year in review */}
      {topYear && (
        <section className="yir">
          <div className="spread">
            <h2 style={{ fontSize: 20, margin: 0 }}>✦ {topYear} in review</h2>
            <span className="pill">{user.displayName}</span>
          </div>
          <div className="yir-grid">
            <div className="stat"><div className="stat-num">{yearLogs.length}</div><div className="stat-label">shows this year</div></div>
            <div className="stat"><div className="stat-num" style={{ fontSize: 18 }}>{topArtist}</div><div className="stat-label">most seen</div></div>
            <div className="stat"><div className="stat-num">{venuesThisYear}</div><div className="stat-label">venues</div></div>
            <div className="stat"><div className="stat-num">{avgRating}</div><div className="stat-label">avg rating</div></div>
          </div>
        </section>
      )}

      {/* Upcoming (plans) */}
      {user.plans.length > 0 && (
        <>
          <div className="label">
            Upcoming
            <span style={{ color: "var(--text-faint)" }}>
              {user.plans.filter((p) => p.status === "going").length} going · {user.plans.filter((p) => p.status === "interested").length} interested
            </span>
          </div>
          <div className="poster-grid">
            {user.plans.map((pl) => (
              <Poster
                key={pl.id}
                href={`/show/${pl.performanceId}`}
                name={pl.performance.artist.name}
                image={pl.performance.artist.imageUrl}
                caption={pl.performance.artist.name}
                subcaption={`${pl.performance.event.venue?.name ?? pl.performance.event.name ?? ""} · ${untilLabel(pl.performance.performanceDate)}`}
                badge={pl.status === "going" ? "🎟️" : "☆"}
              />
            ))}
          </div>
        </>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <>
          <div className="label">Favorite shows</div>
          <div className="poster-grid">
            {favorites.map((l) => (
              <Poster
                key={l.id}
                href={`/show/${l.performanceId}`}
                name={l.performance.artist.name}
                image={l.performance.artist.imageUrl}
                caption={l.performance.artist.name}
                subcaption={l.performance.event.venue?.name ?? null}
                rating={toNumber(l.rating)}
                favorite
              />
            ))}
          </div>
        </>
      )}

      {/* Stub wall */}
      <div className="label">
        Stub wall
        {stubs.length > 0 && <Link href={`/u/${user.handle}/wall`}>↗ Share wall</Link>}
      </div>
      {stubs.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No shows logged yet.{" "}
            {isMe && <Link href="/log/new" style={{ color: "var(--accent)" }}>Log your first one →</Link>}
          </p>
        </div>
      ) : (
        <div className="stub-grid">
          {stubs.map((s, i) => <StubCard key={i} stub={s} />)}
        </div>
      )}

      {/* Lists */}
      {user.lists.length > 0 && (
        <>
          <div className="label">Lists</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {user.lists.map((l) => (
              <Link key={l.id} href={`/list/${l.id}`} className="card spread">
                <div>
                  <strong>{l.title}</strong>
                  {l.isRanked && <span className="pill" style={{ marginLeft: 8 }}>ranked</span>}
                </div>
                <span className="faint" style={{ fontSize: 13 }}>{l._count.items} shows</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Recent reviews (was: Notes) — now poster-backed diary cards */}
      {user.logs.some((l) => l.review) && (
        <>
          <div className="label">Recent reviews</div>
          <div className="note-grid">
            {user.logs.filter((l) => l.review).slice(0, 6).map((l) => (
              <Link key={l.id} href={`/show/${l.performanceId}`} className="note">
                <div className="note-thumb">
                  <ArtistImage name={l.performance.artist.name} src={l.performance.artist.imageUrl} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <strong style={{ fontSize: 15 }}>{l.performance.artist.name}</strong>
                    <Stars rating={toNumber(l.rating)} />
                  </div>
                  <div className="faint" style={{ fontSize: 12.5 }}>
                    {l.performance.event.venue?.name ?? l.performance.event.name} · {formatDate(l.loggedDate)}
                  </div>
                  <p className="note-quote">{l.review}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
