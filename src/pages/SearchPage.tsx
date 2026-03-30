import { PublicLayout } from "@/components/PublicLayout";
import { Search as SearchIcon, Filter, ChevronDown } from "lucide-react";
import { useState } from "react";

const mockItems = [
  { id: "ak47-redline", name: "AK-47 | Redline", wear: "Field-Tested", rarity: "Classified", price: "$12.34", category: "Rifle" },
  { id: "awp-asiimov", name: "AWP | Asiimov", wear: "Battle-Scarred", rarity: "Covert", price: "$28.90", category: "Sniper Rifle" },
  { id: "m4a4-howl", name: "M4A4 | Howl", wear: "Minimal Wear", rarity: "Contraband", price: "$4,120.00", category: "Rifle" },
  { id: "glock-fade", name: "Glock-18 | Fade", wear: "Factory New", rarity: "Restricted", price: "$890.50", category: "Pistol" },
  { id: "knife-doppler", name: "★ Karambit | Doppler", wear: "Factory New", rarity: "Covert", price: "$1,250.00", category: "Knife" },
  { id: "usp-kill-confirmed", name: "USP-S | Kill Confirmed", wear: "Minimal Wear", rarity: "Covert", price: "$45.60", category: "Pistol" },
  { id: "m4a1s-hyper-beast", name: "M4A1-S | Hyper Beast", wear: "Field-Tested", rarity: "Covert", price: "$18.20", category: "Rifle" },
  { id: "deagle-blaze", name: "Desert Eagle | Blaze", wear: "Factory New", rarity: "Restricted", price: "$320.00", category: "Pistol" },
];

const rarityColors: Record<string, string> = {
  Contraband: "text-amber-400",
  Covert: "text-red-400",
  Classified: "text-pink-400",
  Restricted: "text-purple-400",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const filtered = mockItems.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <PublicLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold">Item Search</h1>
        <p className="mt-2 text-muted-foreground">Browse and search across CS2 items.</p>

        {/* Search bar */}
        <div className="mt-6 flex gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            <Filter size={14} />
            Filters
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Filter pills placeholder */}
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", "Rifle", "Pistol", "Knife", "Sniper Rifle", "Gloves"].map((cat) => (
            <button
              key={cat}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                cat === "All" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={`/item/${item.id}`}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/20"
            >
              <div className="mb-3 h-28 rounded-md bg-secondary/50" />
              <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{item.name}</h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{item.wear}</span>
                <span className="text-xs">·</span>
                <span className={`text-xs font-medium ${rarityColors[item.rarity] || "text-muted-foreground"}`}>
                  {item.rarity}
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold">{item.price}</div>
            </a>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-12 text-center text-muted-foreground">
            No items found matching "{query}"
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
