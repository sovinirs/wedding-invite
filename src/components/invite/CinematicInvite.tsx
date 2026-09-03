"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Template } from "@/lib/templates";
import { EntryGate } from "./EntryGate";
import { ScrollOverlays } from "./ScrollOverlays";
import { InvitationCard } from "./InvitationCard";

export type InviteContent = {
  partnerOne: string;
  partnerTwo: string;
  eyebrow: string;
  taglineLead: string;
  taglineSub: string;
  arrivalNote: string;
  blessing: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  mapsUrl: string | null;
  closingNote: string;
};

/** Total scroll distance that maps onto the film. More = slower, finer scrub. */
const SCROLL_HEIGHT = "620vh";

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

const isMobile =
  typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

function bufferedFraction(video: HTMLVideoElement) {
  if (!video.duration || !video.buffered.length) return 0;
  return video.buffered.end(video.buffered.length - 1) / video.duration;
}

/**
 * Seeks the film to `target` seconds, defensively. The video is only ever a
 * frame source — it never plays — so every frame change is a seek, and seeks
 * are the thing most likely to stall on a slow connection.
 */
function seekTo(video: HTMLVideoElement, target: number, epsilon = 0.02) {
  if (Math.abs(video.currentTime - target) < epsilon) return;

  const { seekable } = video;
  if (!seekable.length) return;

  const bounded = clamp(target, seekable.start(0), seekable.end(seekable.length - 1));

  // On mobile, seeking past what has downloaded produces a long black stall,
  // so we simply refuse to go there and let the buffer catch up.
  if (isMobile && video.buffered.length > 0) {
    if (bounded > video.buffered.end(video.buffered.length - 1) + 0.5) return;
  }
  video.currentTime = bounded;
}

export function CinematicInvite({
  content,
  template,
  videoSrc,
  videoMobileSrc,
  audioSrc,
}: {
  content: InviteContent;
  template: Template;
  videoSrc: string;
  videoMobileSrc?: string | null;
  audioSrc: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardSentinelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const durationRef = useRef(0);
  const targetRef = useRef(0);
  const smoothedRef = useRef(0);
  const seekingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [progress, setProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [cardVisible, setCardVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  // Always open at the top, even on a refresh mid-scroll.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, []);

  // The tap that dismisses the gate is also the user gesture that unlocks audio.
  const handleEnter = useCallback(() => {
    setEntered(true);
    requestAnimationFrame(() => {
      if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    });
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        /* autoplay refused — the invitation still works in silence */
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distance = Math.max(scroller.scrollHeight - scroller.clientHeight, 1);
    const next = clamp(scroller.scrollTop / distance);
    targetRef.current = next;
    if (next > 0.015) setShowHint(false);
  }, []);

  // The scrub loop: ease the displayed progress toward the scroll position, then
  // drive the film's playhead from it. Easing here is what turns a jerky flick
  // into a glide.
  useEffect(() => {
    let alive = true;

    const tick = () => {
      const video = videoRef.current;
      const target = targetRef.current;
      let smoothed = smoothedRef.current;

      const delta = target - smoothed;
      const ease = isMobile ? 0.14 : 0.1;
      smoothed = Math.abs(delta) > 5e-4 ? smoothed + delta * ease : target;
      smoothedRef.current = smoothed;

      setProgress((prev) => (Math.abs(prev - smoothed) > 0.001 ? smoothed : prev));

      if (video) {
        if (video.buffered.length > 0) setBuffered(bufferedFraction(video));
        if (durationRef.current > 0 && video.readyState >= 2 && !seekingRef.current) {
          seekTo(video, durationRef.current * smoothed);
        }
      }

      if (alive) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const scroller = scrollerRef.current;
    scroller?.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll();

    return () => {
      alive = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      scroller?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll, entered]);

  // Film readiness. `canplay` is the point at which seeking is reliable, which
  // is what gates the "Tap to Begin" button.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMeta = () => {
      if (Number.isFinite(video.duration)) durationRef.current = video.duration;
    };
    const onCanPlay = () => {
      if (Number.isFinite(video.duration)) {
        durationRef.current = video.duration;
        setVideoReady(true);
      }
    };
    const onProgress = () => {
      if (video.buffered.length > 0) setBuffered(bufferedFraction(video));
    };
    const onSeeking = () => { seekingRef.current = true; };
    const onSeeked = () => { seekingRef.current = false; };

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("progress", onProgress);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("seeked", onSeeked);
    };
  }, []);

  // Fire the card's entrance animation and confetti the first time it is reached.
  useEffect(() => {
    const sentinel = cardSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCardVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [entered]);

  // The film dissolves over the last stretch of scroll, revealing the card.
  const filmOpacity = 1 - clamp((progress - 0.84) / 0.14);
  const showBufferBar = isMobile && videoReady && buffered < 0.8;
  const source = isAndroid && videoMobileSrc ? videoMobileSrc : videoSrc;

  return (
    <>
      <audio ref={audioRef} src={audioSrc} loop preload="auto" />

      <EntryGate videoReady={videoReady} onEnter={handleEnter} template={template} />

      <div
        className="fixed inset-0 z-0 h-[100svh] w-full overflow-hidden bg-[#120c0b]"
        style={{
          opacity: filmOpacity,
          transition: "opacity 200ms linear",
          willChange: "opacity, transform",
          transform: "translateZ(0)",
        }}
      >
        <video
          ref={videoRef}
          className="cinematic-video h-full w-full object-cover"
          src={source}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          style={{
            willChange: "transform, opacity",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {showBufferBar && (
        <div className="pointer-events-none fixed left-0 top-0 z-40 h-[2px] w-full bg-white/10">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${Math.round(buffered * 100)}%`, background: `${template.palette.gold}b3` }}
          />
        </div>
      )}

      <ScrollOverlays
        progress={progress}
        loaded={videoReady}
        veil={filmOpacity}
        content={content}
        template={template}
      />

      {entered && (
        <div
          ref={scrollerRef}
          className="scroll-shell relative z-10 h-[100svh] w-full overflow-y-auto overflow-x-hidden bg-transparent"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
            touchAction: "pan-y",
            willChange: "transform",
          }}
        >
          <div className="relative w-full" style={{ height: SCROLL_HEIGHT }} />
          <div ref={cardSentinelRef}>
            <InvitationCard animate={cardVisible} content={content} template={template} />
          </div>
        </div>
      )}

      <ScrollHint visible={entered && videoReady && showHint} />
    </>
  );
}

function ScrollHint({ visible }: { visible: boolean }) {
  return (
    <div
      className="pointer-events-none fixed bottom-10 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center"
      style={{ opacity: visible ? 0.76 : 0, transition: "opacity 700ms ease" }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.42em] text-white drop-shadow-md"
        style={{ fontFamily: "Georgia, serif", textShadow: "0 1px 8px rgba(0,0,0,0.62)" }}
      >
        Swipe to enter
      </span>
      <div className="mt-3 h-7 w-px animate-bounce bg-gradient-to-b from-white/80 to-transparent" />
    </div>
  );
}
