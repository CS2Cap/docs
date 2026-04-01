import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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

const rangeMap: Record<string, number> = { "7D": 7, "14D": 14, "30D": 30, "90D": 90 };

export function PriceChart() {
  const [range, setRange] = useState("30D");
  const priceData = useMemo(() => generatePriceData(rangeMap[range]), [range]);

  const currentPrice = priceData[priceData.length - 1]?.price ?? 0;
  const startPrice = priceData[0]?.price ?? 0;
  const change = ((currentPrice - startPrice) / startPrice) * 100;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Price History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Average price across all markets</p>
          </div>
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

        {/* Price summary stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-xl font-bold text-primary">${currentPrice.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">All Markets (avg)</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{range} Change</p>
            <p className={`text-xl font-bold ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </p>
            <p className="text-[10px] text-muted-foreground">from ${startPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-xl font-bold">2,847</p>
            <p className="text-[10px] text-muted-foreground">sales this period</p>
          </div>
        </div>
      </div>

      <div className="p-5">
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
    </div>
  );
}
