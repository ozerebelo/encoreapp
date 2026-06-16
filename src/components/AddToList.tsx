"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddToList({
  performanceId,
  lists,
}: {
  performanceId: string;
  lists: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function add(listId: string) {
    await fetch(`/api/lists/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ performanceId }),
    });
    setDone(listId);
    setOpen(false);
    router.refresh();
  }

  if (lists.length === 0) return null;

  return (
    <div className="ac" style={{ display: "inline-block" }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>
        + Add to list
      </button>
      {open && (
        <div className="ac-list" style={{ minWidth: 220 }}>
          {lists.map((l) => (
            <div key={l.id} className="ac-item" onClick={() => add(l.id)}>
              {l.title}
            </div>
          ))}
        </div>
      )}
      {done && <span className="faint" style={{ marginLeft: 8, fontSize: 13 }}>Added ✓</span>}
    </div>
  );
}
