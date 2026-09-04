"use client";

import { useEffect, useRef } from "react";
import type { Template } from "@/lib/templates";
import { clamp, type InviteContent } from "./CinematicInvite";

/**
 * Copy keyframed directly off scroll progress. Each block owns a window of the
 * film; outside it the block is simply at zero opacity. Nothing here is
 * interactive, so the whole layer stays pointer-events-none over the video.
 *
 * Progress is read from a ref (written every rAF tick by CinematicInvite,
 * never through React state) and applied straight to the DOM here, so a
 * 60fps scroll never re-renders this tree.
 *
 * The whole layer is scaled by the film's own dissolve. Without that this
 * layer — vignette included — would keep painting over the invitation card:
 * the card's z-index is confined to the scroll shell's stacking context, so
 * it can never rise above this fixed layer on its own.
 */
export function ScrollOverlays({
  progressRef,
  loaded,
  content,
  template,
}: {
  progressRef: React.RefObject<number>;
  loaded: boolean;
  content: InviteContent;
  template: Template;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const arrivalRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;

  useEffect(() => {
    let alive = true;
    let raf: number;

    const tick = () => {
      const progress = progressRef.current;

      const veil = 1 - clamp((progress - 0.84) / 0.14);
      const namesOpacity = (1 - clamp((progress - 0.1) / 0.2)) * (loadedRef.current ? 1 : 0);
      const taglineOpacity =
        clamp((progress - 0.26) / 0.16) * (1 - clamp((progress - 0.58) / 0.14));
      const arrivalOpacity = clamp((progress - 0.72) / 0.18);

      if (wrapperRef.current) wrapperRef.current.style.opacity = String(veil);

      if (namesRef.current) {
        namesRef.current.style.opacity = String(namesOpacity);
        namesRef.current.style.transform = `translateY(${-34 * progress}px) translateZ(0)`;
      }
      if (taglineRef.current) {
        taglineRef.current.style.opacity = String(taglineOpacity);
        taglineRef.current.style.transform = `translateY(${(0.5 - progress) * 42}px) translateZ(0)`;
      }
      if (arrivalRef.current) {
        arrivalRef.current.style.opacity = String(arrivalOpacity);
        arrivalRef.current.style.transform = `translateY(calc(-50% + ${(1 - arrivalOpacity) * 28}px)) translateZ(0)`;
      }

      if (alive) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [progressRef]);

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
      style={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.42)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/62" />

      <section
        ref={namesRef}
        className="absolute inset-x-6 top-[16svh] mx-auto max-w-4xl text-center md:top-[18vh]"
        style={{ willChange: "transform, opacity" }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.48em] md:text-xs"
          style={{ color: template.palette.gold }}
        >
          {content.eyebrow}
        </p>
        <h1
          className="mt-5 text-balance text-4xl font-normal leading-[1.05] text-white drop-shadow-2xl md:text-7xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {content.partnerOne} &amp; {content.partnerTwo}
        </h1>
      </section>

      <section
        ref={taglineRef}
        className="absolute inset-x-6 bottom-[18svh] mx-auto max-w-2xl text-center md:bottom-[16vh]"
        style={{ willChange: "transform, opacity" }}
      >
        <p
          className="text-pretty text-2xl leading-tight text-[#fff7e8] drop-shadow-xl md:text-5xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {content.taglineLead}
        </p>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-white/80 md:text-base">
          {content.taglineSub}
        </p>
      </section>

      <section
        ref={arrivalRef}
        className="absolute inset-x-5 top-1/2 mx-auto max-w-3xl text-center"
        style={{ willChange: "transform, opacity" }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.5em] md:text-xs"
          style={{ color: template.palette.gold }}
        >
          You are invited
        </p>
        <h2
          className="mt-5 text-balance text-4xl font-normal leading-[1.05] text-white drop-shadow-2xl md:text-7xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {content.arrivalNote}
        </h2>
      </section>
    </div>
  );
}
