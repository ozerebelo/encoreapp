"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setDevLink(data.devLink ?? null);
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <h1 style={{ fontSize: 26 }}>Reset your password</h1>
        {sent ? (
          <>
            <p className="muted">
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
            </p>
            {devLink && (
              <p className="faint" style={{ fontSize: 13, marginTop: 12 }}>
                Dev mode (no email provider configured) —{" "}
                <a href={devLink} style={{ color: "var(--accent)" }}>open your reset link</a>.
              </p>
            )}
            <p style={{ marginTop: 18 }}>
              <Link href="/login" style={{ color: "var(--accent)" }}>← Back to log in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginTop: -4, marginBottom: 20 }}>
              We&apos;ll send a link to set a new one.
            </p>
            <form onSubmit={submit}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="faint" style={{ marginTop: 18, textAlign: "center", fontSize: 14 }}>
              <Link href="/login" style={{ color: "var(--accent)" }}>Back to log in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
