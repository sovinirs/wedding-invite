import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { putFile, putBuffer } from "../storage";
import { falConfigured, downloadToBuffer } from "../fal";
import { swapFaces } from "./faceSwap";
import type { AttireLook } from "../attire";

const execFileAsync = promisify(execFile);

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Not a base64 image data URL");
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  return { buffer: Buffer.from(match[2], "base64"), ext };
}

type ComposeInput = {
  templateId: string;
  bridePhotoDataUrl: string;
  groomPhotoDataUrl: string;
  brideLook: AttireLook | null;
  groomLook: AttireLook | null;
  inviteId: string;
  jobId: string;
};

/**
 * The "first frame" is just the plain venue still with no one on it —
 * already on disk, no compositing needed either way.
 *
 * The "last frame" has two implementations:
 *  - with FAL_KEY: a real fal.ai face swap (see faceSwap.ts) against a
 *    per-venue base-plate photo (public/templates/<id>/baseplate.jpg) — an
 *    AI-generated front-facing couple portrait staged for that venue, since
 *    real per-venue×attire photography doesn't exist. The swap target is
 *    the base-plate, NOT the venue poster (which has no people in it).
 *  - without it: an ffmpeg photo overlay — an honest placeholder that
 *    doesn't pretend to be a face swap.
 */
export async function composeFrames(input: ComposeInput): Promise<{ firstFrameUrl: string; lastFrameUrl: string }> {
  const backgroundPath = path.join(process.cwd(), "public", "templates", input.templateId, "poster.jpg");
  const firstFrameUrl = await putFile(`${input.inviteId}/${input.jobId}/first-frame.jpg`, backgroundPath);

  const lastFrameUrl = falConfigured()
    ? await composeLastFrameReal(input)
    : await composeLastFrameMock(input, backgroundPath);

  return { firstFrameUrl, lastFrameUrl };
}

async function composeLastFrameReal(input: ComposeInput): Promise<string> {
  const basePlateUrl = `/templates/${input.templateId}/baseplate.jpg`;
  const { imageUrl } = await swapFaces({
    targetImageUrl: basePlateUrl,
    brideFaceDataUrl: input.bridePhotoDataUrl,
    groomFaceDataUrl: input.groomPhotoDataUrl,
  });
  // Pull the result into our own storage — fal's own retention isn't
  // meant for assets we serve indefinitely.
  const buffer = await downloadToBuffer(imageUrl);
  return putBuffer(`${input.inviteId}/${input.jobId}/last-frame.jpg`, buffer);
}

async function composeLastFrameMock(input: ComposeInput, backgroundPath: string): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "invite-gen-"));
  try {
    const bride = dataUrlToBuffer(input.bridePhotoDataUrl);
    const groom = dataUrlToBuffer(input.groomPhotoDataUrl);
    const bridePath = path.join(workDir, `bride.${bride.ext}`);
    const groomPath = path.join(workDir, `groom.${groom.ext}`);
    await writeFile(bridePath, bride.buffer);
    await writeFile(groomPath, groom.buffer);

    const lastFrameOut = path.join(workDir, "last-frame.jpg");
    const brideColor = hexToFfmpegColor(input.brideLook?.color ?? "#c9956a");
    const groomColor = hexToFfmpegColor(input.groomLook?.color ?? "#2b1710");

    await execFileAsync("ffmpeg", [
      "-y",
      "-i", backgroundPath,
      "-i", bridePath,
      "-i", groomPath,
      "-filter_complex",
      `[1:v]scale=280:280:force_original_aspect_ratio=increase,crop=280:280,pad=294:294:7:7:color=${brideColor}[bride_p];` +
        `[2:v]scale=280:280:force_original_aspect_ratio=increase,crop=280:280,pad=294:294:7:7:color=${groomColor}[groom_p];` +
        `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[bg];` +
        `[bg][bride_p]overlay=x=W*0.28-147:y=H*0.6-147[tmp1];` +
        `[tmp1][groom_p]overlay=x=W*0.72-147:y=H*0.6-147[out]`,
      "-map", "[out]",
      "-frames:v", "1",
      "-update", "1",
      lastFrameOut,
    ]);

    return putFile(`${input.inviteId}/${input.jobId}/last-frame.jpg`, lastFrameOut);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function hexToFfmpegColor(hex: string): string {
  return `0x${hex.replace("#", "")}`;
}
