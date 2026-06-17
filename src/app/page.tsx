import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Poster } from "@/components/Poster";
import { StubCard, type StubData } from "@/components/StubCard";
import { CityPicker } from "@/components/CityPicker";
import { UseMyLocation } from "@/components/UseMyLocation";
import { AutoLocate } from "@/components/AutoLocate";
import { citiesWithUpcoming, upcomingShows, defaultUpcomingCity } from "@/lib/upcoming";
import { formatDate } from "@/lib/format";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/feed");

  const { city: cityParam } = await searchParams;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const cities = await citiesWithUpcoming();
  const city = cityParam && cities.includes(cityParam)
    ? cityParam
    : await defaultUpcomingCity(null, cities);

  const [pastSample, highlights] = await Promise.all([
    // The artefact: a wall of real past shows, to sell the charm.
    prisma.performance.findMany({
      where: { performanceDate: { lt: today }, artist: { imageUrl: { not: null } }, event: { venue: { isNot: null } } },
      orderBy: { performanceDate: "desc" },
      take: 8,
      include: { artist: { select: { name: true, imageUrl: true } }, event: { select: { venue: { select: { name: true, city: true } } } } },
    }),
    upcomingShows(city, 6),
  ]);

  const stubs: StubData[] = pastSample.map((p) => ({
    performanceId: p.id,
    artist: p.artist.name,
    artistImage: p.artist.imageUrl,
    venue: p.event.venue?.name ?? "—",
    city: p.event.venue?.city ?? null,
    date: p.performanceDate,
    rating: null,
    isFavorite: false,
  }));

  return (
    <main className="container">
      <AutoLocate hasCityParam={!!cityParam} />
      <section className="hero">
        <span className="pill">◉ Letterboxd, but for the gigs you&apos;ve been to</span>
        <h1>Every gig. Every stub. Every memory.</h1>
        <p className="muted" style={{ fontSize: 18, maxWidth: 560, margin: "0 auto 26px" }}>
          A diary for the shows you&apos;ve been to — going back years. Log the night,
          keep the ticket stub, rate it, and relive your year in live music.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link href="/signup" className="btn btn-primary">Start your stub wall</Link>
          <Link href="/login" className="btn btn-ghost">Log in</Link>
        </div>
        <p className="faint" style={{ marginTop: 18, fontSize: 13 }}>
          Try the demo — <strong>ava@example.com</strong> / <strong>password</strong>
        </p>
      </section>

      {/* The signature artefact: the wall */}
      <div className="label">Your wall, one show at a time</div>
      <div className="stub-grid">
        {stubs.map((s, i) => <StubCard key={i} stub={s} />)}
      </div>

      {/* Upcoming kept, but as a secondary section further down */}
      <div className="label">
        <span>Coming up in {city}</span>
        <span className="row" style={{ gap: 8 }}>
          <UseMyLocation />
          <CityPicker city={city} cities={cities} />
        </span>
      </div>
      {highlights.length === 0 ? (
        <p className="muted">No upcoming shows catalogued in {city} yet.</p>
      ) : (
        <div className="poster-grid">
          {highlights.map((s) => (
            <Poster
              key={s.id}
              href={`/show/${s.id}`}
              name={s.artist}
              image={s.artistImage}
              caption={s.artist}
              subcaption={`${s.festival ? `🎪 ${s.festival}` : s.venue ?? ""} · ${formatDate(s.date)}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
