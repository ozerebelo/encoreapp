"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    router.push(`/u/${data.handle}`);
    router.refresh();
  }

  if (!token) {
    return <p className="muted">This link is missing its token. <Link href="/forgot" style={{ color: "var(--accent)" }}>Request a new one</Link>.</p>;
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>New password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
        {loading ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <h1 style={{ fontSize: 26 }}>Choose a new password</h1>
        <p className="muted" style={{ marginTop: -4, marginBottom: 20 }}>You&apos;ll be logged in right after.</p>
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
