"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { templateAssetPaths, type Template } from "@/lib/templates";

/**
 * Template picker with a real visual preview, not just a name and a colour
 * swatch. Cards show a poster still (cheap, always loaded); the actual
 * video only loads if someone explicitly asks to preview it, so a page
 * with five templates never ships five videos' worth of data up front.
 */
export function CinematicPicker({
  templates,
  value,
  onChange,
}: {
  templates: Template[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTemplate = templates.find((t) => t.id === previewId) ?? null;
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function closePreview() {
    const id = previewId;
    setPreviewId(null);
    if (id) triggerRefs.current[id]?.focus();
  }

  return (
    <div>
      <div role="group" aria-label="Cinematic template" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const selected = t.id === value;
          const assets = templateAssetPaths(t.id);
          return (
            <div
              key={t.id}
              className={`relative overflow-hidden rounded-sm border bg-white transition-colors ${
                selected ? "border-[#2b1710]" : "border-[#c9956a]/25 hover:border-[#c9956a]/60"
              }`}
            >
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(t.id)}
                className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9b5f36] focus-visible:ring-offset-2"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-[#120c0b]">
                  <Image
                    src={assets.poster}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2b1710] text-[#fdf6ec]">
                      <CheckIcon />
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <span
                    className="block text-lg"
                    style={{ fontFamily: "Georgia, serif", color: t.palette.ink }}
                  >
                    {t.name}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#6b4c3d]">{t.description}</span>
                </div>
              </button>

              <button
                type="button"
                ref={(el) => {
                  triggerRefs.current[t.id] = el;
                }}
                onClick={() => setPreviewId(t.id)}
                aria-label={`Preview ${t.name}`}
                className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <PlayIcon />
                Preview
              </button>
            </div>
          );
        })}
      </div>

      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={closePreview}
          onSelect={() => {
            onChange(previewTemplate.id);
            closePreview();
          }}
        />
      )}
    </div>
  );
}

function PreviewModal({
  template,
  onClose,
  onSelect,
}: {
  template: Template;
  onClose: () => void;
  onSelect: () => void;
}) {
  const assets = templateAssetPaths(template.id);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    setAutoplay(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-sm bg-[#120c0b]" onClick={(e) => e.stopPropagation()}>
        <video
          src={assets.video}
          poster={assets.poster}
          muted
          loop
          playsInline
          controls
          autoPlay={autoplay}
          className="aspect-video w-full bg-black"
        />
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#fdf6ec] px-5 py-4">
          <div>
            <h3 id={titleId} className="text-lg" style={{ fontFamily: "Georgia, serif", color: "#2b1710" }}>
              {template.name}
            </h3>
            <p className="text-xs text-[#6b4c3d]">{template.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="text-xs uppercase tracking-[0.2em] text-[#9b5f36]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onSelect}
              className="rounded-sm bg-[#2b1710] px-5 py-2.5 text-xs uppercase tracking-[0.24em] text-[#fdf6ec] transition-colors hover:bg-[#3f2318]"
            >
              Select this
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
