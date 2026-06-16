"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export function FestivalAttendanceForm({
  eventId,
  initialRating,
  initialReview,
}: {
  eventId: string;
  initialRating: number | null;
  initialReview: string | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating ?? 0);
  const [review, setReview] = useState(initialReview ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/festival-attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, rating: rating || null, review }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <strong>Your festival</strong>
      <p className="faint" style={{ fontSize: 13, marginTop: 2 }}>
        Your overall take on the whole weekend — separate from your per-set logs.
      </p>
      <div className="row" style={{ gap: 8, margin: "12px 0" }}>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ width: 120 }}>
          {OPTIONS.map((o) => (
            <option key={o} value={o}>{o === 0 ? "No rating" : `★ ${o}`}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="faint" style={{ fontSize: 13 }}>Saved ✓</span>}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="How was the trip overall?"
      />
    </div>
  );
}
