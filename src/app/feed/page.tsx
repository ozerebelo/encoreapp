import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActivity, type Activity } from "@/lib/activity";
import { formatDate, timeAgo, untilLabel, recencyBucket } from "@/lib/format";
import { Stars } from "@/components/Stars";
import { Avatar } from "@/components/Avatar";
import { ArtistImage } from "@/components/ArtistImage";
import { FollowButton } from "@/components/FollowButton";

const STANDING_LABEL: Record<string, string> = {
  pit: "in the pit", ga_floor: "on the GA floor", seated: "seated", balcony: "in the balcony", other: "",
};

function ActivityRow({ a }: { a: Activity }) {
  return (
    <article className="feed-item">
      {a.kind === "list" ? (
        <div className="feed-thumb feed-thumb-stack" style={{ width: 76, height: 76 }}>
          {a.thumbs.slice(0, 4).map((t, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={t} alt="" loading="lazy" />
          ))}
        </div>
      ) : (
        <Link href={`/show/${a.perfId}`} className="feed-thumb" style={{ width: 76, height: 76 }}>
          <ArtistImage name={a.artist} src={a.artistImage} />
        </Link>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="spread">
          <div className="row" style={{ gap: 8 }}>
            <Link href={`/u/${a.user.handle}`}><Avatar name={a.user.displayName} src={a.user.avatarUrl} size={26} /></Link>
            <span>
              <Link href={`/u/${a.user.handle}`}><strong>{a.user.displayName}</strong></Link>
              {a.kind === "log" && <>
                <span className="muted"> saw </span>
                <Link href={`/show/${a.perfId}`}><strong>{a.artist}</strong></Link>
              </>}
              {a.kind === "plan" && <>
                <span className="muted"> is going to </span>
                <Link href={`/show/${a.perfId}`}><strong>{a.artist}</strong></Link>
              </>}
              {a.kind === "list" && <>
                <span className="muted"> made a list </span>
                <Link href={`/list/${a.listId}`}><strong>{a.title}</strong></Link>
              </>}
            </span>
          </div>
          <span className="faint" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{timeAgo(a.at)}</span>
        </div>

        {a.kind === "log" && (
          <>
            <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>
              {a.venue}{a.city ? ` · ${a.city}` : ""} · {formatDate(a.date)}
            </div>
            <div className="row" style={{ marginTop: 8, gap: 10 }}>
              <Stars rating={a.rating} />
              {a.standing && STANDING_LABEL[a.standing] && <span className="pill">{STANDING_LABEL[a.standing]}</span>}
              {a.companions.map((c) => (
                <Link key={c.handle} href={`/u/${c.handle}`} className="pill">with @{c.handle}</Link>
              ))}
              {a.attendedWith && <span className="pill">with {a.attendedWith}</span>}
              {a.isFavorite && <span style={{ color: "var(--accent-2)" }}>♥</span>}
            </div>
            {a.review && <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{a.review}</p>}
            {a.photos.length > 0 && (
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                {a.photos.map((ph, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={ph} alt="" loading="lazy" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 9, border: "1px solid var(--border)" }} />
                ))}
              </div>
            )}
          </>
        )}

        {a.kind === "plan" && (
          <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>
            <span className="pill" style={{ color: "var(--accent-3)" }}>🎟️ going</span>{" "}
            {a.venue}{a.city ? ` · ${a.city}` : ""} · {untilLabel(a.date)}
          </div>
        )}

        {a.kind === "list" && (
          <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>{a.itemCount} shows</div>
        )}
      </div>
    </article>
  );
}

export default async function FeedPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const following = await prisma.follow.findMany({ where: { followerId: me.id }, select: { followeeId: true } });
  const followingIds = following.map((f) => f.followeeId);
  const authorIds = [me.id, ...followingIds];

  const [activity, suggestions, popular] = await Promise.all([
    getActivity(authorIds, 30),
    prisma.user.findMany({
      where: { id: { notIn: authorIds } },
      orderBy: { createdAt: "asc" },
      take: 4,
      include: { _count: { select: { logs: true } } },
    }),
    prisma.performance.findMany({
      where: { logs: { some: {} } },
      orderBy: { logs: { _count: "desc" } },
      take: 4,
      include: {
        artist: { select: { name: true, imageUrl: true } },
        event: { select: { venue: { select: { name: true } } } },
        _count: { select: { logs: true } },
      },
    }),
  ]);

  let lastBucket = "";

  return (
    <main className="container">
      <div className="spread" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: 28 }}>Feed</h1>
        <Link href="/log/new" className="btn btn-primary btn-sm">+ Log a show</Link>
      </div>

      <div className="feed-layout">
        {/* Main column */}
        <div>
          {activity.length === 0 ? (
            <div className="card">
              <p className="muted" style={{ margin: 0 }}>
                Your feed is quiet. <Link href="/discover" style={{ color: "var(--accent)" }}>Follow some people</Link>{" "}
                or <Link href="/log/new" style={{ color: "var(--accent)" }}>log a show</Link>.
              </p>
            </div>
          ) : (
            activity.map((a, i) => {
              const bucket = recencyBucket(a.at);
              const showHeader = bucket !== lastBucket;
              lastBucket = bucket;
              return (
                <div key={i}>
                  {showHeader && (
                    <div className="faint" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: i === 0 ? "8px 0 10px" : "22px 0 10px" }}>
                      {bucket}
                    </div>
                  )}
                  <ActivityRow a={a} />
                </div>
              );
            })
          )}
        </div>

        {/* Right rail — social + discovery (upcoming lives in its own tab) */}
        <aside className="rail">
          <div className="rail-card">
            <h3>Most logged</h3>
            {popular.map((s) => (
              <Link key={s.id} href={`/show/${s.id}`} className="rail-row">
                <div className="rail-thumb"><ArtistImage name={s.artist.name} src={s.artist.imageUrl} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist.name}</div>
                  <div className="faint" style={{ fontSize: 12 }}>{s._count.logs} log{s._count.logs !== 1 ? "s" : ""}</div>
                </div>
              </Link>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="rail-card">
              <h3>Who to follow</h3>
              {suggestions.map((u) => (
                <div key={u.id} className="rail-row spread">
                  <Link href={`/u/${u.handle}`} className="row" style={{ gap: 8, minWidth: 0 }}>
                    <Avatar name={u.displayName} src={u.avatarUrl} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.displayName}</div>
                      <div className="faint" style={{ fontSize: 12 }}>{u._count.logs} shows</div>
                    </div>
                  </Link>
                  <FollowButton handle={u.handle} initialFollowing={false} />
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
