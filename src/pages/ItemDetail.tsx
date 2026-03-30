import { PublicLayout } from "@/components/PublicLayout";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, Bell, ExternalLink } from "lucide-react";

export default function ItemDetail() {
  const { itemId } = useParams();

  return (
    <PublicLayout>
      <div className="container py-8">
        <Link to="/search" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={14} />
          Back to search
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 h-48 rounded-md bg-secondary/50" />
              <h1 className="text-2xl font-bold">AK-47 | Redline</h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <span>Field-Tested</span>
                <span>·</span>
                <span className="text-pink-400 font-medium">Classified</span>
                <span>·</span>
                <span>Rifle</span>
              </div>

              <div className="mt-4 flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-accent">
                  <Eye size={12} />
                  Add to Watchlist
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-accent">
                  <Bell size={12} />
                  Set Alert
                </button>
              </div>
            </div>

            {/* Chart area */}
            <div className="mt-6 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Price History</h2>
                <div className="flex gap-1">
                  {["7D", "30D", "90D", "1Y", "All"].map((range) => (
                    <button
                      key={range}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        range === "30D" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex h-56 items-center justify-center rounded-md bg-secondary/30 text-sm text-muted-foreground">
                Chart placeholder — candle / line data would render here
              </div>
            </div>

            {/* Provider comparison */}
            <div className="mt-6 rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Provider Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-3 text-left font-medium">Provider</th>
                      <th className="pb-3 text-right font-medium">Ask</th>
                      <th className="pb-3 text-right font-medium">Bid</th>
                      <th className="pb-3 text-right font-medium">Last Sale</th>
                      <th className="pb-3 text-right font-medium">Volume (24h)</th>
                      <th className="pb-3 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Provider A", ask: "$12.50", bid: "$11.80", lastSale: "$12.34", volume: "1,240" },
                      { name: "Provider B", ask: "$12.80", bid: "$11.60", lastSale: "$12.10", volume: "890" },
                      { name: "Provider C", ask: "$13.00", bid: "$11.50", lastSale: "$12.45", volume: "560" },
                    ].map((row) => (
                      <tr key={row.name} className="border-b border-border/50">
                        <td className="py-3 font-medium">{row.name}</td>
                        <td className="py-3 text-right">{row.ask}</td>
                        <td className="py-3 text-right">{row.bid}</td>
                        <td className="py-3 text-right">{row.lastSale}</td>
                        <td className="py-3 text-right text-muted-foreground">{row.volume}</td>
                        <td className="py-3 text-right">
                          <ExternalLink size={12} className="inline text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Market Summary</h3>
              <dl className="space-y-3">
                {[
                  { label: "Lowest Ask", value: "$12.50" },
                  { label: "Highest Bid", value: "$11.80" },
                  { label: "Last Sale", value: "$12.34" },
                  { label: "24h Volume", value: "2,690" },
                  { label: "24h Change", value: "+2.1%" },
                  { label: "7d Change", value: "+5.4%" },
                  { label: "30d Change", value: "-1.2%" },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                    <dd className="text-sm font-medium">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Item Details</h3>
              <dl className="space-y-3">
                {[
                  { label: "Weapon", value: "AK-47" },
                  { label: "Skin", value: "Redline" },
                  { label: "Wear", value: "Field-Tested" },
                  { label: "Rarity", value: "Classified" },
                  { label: "Collection", value: "Phoenix Collection" },
                ].map((detail) => (
                  <div key={detail.label} className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">{detail.label}</dt>
                    <dd className="text-sm font-medium">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
