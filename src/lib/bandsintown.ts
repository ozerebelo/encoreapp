// Bandsintown API client for UPCOMING concerts. Requires BANDSINTOWN_APP_ID.
// The forward-looking counterpart to setlist.fm (which is historical only).
//
// Register a free app id: https://artists.bandsintown.com/support/api-installation

const BASE = "https://rest.bandsintown.com";

export function hasBandsintownKey(): boolean {
  return !!process.env.BANDSINTOWN_APP_ID;
}

type BitVenue = {
  name: string;
  city: string;
  country: string;
  latitude?: string;
  longitude?: string;
};
type BitEvent = {
  id: string;
  datetime: string; // ISO
  venue: BitVenue;
};

export type UpcomingImport = {
  bandsintownId: string;
  date: string; // yyyy-mm-dd
  venue: { name: string; city: string; countryCode: string; lat: number | null; long: number | null };
};

/** Upcoming events for an artist by name. */
export async function fetchUpcoming(artistName: string): Promise<UpcomingImport[]> {
  const appId = process.env.BANDSINTOWN_APP_ID;
  if (!appId) throw new Error("BANDSINTOWN_APP_ID not set");
  const res = await fetch(
    `${BASE}/artists/${encodeURIComponent(artistName)}/events?app_id=${appId}&date=upcoming`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`Bandsintown ${res.status} for ${artistName}`);
  const events = (await res.json()) as BitEvent[];
  if (!Array.isArray(events)) return [];
  return events.map((e) => ({
    bandsintownId: e.id,
    date: e.datetime.slice(0, 10),
    venue: {
      name: e.venue.name,
      city: e.venue.city,
      countryCode: countryToIso(e.venue.country),
      lat: e.venue.latitude ? Number(e.venue.latitude) : null,
      long: e.venue.longitude ? Number(e.venue.longitude) : null,
    },
  }));
}

// Bandsintown returns full country names; map the common ones to ISO-2.
const ISO: Record<string, string> = {
  "United Kingdom": "GB", "United States": "US", Spain: "ES", Portugal: "PT",
  Netherlands: "NL", France: "FR", Germany: "DE", Italy: "IT", Ireland: "IE",
};
function countryToIso(name: string): string {
  return ISO[name] ?? name.slice(0, 2).toUpperCase();
}
