import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const displayName = String(body.displayName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  let handle = slugify(String(body.handle ?? "")) || slugify(displayName);
  const homeCity = body.homeCity ? String(body.homeCity).trim() : null;

  if (!displayName || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }
  if (!handle) {
    return NextResponse.json({ error: "Pick a handle." }, { status: 400 });
  }

  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { handle }] },
    select: { email: true, handle: true },
  });
  if (clash) {
    const field = clash.email === email ? "email" : "handle";
    return NextResponse.json(
      { error: `That ${field} is already taken.` },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      handle,
      displayName,
      email,
      homeCity,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession(user.id);
  return NextResponse.json({ handle: user.handle });
}
