"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { nearestCity } from "@/lib/cities";

export function UseMyLocation({ cities }: { cities: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "locating" | "denied" | "unsupported">("idle");

  function locate() {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const city = nearestCity(pos.coords.latitude, pos.coords.longitude, cities);
        setState("idle");
        if (city) router.push(`${pathname}?city=${encodeURIComponent(city)}`);
      },
      () => setState("denied"),
      { timeout: 8000, maximumAge: 600000 }
    );
  }

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={locate}
      disabled={state === "locating"}
      title="Find shows near you"
    >
      {state === "locating" ? "Locating…" : "📍 Near me"}
      {state === "denied" && <span className="faint" style={{ marginLeft: 6 }}>location off</span>}
      {state === "unsupported" && <span className="faint" style={{ marginLeft: 6 }}>not supported</span>}
    </button>
  );
}
