/**
 * Renders the procedural cinematics with a headless browser, then encodes them.
 *
 *   npm run templates
 *
 * These are original, generated here, and yours outright. They are meant as a
 * strong default — swap in real footage when you have it (see README), keeping
 * the encoder flags below.
 */
import { chromium } from "playwright";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SCENE_SOURCE } from "./scene.mjs";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = path.join(ROOT, ".cinematic-frames");

const W = 900, H = 1600, FPS = 30, SECONDS = 12;
const FRAMES = FPS * SECONDS;

const TEMPLATES = [
  {
    id: "temple",
    motif: "arch",
    tone: 220,
    lamps: true,
    openW: 0.42, openH: 0.78, travel: 8.2,
    palette: {
      deep: "#0b0705", wall: "#2a1a11", glow: "#8a4d1f",
      light: "#ffd9a0", rim: "#e8a75c", flame: "#fff0cf", mote: "#ffe6bd",
    },
  },
  {
    id: "garden",
    motif: "canopy",
    tone: 196,
    lamps: true,
    openW: 0.5, openH: 0.72, travel: 7.6,
    palette: {
      deep: "#060d08", wall: "#16301c", glow: "#3f7a45",
      light: "#eaf7cf", rim: "#a8d08a", flame: "#fff3c4", mote: "#dff0c2",
    },
  },
  {
    id: "coast",
    motif: "rock",
    tone: 174,
    lamps: false,
    openW: 0.58, openH: 0.6, travel: 7.0,
    palette: {
      deep: "#060c12", wall: "#172a3a", glow: "#3d6f96",
      light: "#eaf4fb", rim: "#9cc6e2", flame: "#ffffff", mote: "#dbeaf6",
    },
  },
];

const page = await (await chromium.launch()).newPage({ viewport: { width: 100, height: 100 } });
await page.setContent(`<canvas id="c" width="${W}" height="${H}"></canvas>`);
await page.addScriptTag({ content: SCENE_SOURCE });

for (const cfg of TEMPLATES) {
  const dir = path.join(ROOT, "public", "templates", cfg.id);
  await mkdir(dir, { recursive: true });
  await rm(TMP, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });

  process.stdout.write(`→ ${cfg.id} `);

  for (let f = 0; f < FRAMES; f++) {
    const t = f / (FRAMES - 1);
    const data = await page.evaluate(
      ([t, cfg, W, H]) => {
        const ctx = document.getElementById("c").getContext("2d");
        drawScene(ctx, W, H, t, cfg);
        return document.getElementById("c").toDataURL("image/jpeg", 0.93);
      },
      [t, cfg, W, H],
    );
    await writeFile(
      path.join(TMP, String(f).padStart(4, "0") + ".jpg"),
      Buffer.from(data.split(",")[1], "base64"),
    );
    if (f % 60 === 0) process.stdout.write(".");
  }

  // -g 10 keeps keyframes dense, which is what makes the film scrubbable.
  // A long GOP would make the scroll land only on keyframes and snap visibly.
  await run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-framerate", String(FPS), "-i", path.join(TMP, "%04d.jpg"),
    "-vf", "noise=alls=6:allf=t,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "24",
    "-g", "10", "-keyint_min", "10", "-sc_threshold", "0",
    "-movflags", "+faststart", "-an",
    path.join(dir, "video.mp4"),
  ]);

  await run("ffmpeg", [
    "-y", "-loglevel", "error", "-i", path.join(dir, "video.mp4"),
    "-vf", "scale=540:-2",
    "-c:v", "libx264", "-preset", "slow", "-crf", "29",
    "-g", "10", "-keyint_min", "10", "-sc_threshold", "0",
    "-movflags", "+faststart", "-an",
    path.join(dir, "video-mobile.mp4"),
  ]);

  // A soft two-note pad under the invitation: a root and its fifth, breathing.
  await run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", `sine=frequency=${cfg.tone}:duration=24:sample_rate=44100`,
    "-f", "lavfi", "-i", `sine=frequency=${Math.round(cfg.tone * 1.5)}:duration=24:sample_rate=44100`,
    "-filter_complex",
    "[0:a]volume=0.30[a];[1:a]volume=0.18[b];[a][b]amix=inputs=2," +
      "tremolo=f=0.25:d=0.5,aformat=channel_layouts=stereo," +
      "afade=t=in:d=2,afade=t=out:st=22:d=2",
    "-c:a", "libmp3lame", "-q:a", "6",
    path.join(dir, "music.mp3"),
  ]);

  console.log(" done");
}

await rm(TMP, { recursive: true, force: true });
await page.context().browser().close();
console.log("cinematics rendered");
