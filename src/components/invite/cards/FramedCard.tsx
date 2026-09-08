"use client";

import type { Template } from "@/lib/templates";
import type { InviteContent } from "../CinematicInvite";
import { Confetti } from "../Confetti";

/** A double-rule frame, a monogram seal, formal engraved-invitation feel. */
export function FramedCard({
  animate,
  content,
  template,
}: {
  animate: boolean;
  content: InviteContent;
  template: Template;
}) {
  const first = animate ? "invitation-enter" : "opacity-0";
  const initials = `${content.partnerOne.charAt(0)}${content.partnerTwo.charAt(0)}`.toUpperCase();

  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16 md:px-10 md:py-24"
      style={{ background: template.palette.paper, color: template.palette.ink }}
    >
      <Confetti active={animate} colors={template.palette.confetti} />

      <div
        className={`${first} relative z-10 mx-auto w-full max-w-2xl border-2 px-8 py-16 text-center md:px-16 md:py-20`}
        style={{ borderColor: `${template.palette.soft}90` }}
      >
        <div className="pointer-events-none absolute inset-3" style={{ border: `1px solid ${template.palette.soft}45` }} />

        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 text-base"
          style={{ background: template.palette.paper, color: template.palette.accent }}
        >
          &#10022;
        </span>

        <div
          className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full border"
          style={{ borderColor: template.palette.soft, color: template.palette.accent }}
        >
          <span className="text-xl" style={{ fontFamily: "Georgia, serif" }}>
            {initials}
          </span>
        </div>

        <p
          className="relative z-10 mt-6 text-[11px] uppercase tracking-[0.5em]"
          style={{ color: template.palette.accent }}
        >
          Wedding Invitation
        </p>

        <h2
          className="relative z-10 mt-6 text-balance text-4xl font-normal leading-[1.05] md:text-6xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {content.partnerOne}
          <span className="mx-3" style={{ color: template.palette.soft }}>
            &amp;
          </span>
          {content.partnerTwo}
        </h2>

        <Rule template={template} />

        <p className="relative z-10 mt-8 text-base leading-8 md:text-lg">{content.blessing}</p>

        <div className="relative z-10 mt-10 flex flex-col gap-4 text-sm">
          <FramedDetail label="Date" value={content.eventDate} template={template} />
          <FramedDetail label="Time & Ceremony" value={content.eventTime} template={template} />
          <FramedDetail label="Venue" value={content.venueName} template={template} />
        </div>

        {content.mapsUrl && (
          <a
            href={content.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 mt-8 inline-flex items-center gap-2 text-sm tracking-wide underline"
            style={{ color: template.palette.accent }}
          >
            View on Google Maps
          </a>
        )}

        <Rule template={template} />

        <p className="relative z-10 mt-8 text-xs uppercase tracking-[0.5em]" style={{ color: template.palette.accent }}>
          {content.closingNote}
        </p>
      </div>
    </section>
  );
}

function Rule({ template }: { template: Template }) {
  return (
    <div
      className="relative z-10 mx-auto mt-8 h-px w-24"
      style={{ background: `${template.palette.soft}90` }}
    />
  );
}

function FramedDetail({
  label,
  value,
  template,
}: {
  label: string;
  value: string;
  template: Template;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: template.palette.accent }}>
        {label}
      </p>
      <p
        className="mt-1 whitespace-pre-wrap text-base leading-snug"
        style={{ fontFamily: "Georgia, serif", color: template.palette.ink }}
      >
        {value}
      </p>
    </div>
  );
}
