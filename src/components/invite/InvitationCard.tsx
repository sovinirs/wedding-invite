"use client";

import type { Template } from "@/lib/templates";
import type { InviteContent } from "./CinematicInvite";
import { Confetti } from "./Confetti";

function Detail({
  label,
  value,
  delayClass,
  template,
}: {
  label: string;
  value: string;
  delayClass: string;
  template: Template;
}) {
  return (
    <div
      className={`invitation-enter ${delayClass} flex flex-col gap-1 rounded-sm border px-6 py-5 text-center`}
      style={{ borderColor: `${template.palette.soft}33`, background: "#fffaf4" }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.46em]"
        style={{ color: template.palette.accent }}
      >
        {label}
      </p>
      <p
        className="mt-1 whitespace-pre-wrap text-base leading-snug md:text-lg"
        style={{ fontFamily: "Georgia, serif", color: template.palette.ink }}
      >
        {value}
      </p>
    </div>
  );
}

function Ornament({ template, className = "" }: { template: Template; className?: string }) {
  return (
    <div className={`w-full max-w-sm ${className}`}>
      <div
        className="ornament-line text-base"
        style={
          {
            color: `${template.palette.soft}b3`,
            "--ornament-rule": `${template.palette.soft}80`,
          } as React.CSSProperties
        }
      >
        ✦
      </div>
    </div>
  );
}

export function InvitationCard({
  animate,
  content,
  template,
}: {
  animate: boolean;
  content: InviteContent;
  template: Template;
}) {
  const first = animate ? "invitation-enter" : "opacity-0";

  return (
    <section
      className="relative z-30 min-h-screen overflow-hidden px-5 py-20 md:px-10 md:py-28"
      style={{ background: template.palette.paper, color: template.palette.ink }}
    >
      <Confetti active={animate} colors={template.palette.confetti} />

      <div className="relative z-10 mx-auto mb-14 max-w-md">
        <Ornament template={template} />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <p
          className={`${first} text-[11px] uppercase tracking-[0.56em] md:text-xs`}
          style={{ color: template.palette.accent }}
        >
          Wedding Invitation
        </p>

        <h2
          className="invitation-enter invitation-enter-delay-1 mt-6 flex flex-col items-center text-balance text-5xl font-normal leading-tight md:block md:text-7xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          <span className="block md:inline">{content.partnerOne}</span>
          <span
            className="my-2 block text-3xl md:mx-4 md:my-0 md:inline md:text-inherit"
            style={{ color: template.palette.soft }}
          >
            &amp;
          </span>
          <span className="block md:inline">{content.partnerTwo}</span>
        </h2>

        <Ornament template={template} className="invitation-enter invitation-enter-delay-2 mt-10" />

        <p
          className="invitation-enter invitation-enter-delay-3 mt-10 max-w-xl text-lg leading-8 md:text-2xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {content.blessing}
        </p>

        <div className="mt-14 grid w-full gap-4 sm:grid-cols-3">
          <Detail label="Date" value={content.eventDate} delayClass="invitation-enter-delay-3" template={template} />
          <Detail label="Time & Ceremony" value={content.eventTime} delayClass="invitation-enter-delay-4" template={template} />
          <Detail label="Venue" value={content.venueName} delayClass="invitation-enter-delay-5" template={template} />
        </div>

        {content.mapsUrl && (
          <a
            href={content.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="invitation-enter invitation-enter-delay-5 mt-8 inline-flex items-center gap-2 text-sm tracking-wide underline transition-colors"
            style={{ color: template.palette.accent }}
          >
            View on Google Maps
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}

        <Ornament template={template} className="invitation-enter invitation-enter-delay-5 mt-14" />

        <p
          className="invitation-enter invitation-enter-delay-5 mt-10 text-xs uppercase tracking-[0.5em]"
          style={{ color: template.palette.accent }}
        >
          {content.closingNote}
        </p>
      </div>
    </section>
  );
}
