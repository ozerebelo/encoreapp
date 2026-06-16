"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    handle: "",
    email: "",
    password: "",
    homeCity: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <h1 style={{ fontSize: 26 }}>Start your stub wall</h1>
        <p className="muted" style={{ marginTop: -4, marginBottom: 20 }}>
          One account, every show you'll ever go to.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Display name</label>
            <input value={form.displayName} onChange={set("displayName")} required />
          </div>
          <div className="field">
            <label>Handle</label>
            <input value={form.handle} onChange={set("handle")} placeholder="e.g. ava" required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" required />
          </div>
          <div className="field">
            <label>Home city <span className="faint">(optional)</span></label>
            <input value={form.homeCity} onChange={set("homeCity")} />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="faint" style={{ marginTop: 18, textAlign: "center", fontSize: 14 }}>
          Already have one? <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}
