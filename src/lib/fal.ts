import "server-only";
import { readFile } from "node:fs/promises";
import { fal } from "@fal-ai/client";
import { urlToStoragePath } from "./storage";

let configured = false;

/** Lazily configures the fal client from FAL_KEY the first time it's needed. */
export function getFalClient() {
  if (!configured) {
    fal.config({ credentials: process.env.FAL_KEY });
    configured = true;
  }
  return fal;
}

export function falConfigured(): boolean {
  return Boolean(process.env.FAL_KEY);
}

/** Uploads a file from our own local storage to fal's storage, returning a URL fal's servers can fetch. */
export async function uploadLocalImageToFal(url: string): Promise<string> {
  const filePath = urlToStoragePath(url);
  const buffer = await readFile(filePath);
  return getFalClient().storage.upload(new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }));
}

/** Uploads a base64 data URL (e.g. an uploaded FacePhoto) to fal's storage. */
export async function uploadDataUrlToFal(dataUrl: string): Promise<string> {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Not a base64 image data URL");
  const buffer = Buffer.from(match[2], "base64");
  return getFalClient().storage.upload(new Blob([new Uint8Array(buffer)], { type: match[1] }));
}

/** Downloads a fal-hosted result into our own storage, so it isn't subject to fal's own retention policy. */
export async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
