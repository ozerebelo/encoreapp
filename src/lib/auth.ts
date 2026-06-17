import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const COOKIE = "lm_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "insecure-dev-secret"
);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

async function signToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function createSession(userId: string): Promise<void> {
  const token = await signToken(userId);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Returns the logged-in user, or null. Cached per request is fine for MVP. */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = payload.uid as string | undefined;
    if (!uid) return null;
    return prisma.user.findUnique({ where: { id: uid } });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

// --- Password reset (stateless): token embeds a fingerprint of the current
// password hash, so it stops working the moment the password changes. ---
export async function signResetToken(userId: string, passwordHash: string): Promise<string> {
  return new SignJWT({ uid: userId, fp: passwordHash.slice(0, 16) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

export async function verifyResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = payload.uid as string | undefined;
    const fp = payload.fp as string | undefined;
    if (!uid || !fp) return null;
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user || user.passwordHash.slice(0, 16) !== fp) return null;
    return uid;
  } catch {
    return null;
  }
}
