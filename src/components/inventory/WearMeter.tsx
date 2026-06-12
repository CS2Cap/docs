import type { WearTier } from "@/lib/item-display";

// CS2 wear band boundaries on the 0–1 float scale.
const BAND_TICKS = [0.07, 0.15, 0.38, 0.45];

// Representative float for each wear tier (band midpoints) — the API does not
// return exact floats, so the marker sits at the centre of the item's wear band.
const TIER_MIDPOINT = [0.035, 0.11, 0.265, 0.415, 0.725];

const TIER_COLOR = [
  "var(--color-success)",
  "hsl(150 60% 50%)",
  "var(--color-warning)",
  "hsl(25 85% 55%)",
  "var(--color-destructive)",
];

/**
 * Wear meter mirroring the reference: a 0–1 track with band-boundary ticks and
 * a colored marker positioned at the centre of the item's wear band. Driven by
 * the wear tier parsed from the real market hash name (no fabricated floats).
 */
export function WearMeter({ tier }: { tier: WearTier }) {
  const pos = TIER_MIDPOINT[tier.index] * 100;
  const color = TIER_COLOR[tier.index];
  return (
    <div className="relative h-[5px] w-full bg-secondary" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(150_65%_45%/0.35),hsl(40_90%_55%/0.35)_55%,hsl(0_72%_51%/0.35))]" />
      {BAND_TICKS.map((t) => (
        <div
          key={t}
          className="absolute top-0 bottom-0 w-px bg-background/80"
          style={{ left: `${t * 100}%` }}
        />
      ))}
      <div
        className="absolute top-[-1px] h-[7px] w-[6px]"
        style={{ left: `calc(${pos}% - 3px)`, background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </div>
  );
}
