import { DashboardLayout } from "@/components/DashboardLayout";
import { X, Plus } from "lucide-react";

const watchlistItems = [
  { id: "ak47-redline", name: "AK-47 | Redline", wear: "Field-Tested", price: "$12.34", change: "+2.1%" },
  { id: "awp-asiimov", name: "AWP | Asiimov", wear: "Battle-Scarred", price: "$28.90", change: "-0.8%" },
  { id: "m4a4-howl", name: "M4A4 | Howl", wear: "Minimal Wear", price: "$4,120.00", change: "+5.3%" },
  { id: "glock-fade", name: "Glock-18 | Fade", wear: "Factory New", price: "$890.50", change: "+1.2%" },
  { id: "deagle-blaze", name: "Desert Eagle | Blaze", wear: "Factory New", price: "$320.00", change: "+0.5%" },
];

export default function Watchlist() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">Items you're tracking.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus size={14} />
          Add Item
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {watchlistItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <span className="text-sm font-medium">{item.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{item.wear}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{item.price}</span>
              <span className={`text-xs font-medium ${item.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                {item.change}
              </span>
              <button className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
