"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";

type Comment = {
  id: string;
  body: string;
  createdAt: string | Date;
  user: { handle: string; displayName: string; avatarUrl: string | null };
};

export function LogInteractions({
  logId,
  initialLikes,
  initialLiked,
  initialComments,
  me,
}: {
  logId: string;
  initialLikes: number;
  initialLiked: boolean;
  initialComments: Comment[];
  me: { handle: string; displayName: string; avatarUrl: string | null } | null;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    if (!me) return;
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId }),
    });
    const data = await res.json();
    if (res.ok) { setLiked(data.liked); setLikes(data.count); }
  }

  async function addComment() {
    if (!draft.trim() || !me) return;
    setBusy(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId, body: draft }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setComments((c) => [...c, data]);
      setDraft("");
    }
  }

  async function removeComment(id: string) {
    setComments((c) => c.filter((x) => x.id !== id));
    await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div className="row" style={{ gap: 16 }}>
        <button
          onClick={toggleLike}
          disabled={!me}
          className="row"
          style={{ gap: 6, background: "none", border: "none", cursor: me ? "pointer" : "default", color: liked ? "var(--accent-2)" : "var(--text-dim)", fontSize: 14, padding: 0 }}
        >
          <span style={{ fontSize: 16 }}>{liked ? "♥" : "♡"}</span>
          {likes > 0 && likes}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="row"
          style={{ gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 14, padding: 0 }}
        >
          💬 {comments.length > 0 ? comments.length : "Comment"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          {comments.map((c) => (
            <div key={c.id} className="row" style={{ gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
              <Avatar name={c.user.displayName} src={c.user.avatarUrl} size={26} />
              <div style={{ flex: 1 }}>
                <Link href={`/u/${c.user.handle}`}><strong style={{ fontSize: 13 }}>{c.user.displayName}</strong></Link>
                <span className="muted" style={{ fontSize: 14 }}> {c.body}</span>
                {me?.handle === c.user.handle && (
                  <button onClick={() => removeComment(c.id)} className="faint" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, marginLeft: 8 }}>delete</button>
                )}
              </div>
            </div>
          ))}
          {me ? (
            <div className="row" style={{ gap: 8 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
                placeholder="Add a comment…"
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost btn-sm" onClick={addComment} disabled={busy || !draft.trim()}>Post</button>
            </div>
          ) : (
            <p className="faint" style={{ fontSize: 13 }}><Link href="/login" style={{ color: "var(--accent)" }}>Sign in</Link> to comment.</p>
          )}
        </div>
      )}
    </div>
  );
}
