import { PublicLayout } from "@/components/PublicLayout";
import { useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ItemSidebar } from "@/components/item/ItemSidebar";
import { ProviderTable } from "@/components/item/ProviderTable";
import { PriceChart } from "@/components/item/PriceChart";
import { SimilarItems } from "@/components/item/SimilarItems";

export default function ItemDetail() {
  const { itemId } = useParams();

  return (
    <PublicLayout>
      <div className="container py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/search" className="hover:text-foreground transition-colors">Browse Skins</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-medium">AK-47 | Redline (Field-Tested)</span>
        </nav>

        {/* Wear condition tabs */}
        <div className="flex gap-1 mb-6 rounded-lg border border-border bg-card p-1 w-fit">
          {["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"].map((w, i) => (
            <button
              key={w}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                i === 2 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left sidebar */}
          <aside className="order-2 lg:order-1">
            <ItemSidebar
              itemName="AK-47"
              skinName="Redline"
              wear="Field-Tested"
              rarity="Classified"
              rarityColor="text-pink-400"
              lowestPrice="$12.50"
              avgPrice="$13.20"
              collection="Phoenix Collection"
              floatValue={0.28}
            />
          </aside>

          {/* Main content */}
          <div className="order-1 lg:order-2 space-y-6">
            <ProviderTable />
            <PriceChart />
            <SimilarItems />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
