import "server-only";
import { db } from "../db";
import { templateAssetPaths } from "../templates";
import { getAttireLook } from "../attire";
import { composeFrames } from "./compositing";
import { encodeAllIntra } from "./encode";
import { videoProvider } from "../videoProvider";
import type { GenerationJob } from "@prisma/client";

const ACTIVE_STATUSES = [
  "PENDING",
  "GENERATING_LAST_FRAME",
  "AWAITING_APPROVAL",
  "QUEUED_VIDEO",
  "GENERATING_VIDEO",
  "ENCODING",
] as const;

export type JobResult = { error?: string; job?: GenerationJob };

/**
 * Starts a new generation for an invite: validates that photos + attire
 * are actually set (never redoing this at the request layer), then runs
 * the GENERATING_LAST_FRAME step inline — compositing is fast (~1s), so
 * there's no need to make the customer poll just to see their last frame.
 * The expensive step (the actual video call) only happens later, once
 * they've approved this frame.
 */
export async function startGeneration(inviteId: string): Promise<JobResult> {
  const invite = await db.invite.findUnique({ where: { id: inviteId } });
  if (!invite) return { error: "Invitation not found." };

  const existingActive = await db.generationJob.findFirst({
    where: { inviteId, status: { in: [...ACTIVE_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
  if (existingActive) return { job: existingActive };

  if (!invite.attireBrideId || !invite.attireGroomId) {
    return { error: "Choose attire for both the bride and groom first." };
  }

  const [bridePhoto, groomPhoto] = await Promise.all([
    db.facePhoto.findFirst({ where: { inviteId, role: "BRIDE" }, orderBy: { createdAt: "asc" } }),
    db.facePhoto.findFirst({ where: { inviteId, role: "GROOM" }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!bridePhoto || !groomPhoto) {
    return { error: "Upload at least one bride photo and one groom photo first." };
  }

  const job = await db.generationJob.create({
    data: { inviteId, status: "GENERATING_LAST_FRAME", startedAt: new Date() },
  });

  return runLastFrameStep(job, invite.templateId, bridePhoto.storageUrl, groomPhoto.storageUrl, invite.attireBrideId, invite.attireGroomId);
}

async function runLastFrameStep(
  job: GenerationJob,
  templateId: string,
  bridePhotoDataUrl: string,
  groomPhotoDataUrl: string,
  attireBrideId: string,
  attireGroomId: string,
): Promise<JobResult> {
  try {
    const { lastFrameUrl } = await composeFrames({
      templateId,
      bridePhotoDataUrl,
      groomPhotoDataUrl,
      brideLook: getAttireLook(templateId, "bride", attireBrideId),
      groomLook: getAttireLook(templateId, "groom", attireGroomId),
      inviteId: job.inviteId,
      jobId: job.id,
    });
    const updated = await db.generationJob.update({
      where: { id: job.id },
      data: { status: "AWAITING_APPROVAL", lastFrameUrl },
    });
    return { job: updated };
  } catch (err) {
    const updated = await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorCode: "last_frame_failed", errorMessage: message(err) },
    });
    return { job: updated };
  }
}

/**
 * Approves the last frame and kicks off the expensive step — the actual
 * video call. Submission itself is quick (it just hands off to the
 * provider and gets a handle back); the real work happens in the
 * background and is picked up by pollGeneration.
 */
export async function approveLastFrame(jobId: string): Promise<JobResult> {
  const job = await db.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return { error: "Job not found." };
  if (job.status !== "AWAITING_APPROVAL") return { error: "This job isn't awaiting approval." };
  if (!job.lastFrameUrl) return { error: "No last frame to approve." };

  const invite = await db.invite.findUnique({ where: { id: job.inviteId } });
  if (!invite) return { error: "Invitation not found." };

  await db.generationJob.update({
    where: { id: job.id },
    data: { status: "QUEUED_VIDEO", lastFrameApprovedAt: new Date() },
  });

  return submitVideoStep(job.id, invite.templateId, job.lastFrameUrl);
}

async function submitVideoStep(jobId: string, templateId: string, lastFrameUrl: string): Promise<JobResult> {
  try {
    const firstFrameUrl = templateAssetPaths(templateId).poster;
    const { providerRef } = await videoProvider.submit({ firstFrameUrl, lastFrameUrl });
    const updated = await db.generationJob.update({
      where: { id: jobId },
      data: { status: "GENERATING_VIDEO", videoProviderRef: providerRef },
    });
    return { job: updated };
  } catch (err) {
    const updated = await db.generationJob.update({
      where: { id: jobId },
      data: { status: "FAILED", errorCode: "submit_failed", errorMessage: message(err) },
    });
    return { job: updated };
  }
}

/**
 * The polling entry point. A GENERATING_VIDEO job gets checked against the
 * provider; once the provider reports success, this runs the mandatory
 * all-intra re-encode inline (fast enough not to need its own polling
 * window) and writes the result through to the Invite so the public page
 * picks it up immediately. Any other status is just returned as-is —
 * cheap, safe to call on every poll tick regardless of state.
 */
export async function pollGeneration(jobId: string): Promise<JobResult> {
  const job = await db.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return { error: "Job not found." };
  if (job.status !== "GENERATING_VIDEO" || !job.videoProviderRef) return { job };

  let providerResult;
  try {
    providerResult = await videoProvider.poll(job.videoProviderRef);
  } catch (err) {
    const updated = await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorCode: "poll_failed", errorMessage: message(err) },
    });
    return { job: updated };
  }

  if (providerResult.status === "processing") return { job };

  if (providerResult.status === "failed") {
    const updated = await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorCode: "provider_failed", errorMessage: providerResult.error },
    });
    return { job: updated };
  }

  // succeeded — re-encode is mandatory and never skipped, regardless of
  // whether the provider's own output happened to already be seek-friendly.
  await db.generationJob.update({
    where: { id: job.id },
    data: { status: "ENCODING", rawVideoUrl: providerResult.videoUrl },
  });

  try {
    const { finalVideoUrl } = await encodeAllIntra({
      rawVideoUrl: providerResult.videoUrl,
      inviteId: job.inviteId,
      jobId: job.id,
    });
    const posterFrameUrl = job.lastFrameUrl; // the composited last frame doubles as the poster

    const updated = await db.generationJob.update({
      where: { id: job.id },
      data: { status: "READY", finalVideoUrl, posterFrameUrl, completedAt: new Date() },
    });

    await db.invite.update({
      where: { id: job.inviteId },
      data: {
        activeGenerationJobId: job.id,
        generatedVideoUrl: finalVideoUrl,
        posterUrl: posterFrameUrl,
      },
    });

    return { job: updated };
  } catch (err) {
    const updated = await db.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorCode: "encode_failed", errorMessage: message(err) },
    });
    return { job: updated };
  }
}

/**
 * A new job for the same invite, superseding the current one — counts
 * against the customer's regeneration allowance (unlike the in-place
 * retry below, which is for our/the provider's own failures).
 */
export async function regenerateLastFrame(inviteId: string): Promise<JobResult> {
  const invite = await db.invite.findUnique({ where: { id: inviteId } });
  if (!invite) return { error: "Invitation not found." };
  if (invite.regenerationCount >= invite.maxRegenerations) {
    return { error: "You've used all your regenerations for this invitation." };
  }
  if (!invite.attireBrideId || !invite.attireGroomId) {
    return { error: "Choose attire for both the bride and groom first." };
  }

  const [bridePhoto, groomPhoto] = await Promise.all([
    db.facePhoto.findFirst({ where: { inviteId, role: "BRIDE" }, orderBy: { createdAt: "asc" } }),
    db.facePhoto.findFirst({ where: { inviteId, role: "GROOM" }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!bridePhoto || !groomPhoto) {
    return { error: "Upload at least one bride photo and one groom photo first." };
  }

  const current = await db.generationJob.findFirst({ where: { inviteId }, orderBy: { createdAt: "desc" } });

  const next = await db.generationJob.create({
    data: { inviteId, status: "GENERATING_LAST_FRAME", startedAt: new Date() },
  });

  await Promise.all([
    current
      ? db.generationJob.update({ where: { id: current.id }, data: { status: "CANCELLED", supersededBy: next.id } })
      : Promise.resolve(),
    db.invite.update({ where: { id: inviteId }, data: { regenerationCount: { increment: 1 } } }),
  ]);

  return runLastFrameStep(
    next,
    invite.templateId,
    bridePhoto.storageUrl,
    groomPhoto.storageUrl,
    invite.attireBrideId,
    invite.attireGroomId,
  );
}

/**
 * Retries the step that failed, in place — does NOT count against the
 * regeneration allowance, since a provider/infra hiccup isn't the
 * customer's fault. Redoes only what actually failed: an encode failure
 * doesn't re-submit to the (expensive) video provider.
 */
export async function retryFailedJob(jobId: string): Promise<JobResult> {
  const job = await db.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return { error: "Job not found." };
  if (job.status !== "FAILED") return { error: "This job isn't in a failed state." };

  const invite = await db.invite.findUnique({ where: { id: job.inviteId } });
  if (!invite) return { error: "Invitation not found." };

  const retried = await db.generationJob.update({
    where: { id: job.id },
    data: { attempt: { increment: 1 }, errorCode: null, errorMessage: null },
  });

  if (job.rawVideoUrl) {
    // Failed at ENCODING — the expensive video call already succeeded, redo only the re-encode.
    await db.generationJob.update({ where: { id: job.id }, data: { status: "ENCODING" } });
    try {
      const { finalVideoUrl } = await encodeAllIntra({ rawVideoUrl: job.rawVideoUrl, inviteId: job.inviteId, jobId: job.id });
      const posterFrameUrl = job.lastFrameUrl;
      const updated = await db.generationJob.update({
        where: { id: job.id },
        data: { status: "READY", finalVideoUrl, posterFrameUrl, completedAt: new Date() },
      });
      await db.invite.update({
        where: { id: job.inviteId },
        data: { activeGenerationJobId: job.id, generatedVideoUrl: finalVideoUrl, posterUrl: posterFrameUrl },
      });
      return { job: updated };
    } catch (err) {
      const updated = await db.generationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorCode: "encode_failed", errorMessage: message(err) },
      });
      return { job: updated };
    }
  }

  if (job.lastFrameUrl) {
    // Failed after approval, before/during the video submit — resubmit.
    return submitVideoStep(job.id, invite.templateId, job.lastFrameUrl);
  }

  // Failed at last-frame generation — redo it.
  const [bridePhoto, groomPhoto] = await Promise.all([
    db.facePhoto.findFirst({ where: { inviteId: job.inviteId, role: "BRIDE" }, orderBy: { createdAt: "asc" } }),
    db.facePhoto.findFirst({ where: { inviteId: job.inviteId, role: "GROOM" }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!bridePhoto || !groomPhoto || !invite.attireBrideId || !invite.attireGroomId) {
    return { error: "Missing photos or attire — can't retry." };
  }
  await db.generationJob.update({ where: { id: job.id }, data: { status: "GENERATING_LAST_FRAME" } });
  return runLastFrameStep(
    retried,
    invite.templateId,
    bridePhoto.storageUrl,
    groomPhoto.storageUrl,
    invite.attireBrideId,
    invite.attireGroomId,
  );
}

/**
 * fal's client throws a generic "Unprocessable Entity" as the top-level
 * message — the actually useful detail (e.g. "No face found in the
 * image") is nested in err.body.detail[]. Surface that when present,
 * since it's the difference between a customer seeing a real reason and
 * seeing an HTTP status name.
 */
function message(err: unknown): string {
  if (err && typeof err === "object" && "body" in err) {
    const body = (err as { body?: { detail?: Array<{ msg?: string }> | string } }).body;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg.slice(0, 500);
    if (typeof body?.detail === "string") return body.detail.slice(0, 500);
  }
  return err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500);
}
