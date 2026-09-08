"use client";

import type { Template } from "@/lib/templates";
import type { InviteContent } from "../CinematicInvite";
import { Confetti } from "../Confetti";

/** A boarding-pass / event-ticket layout — playful, modern, shareable. */
export function TicketCard({
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
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16 md:px-10 md:py-24"
      style={{ background: template.palette.paper, color: template.palette.ink }}
    >
      <Confetti active={animate} colors={template.palette.confetti} />

      <div
        className={`${first} relative z-10 mx-auto w-full max-w-xl overflow-hidden rounded-2xl shadow-xl`}
        style={{ background: "#fffefb" }}
      >
        <div className="px-8 py-12 text-center md:px-12" style={{ background: template.palette.ink }}>
          <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: template.palette.gold }}>
            Wedding Invitation
          </p>
          <h2
            className="mt-5 text-balance text-4xl font-normal leading-[1.05] md:text-5xl"
            style={{ fontFamily: "Georgia, serif", color: template.palette.paper }}
          >
            {content.partnerOne} &amp; {content.partnerTwo}
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-6" style={{ color: `${template.palette.paper}cc` }}>
            {content.blessing}
          </p>
        </div>

        <div className="relative h-0">
          <div
            className="absolute -left-3.5 -top-3.5 h-7 w-7 rounded-full"
            style={{ background: template.palette.paper }}
          />
          <div
            className="absolute -right-3.5 -top-3.5 h-7 w-7 rounded-full"
            style={{ background: template.palette.paper }}
          />
          <div
            className="absolute left-3 right-3 top-0 border-t-2 border-dashed"
            style={{ borderColor: `${template.palette.soft}` }}
          />
        </div>

        <div className="grid grid-cols-3 px-4 py-8 text-center md:px-8">
          <TicketDetail label="Date" value={content.eventDate} template={template} bordered={false} />
          <TicketDetail label="Time" value={content.eventTime} template={template} bordered />
          <TicketDetail label="Venue" value={content.venueName} template={template} bordered />
        </div>

        {content.mapsUrl && (
          <div className="pb-6 text-center">
            <a
              href={content.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm tracking-wide underline"
              style={{ color: template.palette.accent }}
            >
              View on Google Maps
            </a>
          </div>
        )}

        <p
          className="pb-8 text-center text-[10px] uppercase tracking-[0.4em]"
          style={{ color: template.palette.accent }}
        >
          {content.closingNote}
        </p>
      </div>
    </section>
  );
}

function TicketDetail({
  label,
  value,
  template,
  bordered,
}: {
  label: string;
  value: string;
  template: Template;
  bordered: boolean;
}) {
  return (
    <div
      className="px-2"
      style={bordered ? { borderLeft: `1px solid ${template.palette.soft}55` } : undefined}
    >
      <p className="text-[9px] uppercase tracking-[0.32em]" style={{ color: template.palette.accent }}>
        {label}
      </p>
      <p
        className="mt-2 whitespace-pre-wrap text-sm leading-snug"
        style={{ fontFamily: "Georgia, serif", color: template.palette.ink }}
      >
        {value}
      </p>
    </div>
  );
}
