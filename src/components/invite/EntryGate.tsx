"use client";

import { useState } from "react";
import type { Template } from "@/lib/templates";

/**
 * Full-screen gate held until the film can be seeked. The tap that dismisses it
 * doubles as the user gesture browsers demand before audio may play.
 */
export function EntryGate({
  videoReady,
  onEnter,
  template,
}: {
  videoReady: boolean;
  onEnter: () => void;
  template: Template;
}) {
  const [mounted, setMounted] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#170f0d]"
      style={{ opacity: dismissed ? 0 : 1, transition: "opacity 700ms ease" }}
      onTransitionEnd={() => dismissed && setMounted(false)}
    >
      <button
        onClick={() => {
          if (!videoReady) return;
          setDismissed(true);
          onEnter();
        }}
        disabled={!videoReady}
        className={`flex flex-col items-center transition-all duration-1000 ${
          videoReady ? "cursor-pointer opacity-100 hover:scale-105" : "cursor-wait opacity-60"
        }`}
      >
        <div
          className={`text-sm font-light uppercase tracking-[0.38em] ${videoReady ? "" : "animate-pulse"}`}
          style={{ fontFamily: "Georgia, serif", color: template.palette.gold }}
        >
          {videoReady ? "Tap to Begin" : "Preparing the invitation"}
        </div>
        <div
          className="mt-6 h-px w-28"
          style={{
            background: `linear-gradient(to right, transparent, ${template.palette.gold}99, transparent)`,
          }}
        />
      </button>
    </div>
  );
}
