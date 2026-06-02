import type { SkinCard as SkinCardData } from "@/lib/browse/taxonomy";
import { SkinCard } from "./SkinCard";

export function SkinGrid({ skins }: { skins: SkinCardData[] }) {
  if (skins.length === 0) {
    return <p className="font-mono text-sm text-muted-foreground">No items found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {skins.map((skin) => (
        <SkinCard key={skin.itemId} skin={skin} />
      ))}
    </div>
  );
}
