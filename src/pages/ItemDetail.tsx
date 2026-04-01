import { PublicLayout } from "@/components/PublicLayout";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, Bell, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Generate realistic price history data
function generatePriceData(days: number) {
  const data = [];
  let price = 12.0;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    price += (Math.random() - 0.48) * 0.6;
    price = Math.max(price, 8);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: parseFloat(price.toFixed(2)),
    });
  }
  return data;
}

const rangeMap: Record<string, number> = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365, "All": 730 };

export default function ItemDetail() {
  const { itemId } = useParams();
  const [range, setRange] = useState("30D");
  const priceData = generatePriceData(rangeMap[range]);

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

            {/* Price history chart */}
            <div className="mt-6 rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Price History</h2>
                <div className="flex gap-1">
                  {Object.keys(rangeMap).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceData}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(187 85% 53%)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(187 85% 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 15% 18%)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "hsl(222 10% 50%)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      tick={{ fill: "hsl(222 10% 50%)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(222 25% 9%)",
                        border: "1px solid hsl(222 15% 18%)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(222 10% 60%)" }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(187 85% 53%)"
                      fill="url(#priceGrad)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "hsl(187 85% 53%)", stroke: "hsl(222 25% 9%)", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
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
