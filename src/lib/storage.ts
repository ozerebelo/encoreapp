import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX = 6 * 1024 * 1024; // 6 MB

export type SaveResult = { url: string } | { error: string; status: number };

/**
 * Persist an uploaded image and return its public URL.
 * - Production (BLOB_READ_WRITE_TOKEN set): Vercel Blob object storage.
 * - Local dev: public/uploads on disk.
 * Vercel's filesystem is ephemeral, so disk is dev-only.
 */
export async function saveImage(file: File): Promise<SaveResult> {
  if (!ALLOWED.has(file.type)) return { error: "Use a JPG, PNG, WEBP or GIF.", status: 415 };
  if (file.size > MAX) return { error: "Max 6 MB.", status: 413 };

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const key = `${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${key}`, file, { access: "public", contentType: file.type });
    return { url: blob.url };
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${key}` };
}
