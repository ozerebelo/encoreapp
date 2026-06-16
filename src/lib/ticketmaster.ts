// Ticketmaster Discovery API client for UPCOMING concerts (replaces the
// per-band-gated Bandsintown API). Requires TICKETMASTER_API_KEY.
//
// Get a free key instantly: https://developer.ticketmaster.com/

const BASE = "https://app.ticketmaster.com/discovery/v2";

export function hasTicketmasterKey(): boolean {
  return !!process.env.TICKETMASTER_API_KEY;
}

type TmVenue = {
  name?: string;
  city?: { name?: string };
  country?: { countryCode?: string };
  location?: { latitude?: string; longitude?: string };
};
type TmEvent = {
  id: string;
  name: string;
  dates?: { start?: { localDate?: string } };
  _embedded?: { venues?: TmVenue[]; attractions?: { name?: string }[] };
};

export type UpcomingImport = {
  ticketmasterId: string;
  date: string; // yyyy-mm-dd
  venue: { name: string; city: string; countryCode: string; lat: number | null; long: number | null };
};

let lastCall = 0;
async function throttle() {
  const wait = 250 - (Date.now() - lastCall); // ~4 req/sec, under the 5/sec cap
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

/** Upcoming music events for an artist, confirmed by an attraction-name match. */
export async function fetchUpcomingByArtist(artistName: string): Promise<UpcomingImport[]> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) throw new Error("TICKETMASTER_API_KEY not set");
  await throttle();

  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const url =
    `${BASE}/events.json?apikey=${key}` +
    `&classificationName=music&keyword=${encodeURIComponent(artistName)}` +
    `&startDateTime=${now}&sort=date,asc&size=30`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Ticketmaster ${res.status} for ${artistName}`);
  const json = (await res.json()) as { _embedded?: { events?: TmEvent[] } };
  const events = json._embedded?.events ?? [];

  const wanted = artistName.toLowerCase();
  const out: UpcomingImport[] = [];
  for (const e of events) {
    // Only keep events where this artist is actually on the bill.
    const attractions = e._embedded?.attractions ?? [];
    if (attractions.length && !attractions.some((a) => (a.name ?? "").toLowerCase() === wanted)) continue;
    const v = e._embedded?.venues?.[0];
    const date = e.dates?.start?.localDate;
    if (!v?.name || !v.city?.name || !date) continue;
    out.push({
      ticketmasterId: e.id,
      date,
      venue: {
        name: v.name,
        city: v.city.name,
        countryCode: v.country?.countryCode ?? "XX",
        lat: v.location?.latitude ? Number(v.location.latitude) : null,
        long: v.location?.longitude ? Number(v.location.longitude) : null,
      },
    });
  }
  return out;
}
