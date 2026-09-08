import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { putFile, urlToStoragePath } from "../storage";

const execFileAsync = promisify(execFile);

/**
 * NON-NEGOTIABLE: every frame must be independently decodable. The invite
 * page drives playback position from scroll offset — with a normal GOP the
 * browser decodes from the last keyframe on every seek and the scroll
 * judders. -g 1 -keyint_min 1 makes every frame a keyframe. Whatever the
 * provider returns as "raw" always passes through this before it's ever
 * served, regardless of provider.
 */
export async function encodeAllIntra(input: {
  rawVideoUrl: string;
  inviteId: string;
  jobId: string;
}): Promise<{ finalVideoUrl: string }> {
  // A real provider's output is a remote URL (e.g. fal.media) — ffmpeg
  // reads https input directly, no download step needed. Only resolve to
  // a local path for URLs that are actually ours (the mock provider).
  const rawInput = /^https?:\/\//.test(input.rawVideoUrl)
    ? input.rawVideoUrl
    : urlToStoragePath(input.rawVideoUrl);
  const workDir = await mkdtemp(path.join(tmpdir(), "invite-encode-"));

  try {
    const outPath = path.join(workDir, "final.mp4");
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", rawInput,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "23",
      "-g", "1",
      "-keyint_min", "1",
      "-sc_threshold", "0",
      "-bf", "0",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-an",
      outPath,
    ]);

    const finalVideoUrl = await putFile(`${input.inviteId}/${input.jobId}/final.mp4`, outPath);
    return { finalVideoUrl };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
