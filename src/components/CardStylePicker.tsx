"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { CARD_STYLES, type CardStyle } from "@/lib/cardStyles";
import type { Template } from "@/lib/templates";
import type { InviteContent } from "./invite/CinematicInvite";

/**
 * Picker for the invitation-details card layout. Grid thumbnails are a
 * static reference render (always the same neutral palette, so the shape
 * of the layout reads clearly); Preview opens a *live* render of the actual
 * component in the couple's real template palette and current details —
 * cheap to do accurately here, unlike video, so we do.
 */
export function CardStylePicker({
  value,
  onChange,
  content,
  template,
}: {
  value: string;
  onChange: (id: string) => void;
  content: InviteContent;
  template: Template;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewStyle = CARD_STYLES.find((c) => c.id === previewId) ?? null;
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function closePreview() {
    const id = previewId;
    setPreviewId(null);
    if (id) triggerRefs.current[id]?.focus();
  }

  return (
    <div>
      <div role="group" aria-label="Invitation card design" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARD_STYLES.map((c) => {
          const selected = c.id === value;
          return (
            <div
              key={c.id}
              className={`relative overflow-hidden rounded-sm border bg-white transition-colors ${
                selected ? "border-[#2b1710]" : "border-[#c9956a]/25 hover:border-[#c9956a]/60"
              }`}
            >
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(c.id)}
                className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9b5f36] focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#fbf7f2]">
                  <Image
                    src={c.poster}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover object-top"
                  />
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2b1710] text-[#fdf6ec]">
                      <CheckIcon />
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <span className="block text-base" style={{ fontFamily: "Georgia, serif", color: "#2b1710" }}>
                    {c.name}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#6b4c3d]">{c.description}</span>
                </div>
              </button>

              <button
                type="button"
                ref={(el) => {
                  triggerRefs.current[c.id] = el;
                }}
                onClick={() => setPreviewId(c.id)}
                aria-label={`Preview ${c.name}`}
                className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <EyeIcon />
                Preview
              </button>
            </div>
          );
        })}
      </div>

      {previewStyle && (
        <PreviewModal
          style={previewStyle}
          content={content}
          template={template}
          onClose={closePreview}
          onSelect={() => {
            onChange(previewStyle.id);
            closePreview();
          }}
        />
      )}
    </div>
  );
}

function PreviewModal({
  style,
  content,
  template,
  onClose,
  onSelect,
}: {
  style: CardStyle;
  content: InviteContent;
  template: Template;
  onClose: () => void;
  onSelect: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const Card = style.Component;

  useEffect(() => {
    closeRef.current?.focus();
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
      className="fixed inset-0 z-50 bg-black/70"
      onClick={onClose}
    >
      {/* Fixed insets (not vh-based centering) so the frame margin is
          guaranteed on any window height, and never sits flush against
          the viewport edge. */}
      <div
        className="absolute inset-6 mx-auto flex max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl md:inset-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/10 px-5 py-4">
          <h3 id={titleId} className="text-lg" style={{ fontFamily: "Georgia, serif", color: "#2b1710" }}>
            {style.name}
          </h3>
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
        {/* min-h-0 is required here: without it, a flex child won't shrink
            below its content's intrinsic height, and the min-h-screen card
            inside would push this box taller than its own bounds instead
            of scrolling internally. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Card animate content={content} template={template} />
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

function EyeIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
