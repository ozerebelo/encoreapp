"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Results = {
  artists: { id: string; name: string; slug: string; imageUrl: string | null }[];
  users: { handle: string; displayName: string; avatarUrl: string | null }[];
  lists: { id: string; title: string; user: { displayName: string } }[];
};

const EMPTY: Results = { artists: [], users: [], lists: [] };

export function SearchBox() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 1) { setRes(EMPTY); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      setRes(await r.json());
      setOpen(true);
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults = res.artists.length + res.users.length + res.lists.length > 0;

  function go() { setOpen(false); setQ(""); }

  return (
    <div className="ac search-box" ref={boxRef}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
        placeholder="Search…"
        style={{ padding: "7px 12px", fontSize: 14 }}
      />
      {open && hasResults && (
        <div className="ac-list">
          {res.artists.map((a) => (
            <Link key={a.id} href={`/artist/${a.slug}`} className="ac-item" onClick={go}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {a.imageUrl ? <img className="ac-thumb" src={a.imageUrl} alt="" /> : <span className="ac-thumb" />}
              <span>{a.name}</span>
              <span className="faint" style={{ marginLeft: "auto", fontSize: 12 }}>artist</span>
            </Link>
          ))}
          {res.users.map((u) => (
            <Link key={u.handle} href={`/u/${u.handle}`} className="ac-item" onClick={go}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {u.avatarUrl ? <img className="ac-thumb" src={u.avatarUrl} alt="" /> : <span className="ac-thumb" style={{ borderRadius: "50%" }} />}
              <span>{u.displayName} <span className="faint">@{u.handle}</span></span>
              <span className="faint" style={{ marginLeft: "auto", fontSize: 12 }}>person</span>
            </Link>
          ))}
          {res.lists.map((l) => (
            <Link key={l.id} href={`/list/${l.id}`} className="ac-item" onClick={go}>
              <span className="ac-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>≣</span>
              <span>{l.title} <span className="faint">by {l.user.displayName}</span></span>
              <span className="faint" style={{ marginLeft: "auto", fontSize: 12 }}>list</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
