import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toNumber, formatDate } from "@/lib/format";
import { Poster } from "@/components/Poster";
import { Avatar } from "@/components/Avatar";
import { Stars } from "@/components/Stars";
import { FestivalAttendanceForm } from "@/components/FestivalAttendanceForm";

export default async function FestivalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      venue: true,
      performances: {
        orderBy: [{ performanceDate: "asc" }, { isHeadliner: "desc" }],
        include: { artist: true, logs: { select: { rating: true } } },
      },
      festivalAttendances: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { handle: true, displayName: true, avatarUrl: true } } },
      },
    },
  });
  if (!event || event.type !== "festival") notFound();

  const heroImg = event.performances.find((p) => p.artist.imageUrl)?.artist.imageUrl ?? null;
  const myAttendance = me ? event.festivalAttendances.find((a) => a.user.handle === me.handle) : null;
  const ratings = event.festivalAttendances.map((a) => toNumber(a.rating)).filter((r): r is number => r != null);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

  // Group lineup by day.
  const byDay = new Map<string, typeof event.performances>();
  for (const p of event.performances) {
    const key = p.performanceDate.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  }

  return (
    <main className="container">
      <div className="hero-backdrop" style={{ minHeight: 220 }}>
        {heroImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="bd-img" src={heroImg} alt="" />
        )}
        <div className="bd-grad" />
        <div className="hero-inner">
          <div style={{ flex: 1 }}>
            <span className="pill">🎪 Festival</span>
            <h1 style={{ fontSize: 38, margin: "8px 0" }}>{event.name}</h1>
            <div className="row" style={{ gap: 8 }}>
              <span className="pill">
                {formatDate(event.startDate)}
                {event.endDate ? ` – ${formatDate(event.endDate)}` : ""}
              </span>
              {event.venue && <span className="pill">{event.venue.name} · {event.venue.city}</span>}
              <span className="pill">{event.performances.length} sets</span>
              {avg && <span className="pill" style={{ color: "var(--star)" }}>★ {avg} avg</span>}
            </div>
          </div>
        </div>
      </div>

      {me && (
        <FestivalAttendanceForm
          eventId={event.id}
          initialRating={myAttendance ? toNumber(myAttendance.rating) : null}
          initialReview={myAttendance?.review ?? null}
        />
      )}

      {/* Lineup */}
      {[...byDay.entries()].map(([day, perfs]) => (
        <div key={day}>
          <div className="label">{formatDate(day)}</div>
          <div className="poster-grid">
            {perfs.map((p) => {
              const rs = p.logs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null);
              const a = rs.length ? Math.round((rs.reduce((x, y) => x + y, 0) / rs.length) * 2) / 2 : null;
              return (
                <Poster
                  key={p.id}
                  href={`/show/${p.id}`}
                  name={p.artist.name}
                  image={p.artist.imageUrl}
                  caption={p.artist.name}
                  subcaption={p.stage}
                  rating={a}
                  favorite={p.isHeadliner}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Attendees */}
      <div className="label">Who went</div>
      {event.festivalAttendances.length === 0 ? (
        <p className="muted">No one's logged the whole festival yet.</p>
      ) : (
        <div>
          {event.festivalAttendances.map((a) => (
            <div key={a.id} className="review">
              <div className="row" style={{ gap: 10 }}>
                <Link href={`/u/${a.user.handle}`}><Avatar name={a.user.displayName} src={a.user.avatarUrl} size={34} /></Link>
                <Link href={`/u/${a.user.handle}`}><strong>{a.user.displayName}</strong></Link>
                <Stars rating={toNumber(a.rating)} />
              </div>
              {a.review && <p className="muted" style={{ margin: "8px 0 0" }}>{a.review}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
