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
  console.log("1. Uploading block-out video + 2 venue reference images (no face images)...");
  const [videoUrl, exteriorUrl, interiorUrl] = await Promise.all([
    uploadLocalFile(
      "/Users/vijayramarathinam/Desktop/wedding-invite/public/reference/block-out-camera-pane.mp4",
      "video/mp4",
    ),
    uploadLocalFile("/Users/vijayramarathinam/Downloads/e7e8b015-f1dd-4770-ba76-06a243de8472.png", "image/png"),
    uploadLocalFile("/Users/vijayramarathinam/Downloads/661615f2-a4eb-41e3-9c2a-c735dadc0ae9.png", "image/png"),
  ]);
  console.log("   video:", videoUrl);
  console.log("   Image1 (exterior):", exteriorUrl);
  console.log("   Image2 (interior):", interiorUrl);

  const prompt = `Single continuous cinematic drone take, no cuts, 15 seconds.
CAMERA — follow [Video1] exactly for camera motion, framing and timing only:
  0-3s    wide establishing, full facade and tower against dusk sky
  3-7s    drone descends and pushes forward along the centre line, tower crops out of frame top
  7-9s    the entrance archway fills the frame, warm light spilling out
  9-11s   camera passes through the opening into the hall interior
  11-13s  glides down the aisle between seated guests, descending to standing eye level
  13-15s  settles into a close two-shot of the bride and groom facing each other, decelerating to a near-still hold
[Video1] is a grey untextured previz blockout. IGNORE its appearance completely — the grey boxes,
white surfaces, stick figures and flat lighting are placeholders, not the look. Reproduce only the
camera path, the speed changes, and where subjects sit in frame.
MAPPING — the placeholder figures and structures in [Video1] are stand-ins:
  the RED stick figure = a South Asian bride in her twenties, dressed in a red and gold silk saree
    with temple jewelry, hair styled with flowers
  the BLUE stick figure = a South Asian groom in his twenties, dressed in a cream and gold silk
    sherwani, short dark hair and light beard
  the grey stick figures = wedding guests standing and facing the bride and groom
  the grey tower/facade structure (0-9s) = the temple exterior from [Image1]
  the grey interior room (9-15s) = the temple mandap interior from [Image2]
LOCATION — [Image1] for the exterior tower and facade, [Image2] for the interior mandap stage,
drapery, florals and gold pillars, as-is. Their architecture, materials, colour and decoration
replace the grey blockout entirely.
CHARACTERS — bride and groom as described above. Both standing, facing each other, hands joined.
LOOK — photoreal wedding cinematography, warm golden hour light outside, soft shafts of light and
candle glow inside, shallow depth of field on the final two-shot, natural film grain, anamorphic
feel. Smooth gimbal motion, no camera shake, no cuts, no text or captions.`;

  console.log("2. Submitting Seedance 2.5 reference-to-video job (480p)...");
  const result = await fal.subscribe("bytedance/seedance-2.5/reference-to-video", {
    input: {
      prompt,
      image_urls: [exteriorUrl, interiorUrl],
      video_urls: [videoUrl],
      resolution: "480p",
      duration: "15",
      aspect_ratio: "16:9",
      generate_audio: false,
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
  const outPath = path.join(SCRATCH, "seedance-output.mp4");
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
