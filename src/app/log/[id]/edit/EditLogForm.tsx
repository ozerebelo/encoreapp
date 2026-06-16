"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ImageUploader";
import { StarPicker } from "@/components/StarPicker";

const STANDINGS = [
  { v: "", label: "—" },
  { v: "pit", label: "Pit / barrier" },
  { v: "ga_floor", label: "GA floor" },
  { v: "seated", label: "Seated" },
  { v: "balcony", label: "Balcony" },
  { v: "other", label: "Other" },
];

export function EditLogForm({
  logId,
  handle,
  initial,
}: {
  logId: string;
  handle: string;
  initial: {
    rating: number; standing: string; attendedWith: string; review: string;
    isFavorite: boolean; stubImageUrl: string | null; photos: string[];
  };
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initial.rating);
  const [standing, setStanding] = useState(initial.standing);
  const [attendedWith, setAttendedWith] = useState(initial.attendedWith);
  const [stubImages, setStubImages] = useState<string[]>(initial.stubImageUrl ? [initial.stubImageUrl] : []);
  const [photos, setPhotos] = useState<string[]>(initial.photos);
  const [review, setReview] = useState(initial.review);
  const [isFavorite, setIsFavorite] = useState(initial.isFavorite);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/logs/${logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: rating || null, standing: standing || null, attendedWith,
        stubImageUrl: stubImages[0] ?? null, photos, review, isFavorite,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Could not save."); return; }
    router.push(`/u/${handle}`);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this log? This can't be undone.")) return;
    await fetch(`/api/logs/${logId}`, { method: "DELETE" });
    router.push(`/u/${handle}`);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card" style={{ marginTop: 20 }}>
      <div className="field">
        <label>Rating</label>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div className="row" style={{ gap: 16 }}>
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Where you stood</label>
          <select value={standing} onChange={(e) => setStanding(e.target.value)}>
            {STANDINGS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Who you went with</label>
          <input value={attendedWith} onChange={(e) => setAttendedWith(e.target.value)} />
        </div>
      </div>
      <ImageUploader label="Ticket stub" value={stubImages} onChange={setStubImages} />
      <ImageUploader label="Photos from the night" multiple value={photos} onChange={setPhotos} />
      <div className="field">
        <label>Notes / review</label>
        <textarea value={review} onChange={(e) => setReview(e.target.value)} />
      </div>
      <label className="row" style={{ gap: 8, cursor: "pointer", marginBottom: 16 }}>
        <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} style={{ width: "auto" }} />
        <span>♥ Mark as a favorite show</span>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="spread">
        <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        <button type="button" onClick={remove} className="faint" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>Delete log</button>
      </div>
    </form>
  );
}
