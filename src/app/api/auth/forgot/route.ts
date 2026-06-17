import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signResetToken } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Enter your email." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same way so we don't reveal which emails are registered.
  let devLink: string | undefined;
  if (user) {
    const token = await signResetToken(user.id, user.passwordHash);
    const origin = new URL(req.url).origin;
    const link = `${origin}/reset?token=${token}`;
    const sent = await sendEmail({
      to: email,
      subject: "Reset your Encore password",
      html: `<p>Hi ${user.displayName},</p><p>Reset your password with the link below (valid for 1 hour):</p><p><a href="${link}">Reset password</a></p><p>If you didn't request this, ignore this email.</p>`,
    });
    // No email provider configured (dev): return the link so the flow is usable.
    if (!sent && process.env.NODE_ENV !== "production") devLink = link;
  }

  return NextResponse.json({ ok: true, devLink });
}
