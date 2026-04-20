"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HistoryPoint = {
  timestamp: number;
  isoTime: string;
  price: number;
  volume?: number;
  quotes?: number;
  tooltipLabel?: string;
};

const RANGES = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "ALL", days: Infinity },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function ItemPriceHistoryChart({
  points,
  seriesLabel = "Price",
}: {
  points: HistoryPoint[];
  seriesLabel?: string;
}) {
  const [range, setRange] = useState<RangeId>("90d");

  const filteredPoints = useMemo(() => {
    if (points.length === 0) return points;
    const cfg = RANGES.find((r) => r.id === range) ?? RANGES[2];
    if (!Number.isFinite(cfg.days)) return points;
    const cutoff = points[points.length - 1].timestamp - cfg.days * 24 * 60 * 60 * 1000;
    const filtered = points.filter((p) => p.timestamp >= cutoff);
    return filtered.length > 1 ? filtered : points;
  }, [points, range]);

  const stats = useMemo(() => {
    if (filteredPoints.length === 0) return null;
    const first = filteredPoints[0].price;
    const last = filteredPoints[filteredPoints.length - 1].price;
    const high = filteredPoints.reduce((max, p) => Math.max(max, p.price), -Infinity);
    const low = filteredPoints.reduce((min, p) => Math.min(min, p.price), Infinity);
    const change = last - first;
    const changePct = first > 0 ? (change / first) * 100 : 0;
    const totalVolume = filteredPoints.reduce((sum, p) => sum + (p.volume ?? 0), 0);
    return { first, last, high, low, change, changePct, totalVolume };
  }, [filteredPoints]);

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No price history available.
      </div>
    );
  }

  const spanMs =
    filteredPoints.length > 1
      ? filteredPoints[filteredPoints.length - 1].timestamp - filteredPoints[0].timestamp
      : 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const isPositive = (stats?.change ?? 0) >= 0;
  const hasVolume = filteredPoints.some((p) => (p.volume ?? 0) > 0);

  function formatAxisTick(value: number) {
    const date = new Date(value);
    if (spanMs > 180 * dayMs) {
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatPrice(value: number) {
    return `$${(value / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {stats ? (
            <>
              <div className="font-mono text-2xl font-bold text-foreground">
                {formatPrice(stats.last)}
              </div>
              <div
                className={`font-mono text-xs font-bold ${
                  isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {isPositive ? "+" : ""}
                {formatPrice(stats.change)} (
                {isPositive ? "+" : ""}
                {stats.changePct.toFixed(2)}%)
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                H {formatPrice(stats.high)} · L {formatPrice(stats.low)}
                {hasVolume ? <> · VOL {formatCompact(stats.totalVolume)}</> : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex border-brutal">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-3 py-1 font-mono text-[10px] tracking-widest transition-colors ${
                range === r.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={filteredPoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickCount={spanMs > 180 * dayMs ? 6 : 8}
              minTickGap={32}
              tickFormatter={formatAxisTick}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{
                stroke: "hsl(var(--primary))",
                strokeOpacity: 0.4,
                strokeDasharray: "3 3",
              }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 0,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
              }}
              formatter={(value: number, _name, item) => {
                const payload = item?.payload as HistoryPoint | undefined;
                const vol = payload?.volume ?? 0;
                return [
                  `${formatPrice(value)}${vol > 0 ? `  ·  Vol ${formatCompact(vol)}` : ""}`,
                  seriesLabel,
                ];
              }}
              labelFormatter={(value, payload) =>
                payload?.[0]?.payload?.tooltipLabel ??
                new Date(Number(value)).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              strokeWidth={2}
              fill="url(#priceFill)"
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {hasVolume ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-muted-foreground">
            <span>VOLUME</span>
            <span>SALES PER PERIOD</span>
          </div>
          <div className="h-20 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={filteredPoints} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  hide
                />
                <YAxis
                  tickFormatter={(value) => formatCompact(Number(value))}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 0,
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatCompact(value), "Volume"]}
                  labelFormatter={(value, payload) =>
                    payload?.[0]?.payload?.tooltipLabel ??
                    new Date(Number(value)).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                />
                <Bar dataKey="volume" fill="hsl(var(--primary))" fillOpacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
