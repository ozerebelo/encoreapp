"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ava@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    router.push("/feed");
    router.refresh();
  }

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <h1 style={{ fontSize: 26 }}>Welcome back</h1>
        <p className="muted" style={{ marginTop: -4, marginBottom: 20 }}>
          Pick up where your last show left off.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <div className="spread">
              <label>Password</label>
              <Link href="/forgot" className="faint" style={{ fontSize: 13 }}>Forgot?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="faint" style={{ marginTop: 18, textAlign: "center", fontSize: 14 }}>
          New here? <Link href="/signup" style={{ color: "var(--accent)" }}>Create an account</Link>
        </p>
      </div>
    </main>
  );
}
