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
type TmClassification = {
  segment?: { name?: string };
  genre?: { name?: string };
  subType?: { name?: string };
};
type TmEvent = {
  id: string;
  name: string;
  dates?: { start?: { localDate?: string } };
  classifications?: TmClassification[];
  _embedded?: { venues?: TmVenue[]; attractions?: { name?: string }[] };
};

export type UpcomingImport = {
  ticketmasterId: string;
  date: string; // yyyy-mm-dd
  eventName: string; // original TM name (= festival name for festival events)
  isFestival: boolean;
  festivalName: string | null;
  venue: { name: string; city: string; countryCode: string; lat: number | null; long: number | null };
};

const FESTIVAL_RE =
  /\b(festival|fest|coachella|lollapalooza|bonnaroo|glastonbury|primavera|sziget|roskilde|governors ball|outside lands|reading|leeds fest|wireless|isle of wight|all points east|mad cool|nos alive|s[oó]nar|tomorrowland|burning man|riot fest|pitchfork|osheaga|austin city limits|acl|firefly|shaky knees)\b/i;

const AFTERSHOW_RE = /after\s?show|after\s?party|pre[-\s]?party|afterparty/i;

function isFestivalEvent(e: TmEvent): boolean {
  // Aftershows/afterparties name-drop the festival but are normal club gigs.
  if (AFTERSHOW_RE.test(e.name)) return false;
  const c = e.classifications?.[0];
  if (c?.subType?.name === "Festival") return true;
  if (c?.genre?.name === "Fairs & Festivals") return true;
  if (FESTIVAL_RE.test(e.name)) return true;
  // A music event with a large multi-artist bill is almost always a festival.
  if ((e._embedded?.attractions?.length ?? 0) >= 6) return true;
  return false;
}

// Day/pass/ticket-type qualifiers (multilingual) that TM appends to festival names.
const QUALIFIER_RE =
  /\s*[|–—-]\s*(\d+\s*[-–]?\s*)?(day|days|jour|jours|night|nights|weekend|wknd|vip|pass(es)?|ticket(s)?|ga|3-jours|monday|tuesday|wednesday|thursday|friday|saturday|sunday|vendredi|samedi|dimanche|lundi|cumartesi|pazar|pazartesi|kombine|sat|sun|fri).*$/i;

/** Reduce a TM event name to a clean, mergeable festival name (drops ticket/day variants + year). */
export function cleanFestivalName(name: string): string {
  let n = name.split("|")[0]; // everything before a ticket-type pipe
  n = n.replace(QUALIFIER_RE, "");
  n = n.replace(/\s*\((?:[^)]*\d{4}[^)]*)\)\s*$/i, ""); // "(April 9-11, 2027)"
  n = n.replace(/\b\d{4}\b/g, ""); // stray year tokens
  n = n.replace(/\s*[|–—-]\s*\d+\s*$/i, ""); // trailing "- 3"
  return n.replace(/\s{2,}/g, " ").trim();
}

/** Stable merge key: base name without a trailing "Festival" word, + city + year. */
export function festivalKey(festivalName: string, city: string, year: string): string {
  const base = festivalName.replace(/\s*(music\s*)?festival\s*$/i, "");
  return `${base}-${city}-${year}`;
}

const NON_ARTIST_RE = /\b(parking|vip|package|camping|shuttle|premium|hospitality|garage|locker|wristband|payment plan|hotel|add[- ]?on|upgrade|lounge|suite)\b/i;

/** Music acts on an event's bill (headliner first), filtering out venues/add-ons. */
function musicArtistNames(e: TmEvent): string[] {
  const venueName = (e._embedded?.venues?.[0]?.name ?? "").toLowerCase();
  const out: string[] = [];
  for (const a of e._embedded?.attractions ?? []) {
    const name = a.name?.trim();
    if (!name) continue;
    const seg = (a as { classifications?: TmClassification[] }).classifications?.[0]?.segment?.name;
    if (seg && seg !== "Music") continue;
    if (name.toLowerCase() === venueName) continue;
    if (NON_ARTIST_RE.test(name)) continue;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

export type CatalogueEvent = {
  tmId: string;
  date: string; // yyyy-mm-dd
  name: string;
  isFestival: boolean;
  festivalName: string | null;
  artistNames: string[];
  venue: { name: string; city: string; countryCode: string; lat: number | null; long: number | null };
};

/** One page of all upcoming music events in a country, parsed for the catalogue. */
export async function fetchMusicEvents(
  countryCode: string,
  page: number,
  size = 100
): Promise<{ events: CatalogueEvent[]; totalPages: number }> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) throw new Error("TICKETMASTER_API_KEY not set");
  await throttle();
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const url =
    `${BASE}/events.json?apikey=${key}&classificationName=Music&countryCode=${countryCode}` +
    `&startDateTime=${now}&size=${size}&page=${page}&sort=date,asc`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Ticketmaster ${res.status} (country=${countryCode} page=${page})`);
  const json = (await res.json()) as { page?: { totalPages?: number }; _embedded?: { events?: TmEvent[] } };
  const totalPages = json.page?.totalPages ?? 0;
  const events: CatalogueEvent[] = [];
  for (const e of json._embedded?.events ?? []) {
    const v = e._embedded?.venues?.[0];
    const date = e.dates?.start?.localDate;
    const artistNames = musicArtistNames(e);
    if (!v?.name || !v.city?.name || !date || artistNames.length === 0) continue;
    const festival = isFestivalEvent(e);
    events.push({
      tmId: e.id,
      date,
      name: e.name,
      isFestival: festival,
      festivalName: festival ? cleanFestivalName(e.name) : null,
      artistNames,
      venue: {
        name: v.name,
        city: v.city.name,
        countryCode: v.country?.countryCode ?? countryCode,
        lat: v.location?.latitude ? Number(v.location.latitude) : null,
        long: v.location?.longitude ? Number(v.location.longitude) : null,
      },
    });
  }
  return { events, totalPages };
}

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
    const festival = isFestivalEvent(e);
    out.push({
      ticketmasterId: e.id,
      date,
      eventName: e.name,
      isFestival: festival,
      festivalName: festival ? cleanFestivalName(e.name) : null,
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
