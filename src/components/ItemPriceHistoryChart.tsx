"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HistoryPoint = {
  timestamp: number;
  isoTime: string;
  price: number;
  tooltipLabel?: string;
};

export function ItemPriceHistoryChart({
  points,
  seriesLabel = "Price",
}: {
  points: HistoryPoint[];
  seriesLabel?: string;
}) {
  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No price history available.
      </div>
    );
  }

  const spanMs = points[points.length - 1].timestamp - points[0].timestamp;
  const dayMs = 24 * 60 * 60 * 1000;

  function formatAxisTick(value: number) {
    const date = new Date(value);

    if (spanMs > 180 * dayMs) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
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
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
            formatter={(value: number) => [`$${(value / 100).toFixed(2)}`, seriesLabel]}
            labelFormatter={(value, payload) =>
              payload?.[0]?.payload?.tooltipLabel ??
              new Date(Number(value)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
