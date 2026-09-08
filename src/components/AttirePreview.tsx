"use client";

import Image from "next/image";
import type { AttireLook } from "@/lib/attire";
import type { Template } from "@/lib/templates";
import { templateAssetPaths } from "@/lib/templates";
import { ATTIRE_ICONS } from "./invite/attireIcons";

/**
 * A styled mockup of the selection so far — NOT the AI-generated last
 * frame. That step needs the actual generation pipeline (video-provider
 * integration, job queue) which isn't wired up yet. This exists so the
 * couple can see what they've configured before that's built.
 */
export function AttirePreview({
  template,
  brideLook,
  groomLook,
  bridePhoto,
  groomPhoto,
}: {
  template: Template;
  brideLook: AttireLook | null;
  groomLook: AttireLook | null;
  bridePhoto: string | null;
  groomPhoto: string | null;
}) {
  const poster = templateAssetPaths(template.id).poster;

  return (
    <div className="relative overflow-hidden rounded-sm border border-[#c9956a]/25">
      <div className="absolute inset-0">
        <Image src={poster} alt="" fill sizes="700px" className="object-cover" />
        <div className="absolute inset-0" style={{ background: `${template.palette.ink}b3` }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 py-12 text-center md:flex-row md:justify-center md:gap-16">
        <PersonPreview
          role="Bride"
          look={brideLook}
          photo={bridePhoto}
          accent={template.palette.gold}
        />
        <span className="text-2xl text-white/70" style={{ fontFamily: "Georgia, serif" }}>
          &amp;
        </span>
        <PersonPreview
          role="Groom"
          look={groomLook}
          photo={groomPhoto}
          accent={template.palette.gold}
        />
      </div>

      <p className="relative z-10 border-t border-white/10 bg-black/30 px-6 py-3 text-center text-[10px] uppercase tracking-[0.28em] text-white/70">
        Preview mockup — your personalized film comes later
      </p>
    </div>
  );
}

function PersonPreview({
  role,
  look,
  photo,
  accent,
}: {
  role: string;
  look: AttireLook | null;
  photo: string | null;
  accent: string;
}) {
  const Icon = look ? ATTIRE_ICONS[look.silhouette] : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2"
        style={{ borderColor: accent }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL, not an app asset
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs uppercase tracking-[0.2em] text-white/60">{role}</span>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">{role}</p>
        {look ? (
          <div className="mt-1 flex items-center justify-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-white/80" />}
            <p className="text-sm text-white" style={{ fontFamily: "Georgia, serif" }}>
              {look.name}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-white/50">No attire chosen yet</p>
        )}
      </div>
    </div>
  );
}
