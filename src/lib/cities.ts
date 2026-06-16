// Coordinates for the cities in our catalogue, used to map a browser
// geolocation fix to the nearest city we actually have shows in.
// Client-safe (no server imports).
export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  London: { lat: 51.5074, lon: -0.1278 },
  Barcelona: { lat: 41.3851, lon: 2.1734 },
  "New York": { lat: 40.7128, lon: -74.006 },
  Lisbon: { lat: 38.7223, lon: -9.1393 },
  Amsterdam: { lat: 52.3676, lon: 4.9041 },
  Paris: { lat: 48.8566, lon: 2.3522 },
  "San Francisco": { lat: 37.7749, lon: -122.4194 },
};

function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Nearest city (from a candidate list) to a lat/lon, or null if none known. */
export function nearestCity(
  lat: number,
  lon: number,
  candidates: string[]
): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const coord = CITY_COORDS[c];
    if (!coord) continue;
    const d = haversine(lat, lon, coord.lat, coord.lon);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
