// Deezer public API — no key required. Used to enrich artists with real
// photography (Letterboxd lives on poster art; ours is artist imagery).

type DeezerArtist = {
  id: number;
  name: string;
  picture_big?: string;
  picture_xl?: string;
  nb_fan?: number;
};

export type ArtistImages = {
  imageUrl: string | null; // square ~1000px
};

const cache = new Map<string, ArtistImages | null>();

export async function fetchArtistImages(name: string): Promise<ArtistImages | null> {
  if (cache.has(name)) return cache.get(name) ?? null;
  try {
    const res = await fetch(
      `https://api.deezer.com/search/artist?limit=5&q=${encodeURIComponent(name)}`,
      { headers: { "User-Agent": "encore-app/0.1" } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: DeezerArtist[] };
    const list = json.data ?? [];
    // Prefer an exact name match, else the most-followed result.
    const exact = list.find(
      (a) => a.name.toLowerCase() === name.toLowerCase()
    );
    const best =
      exact ??
      list.sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
    if (!best) {
      cache.set(name, null);
      return null;
    }
    const out: ArtistImages = {
      imageUrl: best.picture_xl || best.picture_big || null,
    };
    cache.set(name, out);
    return out;
  } catch {
    return null;
  }
}
