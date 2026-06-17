import { NextResponse } from "next/server";
import { nearestUpcomingCity } from "@/lib/upcoming";

// Given a lat/lon, return the nearest city that has upcoming shows (by venue coords).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }
  const city = await nearestUpcomingCity(lat, lon);
  return NextResponse.json({ city });
}
