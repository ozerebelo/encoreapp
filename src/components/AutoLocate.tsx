"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// On first visit (no explicit ?city=), proactively ask for location and switch
// to the user's nearest city. Runs once per session so we don't re-prompt.
export function AutoLocate({ hasCityParam }: { hasCityParam: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hasCityParam) return; // user (or a share link) already chose a city
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    if (sessionStorage.getItem("lm_autolocate") === "done") return;
    sessionStorage.setItem("lm_autolocate", "done");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/nearest?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          if (data.city) router.replace(`${pathname}?city=${encodeURIComponent(data.city)}`);
        } catch {
          /* ignore */
        }
      },
      () => {
        /* denied/unavailable — keep the server default */
      },
      { timeout: 8000, maximumAge: 600000 }
    );
  }, [hasCityParam, pathname, router]);

  return null;
}
