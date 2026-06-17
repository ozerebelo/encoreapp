// setlist.fm API client. Requires SETLISTFM_API_KEY in the environment.
// The catalogue (artist/venue/event/performance/setlist) is meant to be seeded
// from here; until a key is present the app falls back to prisma/seed.ts.
//
// Docs: https://api.setlist.fm/docs/1.0/index.html

import type { SetlistEntry } from "./format";

const BASE = "https://api.setlist.fm/rest/1.0";

export function hasSetlistFmKey(): boolean {
  return !!process.env.SETLISTFM_API_KEY;
}

// setlist.fm allows ~2 requests/sec; keep a global minimum gap between calls.
let lastCall = 0;
const MIN_GAP_MS = 600;
async function throttle() {
  const wait = MIN_GAP_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function call<T>(path: string): Promise<T> {
  const key = process.env.SETLISTFM_API_KEY;
  if (!key) throw new Error("SETLISTFM_API_KEY not set");
  for (let attempt = 0; attempt < 5; attempt++) {
    await throttle();
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json", "x-api-key": key },
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (res.status === 404) return { setlist: [] } as T; // empty segment
    if (!res.ok) throw new Error(`setlist.fm ${res.status} for ${path}`);
    return res.json() as Promise<T>;
  }
  throw new Error(`setlist.fm 429 (rate limited) for ${path}`);
}

// --- Raw shapes (trimmed to what we use) ---
type SfmSong = { name: string; encore?: number; info?: string };
type SfmSet = { name?: string; encore?: number; song: SfmSong[] };
type SfmVenue = {
  id: string;
  name: string;
  city?: { name: string; country?: { code?: string }; coords?: { lat?: number; long?: number } };
};
type SfmSetlist = {
  id: string;
  eventDate: string; // dd-MM-yyyy
  artist: { mbid: string; name: string };
  venue: SfmVenue;
  sets?: { set: SfmSet[] };
  tour?: { name?: string };
};

export type ImportedShow = {
  setlistfmId: string;
  date: string; // ISO yyyy-mm-dd
  artist: { mbid: string; name: string };
  venue: {
    setlistfmId: string;
    name: string;
    city: string;
    countryCode: string;
    lat: number | null;
    long: number | null;
  };
  setlist: SetlistEntry[];
};

function toIso(ddMMyyyy: string): string {
  const [d, m, y] = ddMMyyyy.split("-");
  return `${y}-${m}-${d}`;
}

function flattenSets(sets?: { set: SfmSet[] }): SetlistEntry[] {
  if (!sets?.set) return [];
  const out: SetlistEntry[] = [];
  for (const s of sets.set) {
    const encore = !!s.encore;
    for (const song of s.song) {
      out.push({
        song: song.name,
        set_label: s.name ?? (encore ? "Encore" : "Main"),
        is_encore: encore || !!song.encore,
        note: song.info ?? null,
      });
    }
  }
  return out;
}

function normalize(s: SfmSetlist): ImportedShow | null {
  if (!s.venue?.city) return null;
  return {
    setlistfmId: s.id,
    date: toIso(s.eventDate),
    artist: { mbid: s.artist.mbid, name: s.artist.name },
    venue: {
      setlistfmId: s.venue.id,
      name: s.venue.name,
      city: s.venue.city.name,
      countryCode: s.venue.city.country?.code ?? "XX",
      lat: s.venue.city.coords?.lat ?? null,
      long: s.venue.city.coords?.long ?? null,
    },
    setlist: flattenSets(s.sets),
  };
}

/** Recent setlists for an artist by name (resolves the MBID first). */
export async function importArtistShows(
  artistName: string,
  pages = 1
): Promise<ImportedShow[]> {
  const search = await call<{ artist?: { mbid: string; name: string }[] }>(
    `/search/artists?artistName=${encodeURIComponent(artistName)}&sort=relevance`
  );
  const artist = search.artist?.[0];
  if (!artist) return [];

  const shows: ImportedShow[] = [];
  for (let p = 1; p <= pages; p++) {
    const data = await call<{ setlist?: SfmSetlist[] }>(
      `/artist/${artist.mbid}/setlists?p=${p}`
    );
    for (const s of data.setlist ?? []) {
      const n = normalize(s);
      if (n) shows.push(n);
    }
  }
  return shows;
}

/**
 * Search historical setlists by arbitrary filters (e.g. countryCode + year) —
 * the path to a large backlog that's not tied to a single artist.
 */
export async function searchSetlists(
  query: string,
  page: number
): Promise<{ shows: ImportedShow[]; total: number; itemsPerPage: number }> {
  const data = await call<{ setlist?: SfmSetlist[]; total?: number; itemsPerPage?: number }>(
    `/search/setlists?${query}&p=${page}`
  );
  const shows: ImportedShow[] = [];
  for (const s of data.setlist ?? []) {
    const n = normalize(s);
    if (n) shows.push(n);
  }
  return { shows, total: data.total ?? 0, itemsPerPage: data.itemsPerPage ?? 20 };
}
