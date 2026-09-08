import type { ComponentType } from "react";
import type { Template } from "@/lib/templates";
import type { InviteContent } from "@/components/invite/CinematicInvite";
import { ClassicCard } from "@/components/invite/cards/ClassicCard";
import { EditorialCard } from "@/components/invite/cards/EditorialCard";
import { FramedCard } from "@/components/invite/cards/FramedCard";
import { TicketCard } from "@/components/invite/cards/TicketCard";

export type CardComponent = ComponentType<{
  animate: boolean;
  content: InviteContent;
  template: Template;
}>;

export type CardStyle = {
  id: string;
  name: string;
  description: string;
  /** Static thumbnail for the picker grid — always rendered in a neutral
   *  reference palette; the preview modal shows the couple's actual one. */
  poster: string;
  Component: CardComponent;
};

export const CARD_STYLES: CardStyle[] = [
  {
    id: "classic",
    name: "Classic Ornamental",
    description: "Centered, symmetrical, boxed detail cards with fading rule dividers.",
    poster: "/card-styles/classic/poster.jpg",
    Component: ClassicCard,
  },
  {
    id: "editorial",
    name: "Modern Editorial",
    description: "Left-aligned masthead type and a pull-quote blessing. Restrained.",
    poster: "/card-styles/editorial/poster.jpg",
    Component: EditorialCard,
  },
  {
    id: "framed",
    name: "Framed Formal",
    description: "A double-rule frame and a monogram seal. Engraved-invitation feel.",
    poster: "/card-styles/framed/poster.jpg",
    Component: FramedCard,
  },
  {
    id: "ticket",
    name: "Ticket Stub",
    description: "A boarding-pass layout with a die-cut perforation. Playful, modern.",
    poster: "/card-styles/ticket/poster.jpg",
    Component: TicketCard,
  },
];

export const DEFAULT_CARD_STYLE_ID = "classic";

export function getCardStyle(id: string): CardStyle {
  return CARD_STYLES.find((c) => c.id === id) ?? CARD_STYLES[0];
}
