/**
 * Minimal monoline garment pictograms — not photography. Attire is picked
 * from a small fixed catalog (see src/lib/attire.ts); these icons stand in
 * for real look photography until that's shot, so the picker isn't just
 * bare text.
 */
type IconProps = { className?: string };

export function LehengaIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 140" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M38 18 Q50 10 62 18 L58 46 L42 46 Z" strokeLinejoin="round" />
      <path d="M42 46 L30 58 M58 46 L70 58" strokeLinecap="round" />
      <path d="M34 46 Q20 90 14 130 L86 130 Q80 90 66 46 Z" strokeLinejoin="round" />
      <path d="M38 46 L20 128 M62 46 L80 128" strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}

export function SareeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 140" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M38 18 Q50 10 62 18 L59 44 L41 44 Z" strokeLinejoin="round" />
      <path d="M42 44 Q26 84 22 130 L78 130 Q74 84 58 44 Z" strokeLinejoin="round" />
      <path d="M46 20 L78 122" strokeLinecap="round" />
      <path d="M46 20 Q40 30 46 40" strokeLinecap="round" opacity={0.6} />
    </svg>
  );
}

export function GownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 140" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M36 16 Q50 8 64 16 L60 52 Q84 92 90 130 L10 130 Q16 92 40 52 Z" strokeLinejoin="round" />
      <path d="M40 52 L60 52" strokeLinecap="round" opacity={0.6} />
    </svg>
  );
}

export function SherwaniIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 140" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M50 10 L38 20 L30 26 L34 112 L66 112 L70 26 L62 20 Z" strokeLinejoin="round" />
      <path d="M50 10 L50 30" strokeLinecap="round" />
      <circle cx="50" cy="44" r="1.6" fill="currentColor" />
      <circle cx="50" cy="58" r="1.6" fill="currentColor" />
      <circle cx="50" cy="72" r="1.6" fill="currentColor" />
      <path d="M40 112 L36 134 M60 112 L64 134" strokeLinecap="round" />
    </svg>
  );
}

export function SuitIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 140" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M50 10 L36 20 L28 26 L33 78 L67 78 L72 26 L64 20 Z" strokeLinejoin="round" />
      <path d="M50 10 L42 30 L50 40 L58 30 Z" strokeLinejoin="round" />
      <path d="M42 78 L38 134 M58 78 L62 134" strokeLinecap="round" />
    </svg>
  );
}

export function KurtaIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 140" className={className} fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M50 12 Q42 12 40 20 L28 28 L32 96 L68 96 L72 28 L60 20 Q58 12 50 12 Z" strokeLinejoin="round" />
      <path d="M42 96 L38 134 M58 96 L62 134" strokeLinecap="round" />
    </svg>
  );
}

export const ATTIRE_ICONS = {
  lehenga: LehengaIcon,
  saree: SareeIcon,
  gown: GownIcon,
  sherwani: SherwaniIcon,
  suit: SuitIcon,
  kurta: KurtaIcon,
} as const;

export type Silhouette = keyof typeof ATTIRE_ICONS;
