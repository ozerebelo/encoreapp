"use client";

import { useRef, useState } from "react";

export function ImageUploader({
  label,
  multiple = false,
  value,
  onChange,
}: {
  label: string;
  multiple?: boolean;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) uploaded.push(data.url);
      else setError(data.error ?? "Upload failed.");
    }
    onChange(multiple ? [...value, ...uploaded] : uploaded.slice(0, 1));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ gap: 10 }}>
        {value.map((url) => (
          <div key={url} style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 9, border: "1px solid var(--border)" }} />
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="Remove"
              style={{ position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%", border: "none", background: "var(--bg-elev-3)", color: "var(--text)", cursor: "pointer", lineHeight: 1, fontSize: 12 }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{ height: 64 }}
        >
          {busy ? "Uploading…" : value.length ? (multiple ? "+ Add" : "Replace") : "Upload"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => handle(e.target.files)}
        style={{ display: "none" }}
      />
      {error && <p className="error">{error}</p>}
    </div>
  );
}
