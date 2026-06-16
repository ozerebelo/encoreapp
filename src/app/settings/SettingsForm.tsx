"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ImageUploader";

export function SettingsForm({
  initial,
}: {
  initial: { handle: string; displayName: string; bio: string | null; homeCity: string | null; avatarUrl: string | null };
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [homeCity, setHomeCity] = useState(initial.homeCity ?? "");
  const [avatar, setAvatar] = useState<string[]>(initial.avatarUrl ? [initial.avatarUrl] : []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio, homeCity, avatarUrl: avatar[0] ?? "" }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Could not save."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card" style={{ marginTop: 16 }}>
      <ImageUploader label="Avatar" value={avatar} onChange={setAvatar} />
      <div className="field">
        <label>Display name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="field">
        <label>Handle</label>
        <input value={`@${initial.handle}`} disabled />
      </div>
      <div className="field">
        <label>Home city</label>
        <input value={homeCity} onChange={(e) => setHomeCity(e.target.value)} placeholder="e.g. London" />
      </div>
      <div className="field">
        <label>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        {saved && <span className="faint" style={{ fontSize: 14 }}>Saved ✓</span>}
      </div>
    </form>
  );
}
