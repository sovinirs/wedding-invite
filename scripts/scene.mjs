/**
 * The cinematic scene, drawn on a 2D canvas.
 *
 * Every template is an *entrance*: the camera dollies forward through a series
 * of receding openings toward a warm light, and emerges into brightness at the
 * end — which is exactly where the invitation page dissolves the film away and
 * reveals the card. What changes between templates is the material of the
 * opening and the palette.
 *
 * This file is stringified and injected into a headless browser by
 * render-cinematic.mjs, so it must stay self-contained: no imports.
 */
export const SCENE_SOURCE = `

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws a run of points as a smooth curve, using each midpoint as an anchor and
 * the point itself as the control. Straight segments between sampled points
 * would facet the organic motifs into polygons.
 */
function smoothThrough(ctx, pts) {
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

/** Traces the opening for one gate. Each motif is a different material. */
function openingPath(ctx, cx, cy, w, h, motif, seed) {
  const rand = mulberry32(seed);
  const hw = w / 2, hh = h / 2;
  ctx.beginPath();

  if (motif === "arch") {
    // Temple doorway: straight jambs rising into a tall rounded head.
    const spring = cy - hh * 0.15;
    ctx.moveTo(cx - hw, cy + hh);
    ctx.lineTo(cx - hw, spring);
    ctx.bezierCurveTo(cx - hw, cy - hh * 0.95, cx + hw, cy - hh * 0.95, cx + hw, spring);
    ctx.lineTo(cx + hw, cy + hh);
    ctx.closePath();
    return;
  }

  // Organic motifs: sample a wobbling arc, then smooth it.
  // "canopy" — foliage closing overhead, leafy and irregular.
  // "rock"   — a sea cave mouth, wide and low, worn round.
  const canopy = motif === "canopy";
  const steps = canopy ? 20 : 24;
  const amp = canopy ? 0.14 : 0.10;
  const squash = canopy ? 0.95 : 0.82;

  // Low-frequency roll keeps the outline from looking like noise.
  const phase = rand() * Math.PI * 2;
  const lobes = canopy ? 3 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 2);

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const a = Math.PI * (1 - u);
    const wob =
      1 +
      Math.sin(a * lobes + phase) * amp +
      Math.sin(a * (lobes * 2.3) + phase * 1.7) * amp * 0.4;
    pts.push({
      x: cx + Math.cos(a) * hw * wob,
      y: cy - Math.sin(a) * hh * wob * squash,
    });
  }

  ctx.moveTo(cx - hw, cy + hh);
  smoothThrough(ctx, pts);
  ctx.lineTo(cx + hw, cy + hh);
  ctx.closePath();
}

function drawScene(ctx, W, H, t, cfg) {
  const P = cfg.palette;
  ctx.clearRect(0, 0, W, H);

  // --- the light we are travelling toward ---------------------------------
  // It swells as we approach, so the last stretch of scroll blooms out.
  const bloom = 0.35 + Math.pow(t, 2.1) * 0.9;
  const cx = W / 2 + Math.sin(t * Math.PI * 2.2) * W * 0.012;  // gentle handheld sway
  const cy = H * 0.46 + Math.cos(t * Math.PI * 1.7) * H * 0.008;

  ctx.fillStyle = P.deep;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * (0.5 + bloom * 0.55));
  glow.addColorStop(0, P.light);
  glow.addColorStop(0.35, P.glow);
  glow.addColorStop(1, P.deep);
  ctx.globalAlpha = Math.min(1, 0.55 + bloom * 0.45);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // --- the corridor -------------------------------------------------------
  // Gates sit at fixed depths; the camera advances, so each swells and sweeps
  // past. Each gate paints ONLY its own visible wall face — the ring between
  // its opening and the next nearer opening — clipped to that nearer opening.
  // Filling the whole frame per gate instead would stack thirteen shadows on
  // the centre and black the corridor out.
  const FOCAL = H * 0.62;
  const SPACING = 1.0;
  const GATES = 15;
  const travel = t * cfg.travel;

  const gates = [];
  for (let i = 0; i < GATES; i++) {
    const z = 0.7 + i * SPACING - travel;
    if (z <= 0.2) continue;                        // behind the camera
    const seed = i * 7919 + 13;
    // Identical gates read as a treadmill: the corridor looks still even while
    // the camera moves. Jittering each one makes the approach legible.
    const jr = mulberry32(seed);
    const jw = 0.86 + jr() * 0.28;
    const jh = 0.9 + jr() * 0.2;
    const scale = FOCAL / z;
    const w = cfg.openW * scale * jw;
    if (w > W * 7) continue;                       // swallowing the frame
    gates.push({ z, scale, w, h: cfg.openH * scale * jh, seed });
  }
  gates.sort((a, b) => a.z - b.z);                 // nearest first

  for (let k = 0; k < gates.length; k++) {
    const g = gates[k];
    const far = Math.min(1, (g.z - 0.2) / (GATES * SPACING * 0.72));

    ctx.save();
    if (k > 0) {
      // Confine this wall to what shows through the gate in front of it.
      const prev = gates[k - 1];
      openingPath(ctx, cx, cy, prev.w, prev.h, cfg.motif, prev.seed);
      ctx.clip();
    }

    // The wall face: darkest close to camera, hazed toward the light.
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    openingPath(ctx, cx, cy, g.w, g.h, cfg.motif, g.seed);
    const face = ctx.createLinearGradient(0, cy - g.h, 0, cy + g.h);
    face.addColorStop(0, P.deep);
    face.addColorStop(0.5, far > 0.5 ? P.glow : P.wall);
    face.addColorStop(1, P.deep);
    ctx.globalAlpha = 0.92 - far * 0.5;
    ctx.fillStyle = face;
    ctx.fill("evenodd");

    // Rim of light around the opening — the edge that makes depth legible.
    ctx.globalAlpha = 0.2 + (1 - far) * 0.42;
    openingPath(ctx, cx, cy, g.w, g.h, cfg.motif, g.seed);
    ctx.strokeStyle = P.rim;
    ctx.lineWidth = Math.max(1, g.scale * 0.006);
    ctx.shadowColor = P.rim;
    ctx.shadowBlur = Math.max(6, g.scale * 0.05);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // A brighter sill along the threshold suggests a floor running away
    // from the camera, which the arches alone do not give.
    ctx.globalAlpha = (1 - far) * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - g.w / 2, cy + g.h / 2);
    ctx.lineTo(cx + g.w / 2, cy + g.h / 2);
    ctx.strokeStyle = P.light;
    ctx.lineWidth = Math.max(1, g.scale * 0.004);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Lamps set into the wall face, flanking the opening.
    if (cfg.lamps && g.z > 0.55 && g.z < 6.5) {
      const flicker = 0.6 + Math.sin(t * 44 + g.seed) * 0.15 + Math.sin(t * 109 + g.seed) * 0.08;
      const r = Math.max(1.5, g.scale * 0.012);
      for (const side of [-1, 1]) {
        const lx = cx + side * (g.w / 2 + r * 2.4);
        const ly = cy + g.h * 0.2;
        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 6);
        lg.addColorStop(0, P.flame);
        lg.addColorStop(0.3, P.rim);
        lg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = flicker * (1 - far * 0.6) * 0.85;
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly, r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // --- motes drifting in the light ---------------------------------------
  const rand = mulberry32(20260902);
  ctx.fillStyle = P.mote;
  for (let i = 0; i < 130; i++) {
    const depth = 0.35 + rand() * 3.2;
    const px = rand(), py = rand(), ph = rand() * Math.PI * 2;
    // Parallax: near motes streak past, far ones barely move.
    const z = depth - (travel * 0.42) % depth;
    const s = FOCAL / Math.max(0.2, z);
    const x = cx + (px - 0.5) * W * 1.5 * (s / FOCAL) + Math.sin(t * 3 + ph) * 9;
    const y = cy + (py - 0.5) * H * 1.5 * (s / FOCAL) + Math.cos(t * 2.2 + ph) * 7;
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
    ctx.globalAlpha = 0.05 + (1 - Math.min(1, z / 3.5)) * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, s * 0.0016), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- grade ---------------------------------------------------------------
  // Vignette, then a warm wash that lifts as we emerge into the light.
  const vig = ctx.createRadialGradient(W / 2, H * 0.5, W * 0.18, W / 2, H * 0.5, W * 0.86);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = Math.pow(t, 5.0) * 0.18;
  ctx.fillStyle = P.light;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}
`;
