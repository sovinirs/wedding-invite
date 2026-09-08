import "server-only";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where generation-pipeline artifacts (composited frames, raw and final
 * video, poster stills) get written and served from.
 *
 * This is local-disk storage under /public/generated — genuinely
 * functional today, but NOT appropriate for production on Vercel: that
 * filesystem is ephemeral per-invocation (see the datasource comment in
 * schema.prisma making the same point about Postgres vs SQLite). It exists
 * so the rest of the pipeline (state machine, re-encode step, UI) can be
 * built and demoed for real right now.
 *
 * Swapping in a real object-storage provider (Vercel Blob / S3 / R2) later
 * means replacing the two functions below — nothing else in the pipeline
 * needs to change, since every caller only ever sees the returned URL.
 */
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const GENERATED_DIR = "generated";

function keyToFsPath(key: string): string {
  return path.join(PUBLIC_ROOT, GENERATED_DIR, key);
}

export function storageKeyToUrl(key: string): string {
  return `/${GENERATED_DIR}/${key}`;
}

export async function putFile(key: string, sourceFilePath: string): Promise<string> {
  const dest = keyToFsPath(key);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(sourceFilePath, dest);
  return storageKeyToUrl(key);
}

export async function putBuffer(key: string, data: Buffer): Promise<string> {
  const dest = keyToFsPath(key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
  return storageKeyToUrl(key);
}

/** Absolute filesystem path for a storage key — for feeding local tools (ffmpeg) that need a real path, not a URL. */
export function storagePathFor(key: string): string {
  return keyToFsPath(key);
}

/**
 * Resolves ANY /public-relative URL to a real filesystem path — not just
 * ones this module wrote. The pipeline's "first frame" today is a static
 * template poster (/templates/<id>/poster.jpg), not a generated asset, and
 * still needs to become a real path for ffmpeg to read.
 */
export function urlToStoragePath(url: string): string {
  return path.join(PUBLIC_ROOT, url);
}
