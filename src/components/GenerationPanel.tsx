"use client";

import { useEffect, useRef, useState } from "react";
import type { GenerationJob } from "@prisma/client";
import { approveLastFrame, pollGeneration, regenerateLastFrame, retryGenerationJob, startGeneration } from "@/app/actions";

const POLL_MS = 2000;
const POLLING_STATUSES = ["QUEUED_VIDEO", "GENERATING_VIDEO", "ENCODING"];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Queued…",
  GENERATING_LAST_FRAME: "Composing your last frame…",
  AWAITING_APPROVAL: "Review your last frame",
  QUEUED_VIDEO: "Queued for your film…",
  GENERATING_VIDEO: "Generating your film…",
  ENCODING: "Finishing up…",
  READY: "Your film is ready",
  FAILED: "Something went wrong",
  CANCELLED: "Superseded by a newer attempt",
};

export function GenerationPanel({
  inviteId,
  initialJob,
  readyToStart,
  regenerationCount,
  maxRegenerations,
}: {
  inviteId: string;
  initialJob: GenerationJob | null;
  readyToStart: boolean;
  regenerationCount: number;
  maxRegenerations: number;
}) {
  const [job, setJob] = useState(initialJob);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!job || !POLLING_STATUSES.includes(job.status)) return;
    timerRef.current = setTimeout(async () => {
      const result = await pollGeneration(job.id);
      if (result.job) setJob(result.job);
      if (result.error) setError(result.error);
    }, POLL_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [job]);

  async function handleStart() {
    setPending(true);
    setError(null);
    const result = await startGeneration(inviteId);
    if (result.error) setError(result.error);
    else if (result.job) setJob(result.job);
    setPending(false);
  }

  async function handleApprove() {
    if (!job) return;
    setPending(true);
    setError(null);
    const result = await approveLastFrame(job.id);
    if (result.error) setError(result.error);
    else if (result.job) setJob(result.job);
    setPending(false);
  }

  async function handleRegenerate() {
    setPending(true);
    setError(null);
    const result = await regenerateLastFrame(inviteId);
    if (result.error) setError(result.error);
    else if (result.job) setJob(result.job);
    setPending(false);
  }

  async function handleRetry() {
    if (!job) return;
    setPending(true);
    setError(null);
    const result = await retryGenerationJob(job.id);
    if (result.error) setError(result.error);
    else if (result.job) setJob(result.job);
    setPending(false);
  }

  const canRegenerate = regenerationCount < maxRegenerations;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-[#c9956a]/25 bg-white p-6">
      {error && <p className="text-xs text-[#8f342b]">{error}</p>}

      {!job && (
        <>
          <p className="text-sm text-[#5a3f32]">
            {readyToStart
              ? "Ready to generate your personalized last frame from your photos and attire."
              : "Upload both photos and pick both attires above to start."}
          </p>
          <div>
            <button
              type="button"
              disabled={!readyToStart || pending}
              onClick={handleStart}
              className="rounded-sm bg-[#2b1710] px-6 py-3 text-xs uppercase tracking-[0.24em] text-[#fdf6ec] transition-colors hover:bg-[#3f2318] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Starting…" : "Generate last frame"}
            </button>
          </div>
        </>
      )}

      {job && (
        <>
          <p className="text-sm text-[#5a3f32]">{STATUS_LABEL[job.status] ?? job.status}</p>

          {(job.status === "GENERATING_LAST_FRAME" || POLLING_STATUSES.includes(job.status)) && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3e7db]">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-[#9b5f36]" />
            </div>
          )}

          {job.status === "AWAITING_APPROVAL" && job.lastFrameUrl && (
            <div className="flex flex-col gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- local generated file, not an optimizable app asset */}
              <img src={job.lastFrameUrl} alt="Composed last frame" className="w-full rounded-sm border border-[#c9956a]/25" />
              <p className="text-xs text-[#8a6b5c]">
                {regenerationCount}/{maxRegenerations} regenerations used.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleApprove}
                  className="rounded-sm bg-[#2b1710] px-6 py-3 text-xs uppercase tracking-[0.24em] text-[#fdf6ec] transition-colors hover:bg-[#3f2318] disabled:opacity-50"
                >
                  {pending ? "Approving…" : "Approve — generate film"}
                </button>
                <button
                  type="button"
                  disabled={pending || !canRegenerate}
                  onClick={handleRegenerate}
                  className="rounded-sm border border-[#c9956a]/45 px-6 py-3 text-xs uppercase tracking-[0.24em] text-[#9b5f36] transition-colors hover:bg-[#f3e7db] disabled:cursor-not-allowed disabled:opacity-50"
                  title={canRegenerate ? undefined : "No regenerations left"}
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}

          {job.status === "READY" && job.finalVideoUrl && (
            <div className="flex flex-col gap-3">
              <video
                src={job.finalVideoUrl}
                poster={job.posterFrameUrl ?? undefined}
                controls
                muted
                playsInline
                className="w-full rounded-sm border border-[#c9956a]/25 bg-black"
              />
              <p className="text-xs text-[#3c5f45]">
                Attached to your invite — publishing will use this film instead of the static template.
              </p>
            </div>
          )}

          {job.status === "FAILED" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[#8f342b]">{job.errorMessage ?? "Generation failed."}</p>
              <div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleRetry}
                  className="rounded-sm border border-[#c9956a]/45 px-6 py-3 text-xs uppercase tracking-[0.24em] text-[#9b5f36] transition-colors hover:bg-[#f3e7db] disabled:opacity-50"
                >
                  {pending ? "Retrying…" : "Retry"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
