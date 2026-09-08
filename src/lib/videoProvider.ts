import "server-only";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { storageKeyToUrl, urlToStoragePath } from "./storage";
import { getFalClient, falConfigured, uploadLocalImageToFal } from "./fal";

/**
 * The one seam between this app and whatever actually generates video.
 * Confirmed via fal.ai's catalog: Veo 3.1's first-last-frame endpoint takes
 * a first frame, a last frame, and a TEXT PROMPT describing the motion —
 * not a motion-reference video as a third input. So the "blockout video as
 * motion reference" idea from the original brief doesn't apply to this
 * provider; motion is described in words instead (see FalVideoProvider's
 * prompt). motionRefUrl stays in the interface as optional, in case a
 * future provider does accept one.
 */
export interface VideoGenerationProvider {
  submit(input: { firstFrameUrl: string; lastFrameUrl: string; motionRefUrl?: string }): Promise<{
    providerRef: string;
  }>;
  poll(providerRef: string): Promise<
    | { status: "processing" }
    | { status: "succeeded"; videoUrl: string }
    | { status: "failed"; error: string }
  >;
}

/** Key prefix (under the storage root) where the mock provider's own job working directories live. */
const JOBS_KEY_PREFIX = "_provider-jobs";

function jobFsDir(providerRef: string): string {
  return path.join(process.cwd(), "public", "generated", JOBS_KEY_PREFIX, providerRef);
}

/**
 * Stands in for the real video model: crossfades between the first and
 * last frame with a slow zoom, using ffmpeg. This is a genuine async job,
 * not a synchronous fake — submit() kicks off a detached ffmpeg process
 * and returns immediately; poll() checks the filesystem for what that
 * process produced. That shape (submit now, poll later) is what makes the
 * rest of the pipeline's "queued job, not a request handler" design
 * actually exercised, rather than simulated.
 */
export class MockVideoProvider implements VideoGenerationProvider {
  async submit(input: { firstFrameUrl: string; lastFrameUrl: string }): Promise<{ providerRef: string }> {
    const providerRef = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const jobDir = jobFsDir(providerRef);
    await mkdir(jobDir, { recursive: true });

    const firstFramePath = urlToStoragePath(input.firstFrameUrl);
    const lastFramePath = urlToStoragePath(input.lastFrameUrl);
    const outputPath = path.join(jobDir, "output.mp4");
    const errorPath = path.join(jobDir, "error.txt");

    const args = [
      "-y",
      "-loop", "1", "-t", "4", "-i", firstFramePath,
      "-loop", "1", "-t", "4", "-i", lastFramePath,
      "-filter_complex",
      // fps must come AFTER zoompan, not before: zoompan re-derives its
      // output timebase from d=1 rather than the input's, so an fps filter
      // upstream of it doesn't survive — leaving the two chains on
      // mismatched timebases, which xfade refuses to join.
      "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0006,1.08)':d=1:s=1280x720,fps=24[v0];" +
        "[1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=24[v1];" +
        "[v0][v1]xfade=transition=fade:duration=1.2:offset=2.6[out]",
      "-map", "[out]",
      "-t", "5.5",
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-an",
      outputPath,
    ];

    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"], detached: true });
    child.unref();
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", async (err) => {
      await writeFile(errorPath, String(err?.message ?? err)).catch(() => {});
    });
    child.on("exit", async (code) => {
      if (code !== 0) {
        await writeFile(errorPath, `ffmpeg exited with code ${code}\n${stderr.slice(-2000)}`).catch(() => {});
      }
    });

    return { providerRef };
  }

  async poll(providerRef: string) {
    const jobDir = jobFsDir(providerRef);
    const outputPath = path.join(jobDir, "output.mp4");
    const errorPath = path.join(jobDir, "error.txt");

    if (await exists(errorPath)) {
      return { status: "failed" as const, error: await readFile(errorPath, "utf-8") };
    }
    if (await exists(outputPath)) {
      return {
        status: "succeeded" as const,
        videoUrl: storageKeyToUrl(`${JOBS_KEY_PREFIX}/${providerRef}/output.mp4`),
      };
    }
    return { status: "processing" as const };
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Fast/cheap variant by default — swap for the full fal-ai/veo3.1/first-last-frame-to-video for higher quality. */
const VEO_ENDPOINT = "fal-ai/veo3.1/fast/first-last-frame-to-video";

const MOTION_PROMPT =
  "Slow, elegant cinematic camera drift forward through the scene, gentle dissolve from the " +
  "first image into the second, warm romantic wedding-film mood, soft natural light, no text or watermarks.";

/**
 * The real thing: Google's Veo 3.1 via fal.ai. Images have to be fetched by
 * fal's servers, so local files (this app's own storage — see storage.ts)
 * get uploaded to fal's storage first; only then are they usable as
 * first_frame_url/last_frame_url. The result is a remote fal.media URL,
 * which the mandatory all-intra re-encode step (encode.ts) reads directly
 * — ffmpeg speaks https natively, no download step needed.
 */
export class FalVideoProvider implements VideoGenerationProvider {
  async submit(input: { firstFrameUrl: string; lastFrameUrl: string }): Promise<{ providerRef: string }> {
    const fal = getFalClient();
    const [firstFrameUrl, lastFrameUrl] = await Promise.all([
      uploadLocalImageToFal(input.firstFrameUrl),
      uploadLocalImageToFal(input.lastFrameUrl),
    ]);

    const { request_id } = await fal.queue.submit(VEO_ENDPOINT, {
      input: {
        prompt: MOTION_PROMPT,
        first_frame_url: firstFrameUrl,
        last_frame_url: lastFrameUrl,
        duration: "4s",
        resolution: "720p",
        aspect_ratio: "16:9",
        generate_audio: false,
      },
    });

    return { providerRef: request_id };
  }

  async poll(providerRef: string) {
    const fal = getFalClient();
    const status = await fal.queue.status(VEO_ENDPOINT, { requestId: providerRef, logs: false });
    if (status.status !== "COMPLETED") return { status: "processing" as const };

    const result = await fal.queue.result(VEO_ENDPOINT, { requestId: providerRef });
    const data = result.data as { video?: { url?: string } };
    if (!data.video?.url) {
      return { status: "failed" as const, error: "fal returned no video URL" };
    }
    return { status: "succeeded" as const, videoUrl: data.video.url };
  }
}

export const videoProvider: VideoGenerationProvider = falConfigured()
  ? new FalVideoProvider()
  : new MockVideoProvider();
