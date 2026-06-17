// Minimal mailer. Uses Resend when RESEND_API_KEY is set; otherwise logs the
// message (dev) so flows are testable without an email provider.
type SendArgs = { to: string; subject: string; html: string };

export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[mail:dev] to=${to} subject="${subject}"`);
    return false;
  }
  const from = process.env.RESEND_FROM ?? "Encore <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error("Resend error:", res.status, await res.text().catch(() => ""));
  return res.ok;
}
