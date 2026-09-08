import type { Silhouette } from "@/components/invite/attireIcons";

/**
 * Attire is a SELECTION from a fixed catalog — never free text, never a
 * garment photo upload (see project brief). Looks are grouped by attire
 * category, one category per cinematic mood; temple-1 and temple-2 share
 * the "temple" category since they're the same wedding tradition.
 *
 * Icons stand in for real look photography (see attireIcons.tsx) until
 * that's shot — swap `silhouette` for a real `poster` image path then,
 * same shape as templates.ts/cardStyles.ts.
 */
export type AttireLook = {
  id: string;
  name: string;
  description: string;
  /** The garment's own color — independent of the venue's palette. */
  color: string;
  silhouette: Silhouette;
};

export type AttireCategory = {
  bride: AttireLook[];
  groom: AttireLook[];
};

export const ATTIRE_CATALOG: Record<string, AttireCategory> = {
  temple: {
    bride: [
      {
        id: "temple-bride-crimson-lehenga",
        name: "Crimson Silk Lehenga",
        description: "Zari-embroidered red silk with a heavy dupatta drape.",
        color: "#9b1c1c",
        silhouette: "lehenga",
      },
      {
        id: "temple-bride-gold-kanjivaram",
        name: "Gold Kanjivaram Saree",
        description: "Temple-border silk in warm gold, draped traditionally.",
        color: "#b8860b",
        silhouette: "saree",
      },
      {
        id: "temple-bride-maroon-saree",
        name: "Maroon Silk Saree",
        description: "Deep maroon silk with a contrast woven pallu.",
        color: "#6b1f2a",
        silhouette: "saree",
      },
    ],
    groom: [
      {
        id: "temple-groom-cream-sherwani",
        name: "Cream Silk Sherwani",
        description: "Hand-embroidered cream silk with a stand collar.",
        color: "#cdbb8e",
        silhouette: "sherwani",
      },
      {
        id: "temple-groom-maroon-bandhgala",
        name: "Maroon Bandhgala",
        description: "Tailored bandhgala in deep maroon with gold buttons.",
        color: "#6b1f2a",
        silhouette: "sherwani",
      },
      {
        id: "temple-groom-ivory-kurta",
        name: "Ivory Silk Kurta",
        description: "Simple raw-silk kurta and dhoti in ivory.",
        color: "#cdbfa0",
        silhouette: "kurta",
      },
    ],
  },
  garden: {
    bride: [
      {
        id: "garden-bride-blush-lehenga",
        name: "Blush Floral Lehenga",
        description: "Soft blush lehenga with hand-painted floral motifs.",
        color: "#c98a92",
        silhouette: "lehenga",
      },
      {
        id: "garden-bride-sage-anarkali",
        name: "Sage Anarkali Gown",
        description: "Flowing sage-green anarkali with light embroidery.",
        color: "#6f8a68",
        silhouette: "gown",
      },
      {
        id: "garden-bride-pastel-saree",
        name: "Pastel Organza Saree",
        description: "Airy organza in soft pastel, garden-party ready.",
        color: "#a9b98f",
        silhouette: "saree",
      },
    ],
    groom: [
      {
        id: "garden-groom-sage-bandhgala",
        name: "Sage Linen Bandhgala",
        description: "Relaxed linen bandhgala in muted sage.",
        color: "#5f7a58",
        silhouette: "sherwani",
      },
      {
        id: "garden-groom-beige-kurta",
        name: "Beige Linen Kurta",
        description: "Breathable linen kurta for an outdoor ceremony.",
        color: "#b9a67e",
        silhouette: "kurta",
      },
      {
        id: "garden-groom-grey-suit",
        name: "Soft Grey Suit",
        description: "Unstructured linen-blend suit in soft grey.",
        color: "#7c7c72",
        silhouette: "suit",
      },
    ],
  },
  coast: {
    bride: [
      {
        id: "coast-bride-ivory-gown",
        name: "Ivory Flowing Gown",
        description: "Lightweight chiffon gown that moves with the sea breeze.",
        color: "#cfc4a8",
        silhouette: "gown",
      },
      {
        id: "coast-bride-seafoam-saree",
        name: "Seafoam Chiffon Saree",
        description: "Sheer seafoam chiffon, barefoot-ceremony ready.",
        color: "#79a89c",
        silhouette: "saree",
      },
      {
        id: "coast-bride-sand-lehenga",
        name: "Sand-Toned Lehenga",
        description: "Light, breathable lehenga in warm sand tones.",
        color: "#c2a878",
        silhouette: "lehenga",
      },
    ],
    groom: [
      {
        id: "coast-groom-linen-suit",
        name: "White Linen Suit",
        description: "Breathable linen suit, barefoot on the sand.",
        color: "#d9d3bd",
        silhouette: "suit",
      },
      {
        id: "coast-groom-sky-kurta",
        name: "Sky Linen Kurta",
        description: "Pale blue linen kurta for a relaxed morning ceremony.",
        color: "#8fadbb",
        silhouette: "kurta",
      },
      {
        id: "coast-groom-cream-blazer",
        name: "Cream Blazer & Trousers",
        description: "Unlined cream blazer over linen trousers.",
        color: "#c9b98f",
        silhouette: "suit",
      },
    ],
  },
  church: {
    bride: [
      {
        id: "church-bride-classic-gown",
        name: "Classic White Gown",
        description: "Timeless silk gown with a cathedral train.",
        color: "#d8d2c2",
        silhouette: "gown",
      },
      {
        id: "church-bride-lace-gown",
        name: "Lace Ballgown",
        description: "Full ballgown with a hand-appliquéd lace bodice.",
        color: "#cfc6ac",
        silhouette: "gown",
      },
      {
        id: "church-bride-satin-gown",
        name: "Satin A-Line Gown",
        description: "Sleek satin a-line with a long cathedral veil.",
        color: "#c9bc9c",
        silhouette: "gown",
      },
    ],
    groom: [
      {
        id: "church-groom-black-tux",
        name: "Classic Black Tuxedo",
        description: "Peak-lapel tuxedo with a silk bow tie.",
        color: "#232323",
        silhouette: "suit",
      },
      {
        id: "church-groom-navy-suit",
        name: "Navy Three-Piece Suit",
        description: "Tailored navy three-piece with a pocket square.",
        color: "#28324a",
        silhouette: "suit",
      },
      {
        id: "church-groom-charcoal-suit",
        name: "Charcoal Grey Suit",
        description: "Modern slim-fit charcoal suit.",
        color: "#454545",
        silhouette: "suit",
      },
    ],
  },
};

/** Which attire category a cinematic template pulls its looks from. */
const CATEGORY_BY_TEMPLATE: Record<string, string> = {
  "temple-1": "temple",
  "temple-2": "temple",
  garden: "garden",
  coast: "coast",
  church: "church",
};

export function getAttireCategory(templateId: string): AttireCategory {
  const key = CATEGORY_BY_TEMPLATE[templateId] ?? "temple";
  return ATTIRE_CATALOG[key];
}

export function getAttireLook(templateId: string, role: "bride" | "groom", lookId: string): AttireLook | null {
  const category = getAttireCategory(templateId);
  return category[role].find((look) => look.id === lookId) ?? null;
}
