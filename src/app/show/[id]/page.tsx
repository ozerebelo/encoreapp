import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toNumber, formatDate, parseSetlist, isUpcoming, untilLabel } from "@/lib/format";
import { ArtistImage } from "@/components/ArtistImage";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import { AddToList } from "@/components/AddToList";
import { PlanButton } from "@/components/PlanButton";
import { LogInteractions } from "@/components/LogInteractions";

const STANDING_LABEL: Record<string, string> = {
  pit: "in the pit", ga_floor: "GA floor", seated: "seated", balcony: "balcony", other: "",
};

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();

  const perf = await prisma.performance.findUnique({
    where: { id },
    include: {
      artist: true,
      event: { include: { venue: true } },
      logs: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { handle: true, displayName: true, avatarUrl: true } },
          photos: true,
          companions: { include: { user: { select: { handle: true, displayName: true } } } },
          _count: { select: { likes: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { handle: true, displayName: true, avatarUrl: true } } },
          },
        },
      },
      plans: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { handle: true, displayName: true, avatarUrl: true } } },
      },
    },
  });
  if (!perf) notFound();

  const upcoming = isUpcoming(perf.performanceDate);
  const goingList = perf.plans.filter((p) => p.status === "going");
  const interestedList = perf.plans.filter((p) => p.status === "interested");
  const myPlan = me ? perf.plans.find((p) => p.user.handle === me.handle) : null;
  const setlist = parseSetlist(perf.setlist);
  const ratings = perf.logs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
  const myLog = me ? perf.logs.find((l) => l.user.handle === me.handle) : null;

  const myLists = me
    ? await prisma.list.findMany({ where: { userId: me.id }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } })
    : [];

  // Which of these reviews has the viewer liked?
  const myLikedLogIds = me
    ? new Set(
        (await prisma.like.findMany({
          where: { userId: me.id, logId: { in: perf.logs.map((l) => l.id) } },
          select: { logId: true },
        })).map((l) => l.logId)
      )
    : new Set<string>();
  const meLite = me ? { handle: me.handle, displayName: me.displayName, avatarUrl: me.avatarUrl } : null;

  return (
    <main className="container container-narrow">
      {/* Hero */}
      <div className="hero-backdrop">
        {perf.artist.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="bd-img" src={perf.artist.imageUrl} alt="" />
        )}
        <div className="bd-grad" />
        <div className="hero-inner">
          <div className="hero-poster">
            <ArtistImage name={perf.artist.name} src={perf.artist.imageUrl} />
          </div>
          <div style={{ flex: 1 }}>
            <Link href={`/artist/${perf.artist.slug}`} className="muted" style={{ fontWeight: 700 }}>
              {perf.artist.name}
            </Link>
            <h1 style={{ fontSize: 30, margin: "4px 0 8px" }}>
              {perf.event.venue?.name ?? perf.event.name}
            </h1>
            <div className="row" style={{ gap: 8 }}>
              <span className="pill">{formatDate(perf.performanceDate)}</span>
              {upcoming && <span className="pill" style={{ color: "var(--accent-3)" }}>upcoming · {untilLabel(perf.performanceDate)}</span>}
              {perf.event.venue?.city && <span className="pill">{perf.event.venue.city}</span>}
              {perf.event.type === "festival" && (
                <Link href={`/festival/${perf.event.slug}`} className="pill">🎪 {perf.event.name}</Link>
              )}
              {perf.stage && <span className="pill">{perf.stage} stage</span>}
              {perf.isHeadliner && <span className="pill">headliner</span>}
            </div>
          </div>
          {upcoming ? (
            <div style={{ textAlign: "center" }}>
              <div className="stat-num" style={{ color: "var(--accent-3)" }}>{goingList.length}</div>
              <div className="stat-label">going</div>
            </div>
          ) : avg ? (
            <div style={{ textAlign: "center" }}>
              <div className="stat-num" style={{ color: "var(--star)" }}>★ {avg}</div>
              <div className="stat-label">{ratings.length} rating{ratings.length !== 1 ? "s" : ""}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div className="row" style={{ marginTop: 16 }}>
        {upcoming ? (
          me ? (
            <PlanButton performanceId={perf.id} initialStatus={myPlan?.status ?? null} size="sm" />
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">Sign in to plan</Link>
          )
        ) : myLog ? (
          <>
            <span className="pill">✓ You logged this · <Stars rating={toNumber(myLog.rating)} /></span>
            <Link href={`/log/${myLog.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
          </>
        ) : (
          <Link href={`/log/new?performance=${perf.id}`} className="btn btn-primary btn-sm">
            + Log this show
          </Link>
        )}
        {me && <AddToList performanceId={perf.id} lists={myLists} />}
      </div>

      {/* Who's going (upcoming) */}
      {upcoming ? (
        <>
          <div className="label">
            Who&apos;s going
            <span>{goingList.length} going · {interestedList.length} interested</span>
          </div>
          {perf.plans.length === 0 ? (
            <p className="muted">No one&apos;s planning this yet. Claim your spot.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {goingList.length > 0 && (
                <div>
                  <div className="faint" style={{ fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>🎟️ Going</div>
                  <div className="row" style={{ gap: 14 }}>
                    {goingList.map((pl) => (
                      <Link key={pl.id} href={`/u/${pl.user.handle}`} className="row" style={{ gap: 8 }}>
                        <Avatar name={pl.user.displayName} src={pl.user.avatarUrl} size={30} />
                        <span style={{ fontSize: 14 }}>{pl.user.displayName}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {interestedList.length > 0 && (
                <div>
                  <div className="faint" style={{ fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>☆ Interested</div>
                  <div className="row" style={{ gap: 14 }}>
                    {interestedList.map((pl) => (
                      <Link key={pl.id} href={`/u/${pl.user.handle}`} className="row" style={{ gap: 8 }}>
                        <Avatar name={pl.user.displayName} src={pl.user.avatarUrl} size={30} />
                        <span style={{ fontSize: 14 }}>{pl.user.displayName}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
      {/* Setlist */}
      <div className="label">Setlist</div>
      {setlist.length === 0 ? (
        <p className="muted">No setlist on file.</p>
      ) : (
        <ol className="setlist">
          {setlist.map((s, i) => (
            <li key={i} className={s.is_encore ? "encore" : ""}>{s.song}</li>
          ))}
        </ol>
      )}

      {/* Community */}
      <div className="label">
        From the crowd
        <span>{perf.logs.length} log{perf.logs.length !== 1 ? "s" : ""}</span>
      </div>
      {perf.logs.length === 0 ? (
        <p className="muted">No one&apos;s logged this yet. Be the first.</p>
      ) : (
        <div>
          {perf.logs.map((log) => (
            <div key={log.id} className="review">
              <div className="row" style={{ gap: 10 }}>
                <Link href={`/u/${log.user.handle}`}><Avatar name={log.user.displayName} src={log.user.avatarUrl} size={34} /></Link>
                <Link href={`/u/${log.user.handle}`}><strong>{log.user.displayName}</strong></Link>
                <Stars rating={toNumber(log.rating)} />
                {log.standing && STANDING_LABEL[log.standing] && (
                  <span className="pill">{STANDING_LABEL[log.standing]}</span>
                )}
                {log.companions.map((c) => (
                  <Link key={c.user.handle} href={`/u/${c.user.handle}`} className="pill">with @{c.user.handle}</Link>
                ))}
                {log.attendedWith && <span className="faint" style={{ fontSize: 13 }}>with {log.attendedWith}</span>}
              </div>
              {log.review && <p className="muted" style={{ margin: "8px 0 0" }}>{log.review}</p>}
              {log.photos.length > 0 && (
                <div className="photo-grid" style={{ marginTop: 10 }}>
                  {log.photos.map((ph) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={ph.id} src={ph.url} alt="" loading="lazy" />
                  ))}
                </div>
              )}
              <LogInteractions
                logId={log.id}
                initialLikes={log._count.likes}
                initialLiked={myLikedLogIds.has(log.id)}
                initialComments={log.comments.map((c) => ({
                  id: c.id, body: c.body, createdAt: c.createdAt, user: c.user,
                }))}
                me={meLite}
              />
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </main>
  );
}
