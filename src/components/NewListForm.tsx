"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewListForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRanked, setIsRanked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, isRanked }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      router.push(`/list/${data.id}`);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        + New list
      </button>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="field">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Best shows of 2024" autoFocus />
      </div>
      <div className="field">
        <label>Description <span className="faint">(optional)</span></label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <label className="row" style={{ gap: 8, cursor: "pointer", marginBottom: 12 }}>
        <input type="checkbox" checked={isRanked} onChange={(e) => setIsRanked(e.target.checked)} style={{ width: "auto" }} />
        <span>Ranked list</span>
      </label>
      <div className="row">
        <button className="btn btn-primary btn-sm" onClick={create} disabled={busy || !title.trim()}>
          {busy ? "Creating…" : "Create list"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
