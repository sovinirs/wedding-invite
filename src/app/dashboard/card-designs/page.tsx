import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import type { InviteContent } from "@/components/invite/CinematicInvite";
import { ClassicCard } from "@/components/invite/cards/ClassicCard";
import { EditorialCard } from "@/components/invite/cards/EditorialCard";
import { FramedCard } from "@/components/invite/cards/FramedCard";
import { TicketCard } from "@/components/invite/cards/TicketCard";

/**
 * Internal-only review page: every card design, rendered against two
 * different template palettes, so palette adaptability is visible at a
 * glance. Not linked from anywhere — visit directly while signed in.
 */
const SAMPLE: InviteContent = {
  partnerOne: "Arjun",
  partnerTwo: "Meera",
  eyebrow: "The beginning of a sacred day",
  taglineLead: "Two families gather, one story begins.",
  taglineSub: "Scroll through the cinematic entrance and arrive at the invitation.",
  arrivalNote: "Step into the celebration",
  blessing:
    "With the blessings of our elders, we joyfully invite you to witness and celebrate our union.",
  eventDate: "November 14, 2026",
  eventTime: "Reception: 6:30 PM\nMarriage: 9:00 AM - 10:00 AM",
  venueName: "SP Grand Palace",
  mapsUrl: "https://maps.google.com",
  closingNote: "Your presence is our greatest blessing",
};

const DESIGNS = [
  { id: "classic", name: "Classic Ornamental", Card: ClassicCard },
  { id: "editorial", name: "Modern Editorial", Card: EditorialCard },
  { id: "framed", name: "Framed Formal", Card: FramedCard },
  { id: "ticket", name: "Ticket Stub", Card: TicketCard },
];

const PALETTES = [getTemplate("temple-1"), getTemplate("church")];

export default async function CardDesignsPage() {
  if (!(await currentUser())) redirect("/login");

  return (
    <div>
      {DESIGNS.map(({ id, name, Card }) =>
        PALETTES.map((template) => (
          <div key={`${id}-${template.id}`} className="relative">
            <span className="absolute left-3 top-3 z-50 rounded-full bg-black/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white">
              {name} — {template.name}
            </span>
            <Card animate content={SAMPLE} template={template} />
          </div>
        )),
      )}
      <p className="border-t border-black/10 bg-white px-6 py-10 text-center text-xs text-black/40">
        {TEMPLATES.length} templates registered · card-design review page
      </p>
    </div>
  );
}
