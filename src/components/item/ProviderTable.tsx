import { ExternalLink } from "lucide-react";

const providers = [
  { name: "CSFloat", rating: 4.8, listings: 12440, price: "$12.50", trend: "+1.2%", trendUp: true, qty: 132 },
  { name: "Skinport", rating: 4.7, listings: 35201, price: "$12.80", trend: "-0.3%", trendUp: false, qty: 18 },
  { name: "DMarket", rating: 4.4, listings: 21244, price: "$12.95", trend: "+0.8%", trendUp: true, qty: 4 },
  { name: "SkinSwap", rating: 4.0, listings: 1078, price: "$13.10", trend: "+2.1%", trendUp: true, qty: 221 },
  { name: "Tradeit", rating: 4.7, listings: 10651, price: "$13.25", trend: "-0.5%", trendUp: false, qty: 9 },
  { name: "CSMoney", rating: 4.0, listings: 13611, price: "$13.40", trend: "+0.2%", trendUp: true, qty: 62 },
  { name: "GameBoost", rating: 4.4, listings: 17626, price: "$13.55", trend: "+1.5%", trendUp: true, qty: 39 },
  { name: "LisSkins", rating: 4.9, listings: 2869, price: "$13.70", trend: "-1.1%", trendUp: false, qty: 98 },
  { name: "ShadowPay", rating: 4.0, listings: 838, price: "$13.85", trend: "+0.6%", trendUp: true, qty: 73 },
  { name: "WhiteMarket", rating: 4.3, listings: 729, price: "$14.20", trend: "+0.9%", trendUp: true, qty: 102 },
];

export function ProviderTable() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold">Marketplace Offers</h2>
        <p className="text-xs text-muted-foreground mt-1">Compare prices across {providers.length} providers</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="px-5 py-3 text-left font-medium">Provider</th>
              <th className="px-5 py-3 text-right font-medium">QTY</th>
              <th className="px-5 py-3 text-right font-medium">Price</th>
              <th className="px-5 py-3 text-right font-medium">24h</th>
              <th className="px-5 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => (
              <tr key={p.name} className={`border-b border-border/40 hover:bg-secondary/30 transition-colors ${i === 0 ? "bg-primary/5" : ""}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {p.name[0]}
                    </div>
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-yellow-400 text-[10px]">★</span>
                        <span className="text-[10px] text-muted-foreground">{p.rating}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({p.listings.toLocaleString()})</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-right text-muted-foreground">{p.qty}</td>
                <td className="px-5 py-3 text-right font-semibold">{p.price}</td>
                <td className={`px-5 py-3 text-right text-xs font-medium ${p.trendUp ? "text-green-400" : "text-red-400"}`}>
                  {p.trend}
                </td>
                <td className="px-5 py-3 text-right">
                  <button className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                    View <ExternalLink size={10} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
