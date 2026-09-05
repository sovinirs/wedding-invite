/**
 * Cinematic templates. Each one is a scroll-scrubbed film plus a looping score,
 * living under /public/templates/<id>/. The film is never played — the scroll
 * position drives `video.currentTime` — so what matters is that it is encoded
 * for seeking (short keyframe interval) and stays small enough to buffer fast.
 *
 * To add a template: drop video.mp4 (+ optional video-mobile.mp4) and music.mp3
 * into public/templates/<id>/, then add an entry here.
 */
export type Template = {
  id: string;
  name: string;
  description: string;
  /** Accent colours used by the invitation card and confetti burst. */
  palette: {
    ink: string;
    accent: string;
    soft: string;
    paper: string;
    gold: string;
    confetti: string[];
  };
};

export const TEMPLATES: Template[] = [
  {
    id: "temple-1",
    name: "Temple Entrance",
    description: "Warm lamplight and stone corridors opening onto the mandapam.",
    palette: {
      ink: "#2b1710",
      accent: "#9b5f36",
      soft: "#c9956a",
      paper: "#fdf6ec",
      gold: "#f6ddad",
      confetti: ["#fdfbf7", "#fdfbf7", "#fdfbf7", "#ff9100", "#ff5e00", "#ffb700", "#e8d5a3"],
    },
  },
  {
    id: "temple-2",
    name: "Gopuram at Dusk",
    description: "Carved towers catch the last light as the temple city hums below.",
    palette: {
      ink: "#2a1922",
      accent: "#a85d3f",
      soft: "#c98f8a",
      paper: "#fbf3ee",
      gold: "#e9c9a8",
      confetti: ["#fdfbf7", "#fdfbf7", "#f0d68a", "#a85d3f", "#8a5a8f", "#e9c9a8", "#c98f8a"],
    },
  },
  {
    id: "garden",
    name: "Garden at Dusk",
    description: "Green light through leaves, strung bulbs coming up at golden hour.",
    palette: {
      ink: "#16241a",
      accent: "#4a7355",
      soft: "#8fb397",
      paper: "#f4f8f1",
      gold: "#d9e7c8",
      confetti: ["#ffffff", "#ffffff", "#e8f3dd", "#8fb397", "#4a7355", "#f0d68a", "#ffd9e0"],
    },
  },
  {
    id: "coast",
    name: "Coastal Morning",
    description: "Pale sand, slow surf and a wide horizon at first light.",
    palette: {
      ink: "#12263a",
      accent: "#3f6d94",
      soft: "#8fb6d4",
      paper: "#f3f8fb",
      gold: "#cfe4f2",
      confetti: ["#ffffff", "#ffffff", "#e0f0fa", "#8fb6d4", "#3f6d94", "#f5e3b8", "#ffc9d4"],
    },
  },
  {
    id: "church",
    name: "Chapel Vows",
    description: "Stained-glass light and a quiet aisle before the vows.",
    palette: {
      ink: "#241827",
      accent: "#7a4f74",
      soft: "#b79bb3",
      paper: "#f8f3f7",
      gold: "#e6d3e2",
      confetti: ["#ffffff", "#ffffff", "#f3e8f1", "#b79bb3", "#7a4f74", "#f0d68a", "#d4a3c9"],
    },
  },
];

export const DEFAULT_TEMPLATE_ID = "temple-1";

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
