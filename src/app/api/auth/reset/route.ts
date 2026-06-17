import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyResetToken, hashPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "");
  const password = String(body?.password ?? "");

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  const userId = await verifyResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });
  await createSession(user.id); // log them straight in
  return NextResponse.json({ handle: user.handle });
}
