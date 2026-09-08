import { fal } from "@fal-ai/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

fal.config({ credentials: process.env.FAL_KEY });

const SCRATCH = "/private/tmp/claude-501/-Users-vijayramarathinam-Desktop-wedding-invite/cda52bea-a2b5-48da-b1b1-a19f51197321/scratchpad";

async function uploadLocalFile(filePath, mime) {
  const buffer = await readFile(filePath);
  return fal.storage.upload(new Blob([new Uint8Array(buffer)], { type: mime }));
}

const REF_DIR = "/Users/vijayramarathinam/Desktop/wedding-invite/public/reference";

async function main() {
  console.log("1. Uploading source block-out video + reference images...");
  const [videoUrl, coupleUrl, exteriorUrl, interiorUrl] = await Promise.all([
    uploadLocalFile(path.join(SCRATCH, "blockout_16fps.mp4"), "video/mp4"),
    uploadLocalFile(path.join(SCRATCH, "couple-composite.jpg"), "image/jpeg"),
    uploadLocalFile(path.join(REF_DIR, "venue-exterior/temple1-gopuram-still.png"), "image/png"),
    uploadLocalFile(path.join(REF_DIR, "venue-interior/Gemini_Generated_Image_rmak03rmak03rmak.jpeg"), "image/jpeg"),
  ]);
  const refImageUrl = [exteriorUrl, interiorUrl, coupleUrl];
  console.log("   video:", videoUrl);
  console.log("   ref images:", refImageUrl);

  console.log("2. Submitting Wan VACE 14B depth job (480p, cheap validation test)...");
  const result = await fal.subscribe("fal-ai/wan-vace-14b/depth", {
    input: {
      video_url: videoUrl,
      ref_image_urls: refImageUrl,
      prompt:
        "Photorealistic cinematic wedding film matching the reference photos exactly: the same carved South " +
        "Indian stone gopuram temple tower and stone corridor from the exterior reference photo, opening into " +
        "the same ornate temple mandap interior from the interior reference photo, with carved gold pillars, " +
        "red and gold drapery, garlands, and warm lamplight. Slow forward camera dolly moving through the " +
        "corridor and arriving at a bride and groom standing together facing the camera. Bride wears a red and " +
        "gold silk saree with temple jewelry, groom wears a cream and gold silk veshti. Warm golden hour " +
        "lighting, soft shallow depth of field, real wedding photography look, no text or watermark.",
      negative_prompt:
        "cartoon, 3d render, low-poly, stick figure, cgi, blocky, video game, gray, untextured, letterboxing, borders",
      resolution: "480p",
      frames_per_second: 16,
      num_frames: 240,
    },
    logs: true,
    onQueueUpdate: (update) => {
      console.log("   status:", update.status);
    },
  });

  const video = result.data?.video;
  if (!video?.url) throw new Error("No video URL in result: " + JSON.stringify(result.data));
  console.log("3. Generated video:", video.url, "duration:", video.duration);

  const videoRes = await fetch(video.url);
  const outPath = path.join(SCRATCH, "vace-output.mp4");
  await writeFile(outPath, Buffer.from(await videoRes.arrayBuffer()));
  console.log("   saved ->", outPath);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED:", err?.message);
    console.error("body:", JSON.stringify(err?.body, null, 2));
    process.exit(1);
  });
