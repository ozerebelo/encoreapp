"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "interested" | "going" | null;

export function PlanButton({
  performanceId,
  initialStatus,
  size = "md",
}: {
  performanceId: string;
  initialStatus: Status;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);

  async function set(next: Status) {
    setBusy(true);
    const target = status === next ? null : next; // toggle off if same
    if (target === null) {
      await fetch("/api/plan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performanceId }),
      });
    } else {
      await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performanceId, status: target }),
      });
    }
    setStatus(target);
    setBusy(false);
    router.refresh();
  }

  const cls = size === "sm" ? "btn btn-sm" : "btn";

  return (
    <div className="row" style={{ gap: 8 }}>
      <button
        className={`${cls} ${status === "going" ? "btn-primary" : "btn-ghost"}`}
        onClick={() => set("going")}
        disabled={busy}
      >
        🎟️ {status === "going" ? "Going" : "I'm going"}
      </button>
      <button
        className={`${cls} ${status === "interested" ? "btn-primary" : "btn-ghost"}`}
        onClick={() => set("interested")}
        disabled={busy}
      >
        ☆ {status === "interested" ? "On your list" : "Want to go"}
      </button>
    </div>
  );
}
