"use client";

import type { AttireLook } from "@/lib/attire";
import { ATTIRE_ICONS } from "./invite/attireIcons";

export function AttirePicker({
  label,
  looks,
  value,
  onChange,
}: {
  label: string;
  looks: AttireLook[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {looks.map((look) => {
        const selected = look.id === value;
        const Icon = ATTIRE_ICONS[look.silhouette];
        return (
          <button
            key={look.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(look.id)}
            className={`flex flex-col items-center gap-2 rounded-sm border p-4 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9b5f36] focus-visible:ring-offset-2 ${
              selected ? "border-[#2b1710] bg-white" : "border-[#c9956a]/25 bg-white/60 hover:bg-white"
            }`}
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: `${look.color}22`, color: look.color }}
            >
              <Icon className="h-9 w-9" />
            </span>
            <span className="text-sm" style={{ fontFamily: "Georgia, serif", color: "#2b1710" }}>
              {look.name}
            </span>
            <span className="text-[11px] leading-4 text-[#8a6b5c]">{look.description}</span>
          </button>
        );
      })}
    </div>
  );
}
