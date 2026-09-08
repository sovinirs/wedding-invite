import { fal } from "@fal-ai/client";
import { PrismaClient } from "@prisma/client";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

fal.config({ credentials: process.env.FAL_KEY });
const db = new PrismaClient();

const SCRATCH = "/private/tmp/claude-501/-Users-vijayramarathinam-Desktop-wedding-invite/cda52bea-a2b5-48da-b1b1-a19f51197321/scratchpad";
const INVITE_ID = "cmtkyy8av00020dvit4kek2rs";

async function uploadDataUrl(dataUrl) {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  const buffer = Buffer.from(match[2], "base64");
  return fal.storage.upload(new Blob([new Uint8Array(buffer)], { type: match[1] }));
}

async function uploadLocalFile(filePath, mime) {
  const buffer = await readFile(filePath);
  return fal.storage.upload(new Blob([new Uint8Array(buffer)], { type: mime }));
}

async function main() {
  console.log("1. Loading bride/groom photos from DB...");
  const [bride, groom] = await Promise.all([
    db.facePhoto.findFirst({ where: { inviteId: INVITE_ID, role: "BRIDE" }, orderBy: { createdAt: "asc" } }),
    db.facePhoto.findFirst({ where: { inviteId: INVITE_ID, role: "GROOM" }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!bride || !groom) throw new Error("Missing bride/groom photos");

  console.log("2. Uploading base-plate + faces to fal...");
  const basePlatePath = path.join(process.cwd(), "public", "templates", "temple-1", "baseplate.jpg");
  const [baseUrl, brideUrl, groomUrl] = await Promise.all([
    uploadLocalFile(basePlatePath, "image/jpeg"),
    uploadDataUrl(bride.storageUrl),
    uploadDataUrl(groom.storageUrl),
  ]);

  console.log("3. Face-swapping bride onto base-plate...");
  const afterBride = await fal.subscribe("fal-ai/face-swap", {
    input: { base_image_url: baseUrl, swap_image_url: brideUrl },
  });
  const brideSwappedUrl = afterBride.data?.image?.url;
  if (!brideSwappedUrl) throw new Error("Bride swap failed: " + JSON.stringify(afterBride.data));

  console.log("4. Face-swapping groom onto result...");
  const afterGroom = await fal.subscribe("fal-ai/face-swap", {
    input: { base_image_url: brideSwappedUrl, swap_image_url: groomUrl },
  });
  const finalImageUrl = afterGroom.data?.image?.url;
  if (!finalImageUrl) throw new Error("Groom swap failed: " + JSON.stringify(afterGroom.data));
  console.log("   Composite couple photo:", finalImageUrl);

  const compositeRes = await fetch(finalImageUrl);
  await writeFile(path.join(SCRATCH, "couple-composite.jpg"), Buffer.from(await compositeRes.arrayBuffer()));

  console.log("5. Uploading trimmed block-out reference video to fal...");
  const motionVideoUrl = await uploadLocalFile(path.join(SCRATCH, "blockout_10s.mp4"), "video/mp4");
  console.log("   motion video:", motionVideoUrl);

  console.log("6. Submitting Kling v2.6 motion-control job...");
  const result = await fal.subscribe("fal-ai/kling-video/v2.6/standard/motion-control", {
    input: {
      image_url: finalImageUrl,
      video_url: motionVideoUrl,
      character_orientation: "image",
      prompt:
        "Slow elegant cinematic camera dolly forward through a warm lamplit temple corridor toward a bride " +
        "and groom in traditional South Indian wedding attire, standing together, romantic wedding-film mood, " +
        "soft golden light, no text or watermarks.",
    },
    logs: true,
    onQueueUpdate: (update) => {
      console.log("   status:", update.status);
    },
  });

  const videoUrl = result.data?.video?.url;
  if (!videoUrl) throw new Error("No video URL in result: " + JSON.stringify(result.data));
  console.log("7. Generated video:", videoUrl);

  const videoRes = await fetch(videoUrl);
  const outPath = path.join(SCRATCH, "motion-control-output.mp4");
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
