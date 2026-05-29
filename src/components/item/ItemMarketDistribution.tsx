"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getProvider, providerLabel } from "@/lib/api";
import type { MarketItem, ProviderInfo } from "@/lib/api/types";

const PALETTE = [
  "hsl(0 85% 55%)",
  "hsl(48 95% 55%)",
  "hsl(215 90% 55%)",
  "hsl(140 70% 45%)",
  "hsl(28 90% 55%)",
  "hsl(280 60% 60%)",
];
const OTHER_COLOR = "hsl(220 10% 38%)";
const TOP_N = 6;

type DonutDatum = {
  label: string;
  value: number;
  pct: number;
  color: string;
};

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DonutDatum }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0].payload;
  return (
    <div className="border border-border bg-card px-2 py-1 font-mono text-xs">
      <div className="font-bold text-foreground">{datum.label}</div>
      <div className="text-muted-foreground">
        {datum.value.toLocaleString()} {datum.value === 1 ? "unit" : "units"} · {datum.pct}%
      </div>
    </div>
  );
}

export function ItemMarketDistribution({
  rows,
  providers,
}: {
  rows: MarketItem[];
  providers: ProviderInfo[];
}) {
  const data = useMemo<DonutDatum[]>(() => {
    if (rows.length === 0) {
      return [];
    }

    const units = new Map<string, number>();
    for (const row of rows) {
      const qty = row.quantity > 0 ? row.quantity : 1;
      units.set(row.provider, (units.get(row.provider) ?? 0) + qty);
    }

    const ranked = [...units.entries()].sort((left, right) => right[1] - left[1]);
    const total = ranked.reduce((sum, [, qty]) => sum + qty, 0);
    if (total === 0) {
      return [];
    }

    const top = ranked.slice(0, TOP_N).map(([provider, qty], index) => ({
      label: providerLabel(provider, providers) || getProvider(provider, providers)?.name || provider,
      value: qty,
      pct: Math.round((qty / total) * 100),
      color: PALETTE[index % PALETTE.length],
    }));

    const restQty = ranked
      .slice(TOP_N)
      .reduce((sum, [, qty]) => sum + qty, 0);

    if (restQty > 0) {
      top.push({
        label: "Other",
        value: restQty,
        pct: Math.round((restQty / total) * 100),
        color: OTHER_COLOR,
      });
    }

    return top;
  }, [rows, providers]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="border-brutal bg-card p-4">
      <div className="mb-3 font-mono text-xs tracking-widest text-primary">
        MARKET DISTRIBUTION
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={44}
              outerRadius={70}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((datum) => (
                <Cell key={datum.label} fill={datum.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1.5">
        {data.map((datum) => (
          <div
            key={datum.label}
            className="flex items-center justify-between gap-2 font-mono text-xs"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0"
                style={{ backgroundColor: datum.color }}
                aria-hidden="true"
              />
              <span className="truncate text-foreground">{datum.label}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">{datum.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
