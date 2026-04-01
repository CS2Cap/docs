import { Eye, Bell, Star } from "lucide-react";

const wearLabels = ["FN", "MW", "FT", "WW", "BS"];
const wearColors = ["text-green-400", "text-green-300", "text-yellow-400", "text-orange-400", "text-red-400"];

interface ItemSidebarProps {
  itemName: string;
  skinName: string;
  wear: string;
  rarity: string;
  rarityColor: string;
  lowestPrice: string;
  avgPrice: string;
  collection: string;
  floatValue: number;
}

export function ItemSidebar({
  itemName = "AK-47",
  skinName = "Redline",
  wear = "Field-Tested",
  rarity = "Classified",
  rarityColor = "text-pink-400",
  lowestPrice = "$12.50",
  avgPrice = "$13.20",
  collection = "Phoenix Collection",
  floatValue = 0.28,
}: ItemSidebarProps) {
  return (
    <div className="space-y-4">
      {/* Item image + name */}
      <div className="rounded-lg border border-border bg-card p-5">
        <span className={`inline-block text-xs font-semibold ${rarityColor} mb-3`}>● {rarity}</span>
        <div className="mx-auto mb-4 h-44 w-full rounded-md bg-secondary/40 flex items-center justify-center">
          <span className="text-muted-foreground text-xs">Item Preview</span>
        </div>

        <h1 className="font-display text-xl font-bold leading-tight">
          {itemName} | {skinName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{wear}</p>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Lowest Price:</span>
          <span className="font-semibold text-primary">{lowestPrice}</span>
          <span className="text-muted-foreground ml-2">Avg:</span>
          <span className="font-medium">{avgPrice}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-accent transition-colors">
            <Eye size={12} />
            Watchlist
          </button>
          <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
            <Bell size={12} />
            Price Alert
          </button>
        </div>
      </div>

      {/* Float Range */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Float Range</h3>
        <p className="text-xs text-muted-foreground mb-2">
          The float value indicates an item's visible wear—lower values mean it's in better condition.
        </p>
        <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-yellow-400 via-orange-400 to-red-500">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-foreground border-2 border-background"
            style={{ left: `${floatValue * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>0</span>
          <span>1</span>
        </div>
        <div className="flex justify-between mt-2">
          {wearLabels.map((label, i) => (
            <span key={label} className={`text-[10px] font-medium ${wearColors[i]}`}>{label}</span>
          ))}
        </div>
      </div>

      {/* Item Summary */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Item Summary</h3>
        <dl className="space-y-2.5 text-sm">
          {[
            { label: "Weapon", value: itemName },
            { label: "Skin", value: skinName },
            { label: "Wear", value: wear },
            { label: "Rarity", value: rarity, valueClass: rarityColor },
            { label: "Collection", value: collection },
            { label: "Category", value: "Rifle" },
            { label: "Team", value: "Terrorist" },
            { label: "Float Range", value: "0.06 – 0.80" },
            { label: "Price Range", value: "$8.50 – $42.00" },
            { label: "Market Listings", value: "1,847" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className={`font-medium ${row.valueClass || ""}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Collection */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Collection</h3>
        <div className="flex items-center gap-3 rounded-md bg-secondary/50 p-3">
          <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">
            <Star size={14} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{collection}</p>
            <p className="text-xs text-muted-foreground">Case collection</p>
          </div>
        </div>
      </div>
    </div>
  );
}
