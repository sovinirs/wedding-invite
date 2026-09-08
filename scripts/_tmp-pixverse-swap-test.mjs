import { fal } from "@fal-ai/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

fal.config({ credentials: process.env.FAL_KEY });

const SCRATCH = "/private/tmp/claude-501/-Users-vijayramarathinam-Desktop-wedding-invite/cda52bea-a2b5-48da-b1b1-a19f51197321/scratchpad";

async function uploadLocalFile(filePath, mime) {
  const buffer = await readFile(filePath);
  return fal.storage.upload(new Blob([new Uint8Array(buffer)], { type: mime }));
}

async function main() {
  console.log("1. Uploading 5s clip + one real face image (woman)...");
  const [videoUrl, imageUrl] = await Promise.all([
    uploadLocalFile(path.join(SCRATCH, "higgs_last5s.mp4"), "video/mp4"),
    uploadLocalFile("/Users/vijayramarathinam/Downloads/1781648889386.png", "image/png"),
  ]);
  console.log("   video:", videoUrl);
  console.log("   image (bride target face):", imageUrl);

  console.log("2. Submitting Pixverse Swap (person mode, 720p)...");
  const result = await fal.subscribe("fal-ai/pixverse/swap", {
    input: {
      video_url: videoUrl,
      image_url: imageUrl,
      mode: "person",
      resolution: "720p",
    },
    logs: true,
    onQueueUpdate: (update) => {
      console.log("   status:", update.status);
    },
  });

  const video = result.data?.video;
  if (!video?.url) throw new Error("No video URL in result: " + JSON.stringify(result.data));
  console.log("3. Generated video:", video.url);

  const videoRes = await fetch(video.url);
  const outPath = path.join(SCRATCH, "pixverse-swap-output.mp4");
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
