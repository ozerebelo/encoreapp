import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArtistImage } from "@/components/ArtistImage";
import { Poster } from "@/components/Poster";
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
  const cities = await citiesWithUpcoming();
  const city = cityParam && cities.includes(cityParam)
    ? cityParam
    : await defaultUpcomingCity(null, cities);
  const [highlights, artists] = await Promise.all([
    upcomingShows(city, 8),
    prisma.artist.findMany({
      where: { imageUrl: { not: null } },
      take: 12,
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, imageUrl: true },
    }),
  ]);

  return (
    <main className="container">
      <AutoLocate hasCityParam={!!cityParam} />
      <section className="hero">
        <span className="pill">◉ a home for the shows you&apos;ve been to — and the ones ahead</span>
        <h1>Every gig. Every stub. Every memory.</h1>
        <p className="muted" style={{ fontSize: 18, maxWidth: 560, margin: "0 auto 26px" }}>
          A live-music diary. Log the performances you attended, keep your ticket-stub
          wall, track what&apos;s coming up near you, and relive your year in shows.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link href="/signup" className="btn btn-primary">Start your stub wall</Link>
          <Link href="/login" className="btn btn-ghost">Log in</Link>
        </div>
        <p className="faint" style={{ marginTop: 18, fontSize: 13 }}>
          Try the demo — <strong>ava@example.com</strong> / <strong>password</strong>
        </p>
      </section>

      {/* Location-based upcoming highlights */}
      <div className="label">
        <span>Upcoming highlights in {city}</span>
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
              subcaption={`${s.venue ?? ""} · ${formatDate(s.date)}`}
            />
          ))}
        </div>
      )}

      <div className="label">In the catalogue</div>
      <div className="poster-grid dense">
        {artists.map((a) => (
          <Link key={a.id} href={`/artist/${a.slug}`} className="poster" title={a.name}>
            <ArtistImage name={a.name} src={a.imageUrl} />
            <div className="poster-cap"><div className="t">{a.name}</div></div>
          </Link>
        ))}
      </div>
    </main>
  );
}
