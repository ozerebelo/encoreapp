"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SetlistEntry } from "@/lib/format";
import { ArtistImage } from "@/components/ArtistImage";
import { ImageUploader } from "@/components/ImageUploader";
import { StarPicker } from "@/components/StarPicker";

type Artist = { id: string; name: string; imageUrl: string | null };
type Performance = {
  id: string;
  date: string;
  stage: string | null;
  isHeadliner: boolean;
  artist: string;
  artistImage: string | null;
  eventName: string | null;
  eventType: "concert" | "festival";
  venue: string | null;
  city: string | null;
  setlist: SetlistEntry[];
};

const STANDINGS = [
  { v: "", label: "—" },
  { v: "pit", label: "Pit / barrier" },
  { v: "ga_floor", label: "GA floor" },
  { v: "seated", label: "Seated" },
  { v: "balcony", label: "Balcony" },
  { v: "other", label: "Other" },
];

export function LogForm({ initialPerformanceId }: { initialPerformanceId: string | null }) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [open, setOpen] = useState(false);
  const [artist, setArtist] = useState<Artist | null>(null);

  const [performances, setPerformances] = useState<Performance[]>([]);
  const [perf, setPerf] = useState<Performance | null>(null);
  const [loadingPerfs, setLoadingPerfs] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [perfYear, setPerfYear] = useState("");
  const [perfQuery, setPerfQuery] = useState("");

  const [rating, setRating] = useState(0);
  const [standing, setStanding] = useState("");
  const [attendedWith, setAttendedWith] = useState("");
  const [stubImages, setStubImages] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [review, setReview] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Preselect a performance when deep-linked from a show page.
  useEffect(() => {
    if (!initialPerformanceId) return;
    (async () => {
      const res = await fetch(`/api/performance/${initialPerformanceId}`);
      if (!res.ok) return;
      const p: Performance & { artistId: string } = await res.json();
      setArtist({ id: p.artistId, name: p.artist, imageUrl: p.artistImage });
      setQuery(p.artist);
      setPerf(p);
      setPerformances([p]);
    })();
  }, [initialPerformanceId]);

  useEffect(() => {
    if (artist) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/artists?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.artists ?? []);
      setOpen(true);
    }, 160);
    return () => clearTimeout(t);
  }, [query, artist]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function loadPerformances(artistId: string, year: string, q: string) {
    setLoadingPerfs(true);
    const params = new URLSearchParams({ artistId });
    if (year) params.set("year", year);
    if (q) params.set("q", q);
    const res = await fetch(`/api/performances?${params}`);
    const data = await res.json();
    setPerformances(data.performances ?? []);
    if (Array.isArray(data.years)) setYears(data.years);
    setLoadingPerfs(false);
  }

  async function selectArtist(a: Artist) {
    setArtist(a);
    setQuery(a.name);
    setOpen(false);
    setPerf(null);
    setPerfYear("");
    setPerfQuery("");
    await loadPerformances(a.id, "", "");
  }

  // Refetch the picker when the year/venue filter changes (debounced).
  useEffect(() => {
    if (!artist) return;
    const t = setTimeout(() => loadPerformances(artist.id, perfYear, perfQuery), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfYear, perfQuery]);

  function resetArtist() {
    setArtist(null);
    setPerformances([]);
    setPerf(null);
    setQuery("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!perf) {
      setError("Pick the show you went to.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        performanceId: perf.id,
        rating: rating || null,
        standing: standing || null,
        attendedWith,
        stubImageUrl: stubImages[0] ?? null,
        photos,
        review,
        isFavorite,
        loggedDate: perf.date,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not save.");
      setSubmitting(false);
      return;
    }
    router.push(`/u/${data.handle}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 22 }}>
      {/* Step 1: artist */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: artist ? 0 : 16 }}>
          <label>1 · Artist</label>
          <div className="ac" ref={boxRef}>
            <input
              value={query}
              placeholder="Search artists…"
              onChange={(e) => {
                setQuery(e.target.value);
                if (artist) setArtist(null);
              }}
              onFocus={() => !artist && setOpen(true)}
            />
            {open && !artist && results.length > 0 && (
              <div className="ac-list">
                {results.map((a) => (
                  <div key={a.id} className="ac-item" onMouseDown={() => selectArtist(a)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.imageUrl ? <img className="ac-thumb" src={a.imageUrl} alt="" /> : <span className="ac-thumb" />}
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {artist && (
          <button type="button" className="faint" onClick={resetArtist} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, marginTop: 8 }}>
            ✕ change artist
          </button>
        )}
      </div>

      {/* Step 2: performance */}
      {artist && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>2 · Which show?</label>

          {/* Filters — for artists with lots of shows */}
          {(years.length > 1 || performances.length >= 10 || perfQuery || perfYear) && (
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <select value={perfYear} onChange={(e) => setPerfYear(e.target.value)} style={{ width: "auto" }}>
                <option value="">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <input
                value={perfQuery}
                onChange={(e) => setPerfQuery(e.target.value)}
                placeholder="Filter by venue or city…"
                style={{ flex: 1, minWidth: 160 }}
              />
            </div>
          )}

          {loadingPerfs ? (
            <p className="muted">Finding {artist.name}&apos;s performances…</p>
          ) : performances.length === 0 ? (
            <p className="muted">No catalogued performances for {artist.name} yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {performances.map((p) => {
                const selected = perf?.id === p.id;
                return (
                  <button type="button" key={p.id} onClick={() => setPerf(p)} className="card" style={{
                    textAlign: "left", cursor: "pointer",
                    borderColor: selected ? "var(--accent)" : "var(--border)",
                    boxShadow: selected ? "0 0 0 3px var(--accent-glow)" : "none",
                    background: selected ? "var(--bg-elev-2)" : "var(--bg-elev)", padding: 14,
                  }}>
                    <div className="spread">
                      <div>
                        <strong>{p.venue ?? p.eventName ?? "Unknown venue"}</strong>
                        {p.city && <span className="muted"> · {p.city}</span>}
                      </div>
                      <span className="faint" style={{ fontSize: 13 }}>
                        {new Date(p.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                      </span>
                    </div>
                    <div className="row" style={{ marginTop: 6, gap: 6 }}>
                      {p.eventType === "festival" && <span className="pill">🎪 {p.eventName}</span>}
                      {p.stage && <span className="pill">{p.stage}</span>}
                      {p.isHeadliner && <span className="pill">headliner</span>}
                      <span className="pill">🎵 {p.setlist.length} songs</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Setlist + memory */}
      {perf && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="spread">
              <strong>Setlist</strong>
              <span className="faint" style={{ fontSize: 12 }}>auto-filled from the catalogue</span>
            </div>
            {perf.setlist.length === 0 ? (
              <p className="muted">No setlist on file.</p>
            ) : (
              <ol className="setlist">
                {perf.setlist.map((s, i) => (
                  <li key={i} className={s.is_encore ? "encore" : ""}>{s.song}</li>
                ))}
              </ol>
            )}
          </div>

          <div className="card">
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>3 · Your memory</label>

            <div className="field" style={{ marginTop: 14 }}>
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
                <input value={attendedWith} onChange={(e) => setAttendedWith(e.target.value)} placeholder="e.g. Sam" />
              </div>
            </div>

            <ImageUploader label="Ticket stub" value={stubImages} onChange={setStubImages} />
            <ImageUploader label="Photos from the night" multiple value={photos} onChange={setPhotos} />

            <div className="field">
              <label>Notes / review</label>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="What do you want to remember about this night?" />
            </div>

            <label className="row" style={{ gap: 8, cursor: "pointer", marginBottom: 16 }}>
              <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} style={{ width: "auto" }} />
              <span>♥ Mark as a favorite show</span>
            </label>

            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
              {submitting ? "Saving…" : "Add to my stub wall"}
            </button>
          </div>
        </>
      )}

      {error && !perf && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
    </form>
  );
}
