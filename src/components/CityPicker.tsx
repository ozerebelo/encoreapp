"use client";

import { useRouter, usePathname } from "next/navigation";

export function CityPicker({ city, cities }: { city: string; cities: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      value={city}
      onChange={(e) => router.push(`${pathname}?city=${encodeURIComponent(e.target.value)}`)}
      style={{ width: "auto", padding: "6px 10px", fontSize: 13, fontWeight: 600 }}
    >
      {cities.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}
