"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";

export type CompanionUser = { handle: string; displayName: string; avatarUrl: string | null };

// Autocomplete that tags real Encore users on a log. Free-text companions
// (people not on the platform) stay in the separate attendedWith field.
export function CompanionPicker({
  value,
  onChange,
}: {
  value: CompanionUser[];
  onChange: (v: CompanionUser[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CompanionUser[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      const picked = new Set(value.map((u) => u.handle));
      setResults((data.users ?? []).filter((u: CompanionUser) => !picked.has(u.handle)));
      setOpen(true);
    }, 160);
    return () => clearTimeout(t);
  }, [q, value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function add(u: CompanionUser) {
    onChange([...value, u]);
    setQ("");
    setResults([]);
    setOpen(false);
  }
  function remove(handle: string) {
    onChange(value.filter((u) => u.handle !== handle));
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {value.map((u) => (
            <span key={u.handle} className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              @{u.handle}
              <button
                type="button"
                onClick={() => remove(u.handle)}
                aria-label={`Remove ${u.handle}`}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 15, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="ac" ref={boxRef}>
        <input
          value={q}
          placeholder="Tag people on Encore…"
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
        />
        {open && results.length > 0 && (
          <div className="ac-list">
            {results.map((u) => (
              <div key={u.handle} className="ac-item" onMouseDown={() => add(u)}>
                <Avatar name={u.displayName} src={u.avatarUrl} size={24} />
                <span>
                  {u.displayName} <span className="faint">@{u.handle}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
