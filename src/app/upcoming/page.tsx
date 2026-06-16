import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { citiesWithUpcoming, upcomingShows } from "@/lib/upcoming";
import { formatDate, untilLabel } from "@/lib/format";
import { Poster } from "@/components/Poster";
import { CityPicker } from "@/components/CityPicker";
import { UseMyLocation } from "@/components/UseMyLocation";

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const me = await getCurrentUser();
  const { city: cityParam } = await searchParams;
  const cities = await citiesWithUpcoming();
  const defaultCity = (me?.homeCity && cities.includes(me.homeCity)) ? me.homeCity : cities[0] ?? "London";
  const city = cityParam && cities.includes(cityParam) ? cityParam : defaultCity;

  const shows = await upcomingShows(city, 24);

  // The user's own plans (any city), soonest first.
  const myPlans = me
    ? await prisma.plan.findMany({
        where: { userId: me.id, performance: { performanceDate: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } } },
        orderBy: { performance: { performanceDate: "asc" } },
        include: { performance: { include: { artist: { select: { name: true, imageUrl: true } }, event: { select: { venue: { select: { name: true } } } } } } },
      })
    : [];

  return (
    <main className="container">
      <h1 style={{ fontSize: 28, marginTop: 24 }}>Upcoming</h1>

      {me && myPlans.length > 0 && (
        <>
          <div className="label">Your plans</div>
          <div className="poster-grid">
            {myPlans.map((pl) => (
              <Poster
                key={pl.id}
                href={`/show/${pl.performanceId}`}
                name={pl.performance.artist.name}
                image={pl.performance.artist.imageUrl}
                caption={pl.performance.artist.name}
                subcaption={`${pl.performance.event.venue?.name ?? ""} · ${formatDate(pl.performance.performanceDate)}`}
                badge={pl.status === "going" ? "🎟️" : "☆"}
              />
            ))}
          </div>
        </>
      )}

      <div className="label">
        <span>In {city}</span>
        <span className="row" style={{ gap: 8 }}>
          <UseMyLocation cities={cities} />
          <CityPicker city={city} cities={cities} />
        </span>
      </div>
      {shows.length === 0 ? (
        <p className="muted">No upcoming shows catalogued in {city} yet.</p>
      ) : (
        <div className="poster-grid">
          {shows.map((s) => (
            <Poster
              key={s.id}
              href={`/show/${s.id}`}
              name={s.artist}
              image={s.artistImage}
              caption={s.artist}
              subcaption={`${s.venue ?? ""} · ${untilLabel(s.date)}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
