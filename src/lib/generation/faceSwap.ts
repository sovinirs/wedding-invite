import "server-only";
import { getFalClient, uploadDataUrlToFal, uploadLocalImageToFal } from "../fal";

/**
 * fal-ai/face-swap (first-party), not easel-ai/advanced-face-swap: tested
 * both against a real key. The community "advanced" model sat IN_QUEUE on
 * fal's own infrastructure for 5+ minutes without ever starting — a
 * capacity/availability problem on their side, not this integration. The
 * first-party endpoint completed in ~6 seconds. It only takes one base +
 * one swap image per call, so this does two sequential swaps (bride, then
 * groom onto that result) instead of easel-ai's single two-face call.
 */
const FACE_SWAP_ENDPOINT = "fal-ai/face-swap";

/**
 * CONFIRMED EMPIRICALLY (not just documented behavior): a target image
 * with no detectable face throws a clear ValidationError — "No face found
 * in the image" — rather than silently no-opping. Our current target
 * image is a venue EXTERIOR shot with no people in it at all, so this call
 * fails exactly that way today. The real product needs a proper base-plate
 * photo per venue×attire pair (a model wearing the attire, standing in the
 * venue) — that photography doesn't exist yet, see the asset inventory.
 * This code is wired up and tested for real; the result is gated on that
 * photography, not on this code — it's a one-asset swap away from working.
 */
export async function swapFaces(input: {
  targetImageUrl: string;
  brideFaceDataUrl: string;
  groomFaceDataUrl: string;
}): Promise<{ imageUrl: string }> {
  const fal = getFalClient();

  const [targetImageUrl, brideFaceUrl, groomFaceUrl] = await Promise.all([
    uploadLocalImageToFal(input.targetImageUrl),
    uploadDataUrlToFal(input.brideFaceDataUrl),
    uploadDataUrlToFal(input.groomFaceDataUrl),
  ]);

  const afterBride = await fal.subscribe(FACE_SWAP_ENDPOINT, {
    input: { base_image_url: targetImageUrl, swap_image_url: brideFaceUrl },
  });
  const brideSwappedUrl = (afterBride.data as { image?: { url?: string } }).image?.url;
  if (!brideSwappedUrl) throw new Error("fal face-swap (bride) returned no image URL");

  const afterGroom = await fal.subscribe(FACE_SWAP_ENDPOINT, {
    input: { base_image_url: brideSwappedUrl, swap_image_url: groomFaceUrl },
  });
  const finalUrl = (afterGroom.data as { image?: { url?: string } }).image?.url;
  if (!finalUrl) throw new Error("fal face-swap (groom) returned no image URL");

  return { imageUrl: finalUrl };
}
