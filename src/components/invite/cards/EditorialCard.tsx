"use client";

import type { Template } from "@/lib/templates";
import type { InviteContent } from "../CinematicInvite";
import { Confetti } from "../Confetti";

/** Left-aligned, masthead-scale type, a pull-quote blessing. Restrained. */
export function EditorialCard({
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
      className="relative min-h-screen overflow-hidden px-6 py-20 md:px-16 md:py-28"
      style={{ background: template.palette.paper, color: template.palette.ink }}
    >
      <Confetti active={animate} colors={template.palette.confetti} />

      <div className="relative z-10 mx-auto max-w-4xl">
        <div
          className={`${first} flex items-center gap-4 text-[11px] uppercase tracking-[0.5em]`}
          style={{ color: template.palette.accent }}
        >
          <span className="h-px w-10" style={{ background: template.palette.accent }} />
          Wedding Invitation
        </div>

        <h2
          className={`${animate ? "invitation-enter invitation-enter-delay-1" : "opacity-0"} mt-8 text-balance text-6xl font-normal leading-[0.95] md:text-8xl`}
          style={{ fontFamily: "Georgia, serif" }}
        >
          {content.partnerOne}
          <span className="my-1 block text-3xl md:my-2 md:text-4xl" style={{ color: template.palette.soft }}>
            &amp;
          </span>
          {content.partnerTwo}
        </h2>

        <p
          className={`${animate ? "invitation-enter invitation-enter-delay-2" : "opacity-0"} mt-10 max-w-xl border-l-2 pl-6 text-lg italic leading-8 md:text-xl`}
          style={{ borderColor: template.palette.soft, color: template.palette.ink }}
        >
          &ldquo;{content.blessing}&rdquo;
        </p>

        <div
          className={`${animate ? "invitation-enter invitation-enter-delay-3" : "opacity-0"} mt-16 grid gap-8 border-t pt-8 sm:grid-cols-3`}
          style={{ borderColor: `${template.palette.soft}55` }}
        >
          <EditorialDetail label="Date" value={content.eventDate} template={template} />
          <EditorialDetail label="Time & Ceremony" value={content.eventTime} template={template} />
          <EditorialDetail label="Venue" value={content.venueName} template={template} />
        </div>

        {content.mapsUrl && (
          <a
            href={content.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${animate ? "invitation-enter invitation-enter-delay-4" : "opacity-0"} mt-8 inline-flex items-center gap-2 text-sm tracking-wide underline`}
            style={{ color: template.palette.accent }}
          >
            View on Google Maps
          </a>
        )}

        <p
          className={`${animate ? "invitation-enter invitation-enter-delay-5" : "opacity-0"} mt-20 text-xs uppercase tracking-[0.4em]`}
          style={{ color: template.palette.accent }}
        >
          {content.closingNote}
        </p>
      </div>
    </section>
  );
}

function EditorialDetail({
  label,
  value,
  template,
}: {
  label: string;
  value: string;
  template: Template;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: template.palette.accent }}>
        {label}
      </p>
      <p
        className="whitespace-pre-wrap text-base leading-snug"
        style={{ fontFamily: "Georgia, serif", color: template.palette.ink }}
      >
        {value}
      </p>
    </div>
  );
}
