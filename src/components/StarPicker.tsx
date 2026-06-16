"use client";

import { useState } from "react";

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="row" style={{ gap: 2 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const full = shown >= star;
        const half = !full && shown >= star - 0.5;
        return (
          <span key={star} style={{ position: "relative", width: 30, fontSize: 28, lineHeight: 1 }}>
            <span style={{ color: "var(--border)" }}>★</span>
            {(full || half) && (
              <span style={{ position: "absolute", top: 0, left: 0, width: half ? "50%" : "100%", overflow: "hidden", color: "var(--star)" }}>★</span>
            )}
            <button type="button" aria-label={`${star - 0.5} stars`} onMouseEnter={() => setHover(star - 0.5)} onClick={() => onChange(star - 0.5)}
              style={{ position: "absolute", inset: 0, width: "50%", background: "none", border: "none", cursor: "pointer", padding: 0 }} />
            <button type="button" aria-label={`${star} stars`} onMouseEnter={() => setHover(star)} onClick={() => onChange(star)}
              style={{ position: "absolute", inset: 0, left: "50%", width: "50%", background: "none", border: "none", cursor: "pointer", padding: 0 }} />
          </span>
        );
      })}
      {value > 0 && (
        <button type="button" className="faint" onClick={() => onChange(0)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, fontSize: 13 }}>
          clear
        </button>
      )}
    </div>
  );
}
