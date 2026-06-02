import type { RarityGroup } from "@/lib/browse/taxonomy";
import { SkinGrid } from "./SkinGrid";

// Renders rarity-bucketed skin grids (rarest first), each under a
// rarity-colored heading. Used on case/collection detail pages.
export function RaritySections({ groups }: { groups: RarityGroup[] }) {
  if (groups.length === 0) {
    return <p className="font-mono text-sm text-muted-foreground">No items found.</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.rarityName ?? "unknown"}>
          <h3
            className="mb-3 border-l-4 pl-2 font-mono text-sm font-semibold uppercase tracking-wider"
            style={
              group.rarityColor
                ? { borderLeftColor: `#${group.rarityColor}`, color: `#${group.rarityColor}` }
                : undefined
            }
          >
            {group.rarityName ?? "Unknown"}
          </h3>
          <SkinGrid skins={group.skins} />
        </section>
      ))}
    </div>
  );
}
