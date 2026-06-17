"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// Manual "use my location" — same nearest-city resolution as AutoLocate.
export function UseMyLocation() {
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
      async (pos) => {
        const res = await fetch(`/api/nearest?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const data = await res.json();
        setState("idle");
        if (data.city) router.replace(`${pathname}?city=${encodeURIComponent(data.city)}`);
      },
      () => setState("denied"),
      { timeout: 8000, maximumAge: 600000 }
    );
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={locate} disabled={state === "locating"} title="Find shows near you">
      {state === "locating" ? "Locating…" : "📍 Near me"}
      {state === "denied" && <span className="faint" style={{ marginLeft: 6 }}>location off</span>}
      {state === "unsupported" && <span className="faint" style={{ marginLeft: 6 }}>not supported</span>}
    </button>
  );
}
