"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Clock3,
  Database,
  Download,
  ExternalLink,
  Gauge,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  MarketIndexGroupBy,
  MarketOverviewCategoryRow,
  MarketOverviewItem,
  MarketOverviewMarketplace,
  MarketOverviewRange,
  MarketOverviewResponse,
} from "@/lib/api/types";
import { buildItemPath } from "@/lib/seo/itemSlug";

const RANGE_TABS: { key: MarketOverviewRange; label: string }[] = [
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "ALL" },
];

const CATEGORY_TABS: { key: MarketIndexGroupBy; label: string }[] = [
  { key: "item_type", label: "ITEM TYPE" },
  { key: "weapon_type", label: "WEAPON" },
];

function numeric(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function formatUsd(value: string | number | null | undefined, compact = false): string {
  const n = numeric(value);
  if (!n) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(n);
}

function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatFreshness(seconds: number): string {
  if (seconds < 90) return "moments ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  return `"${raw.replaceAll("\"", "\"\"")}"`;
}

function buildMarketOverviewCsvHref(overview: MarketOverviewResponse): string {
  const rows = [
    ["section", "name", "value", "share_pct", "change_24h_pct", "items"],
    ["summary", "total_marketcap_usd", overview.summary.total_marketcap_usd, "", "", overview.summary.items_tracked],
    ["summary", "volume_24h_usd", overview.summary.volume_24h_usd, "", overview.summary.change_24h_pct, ""],
    ...overview.categories.item_type.map((row) => [
      "item_type",
      row.group,
      row.marketcap_usd,
      row.share_pct,
      row.change_24h_pct,
      row.item_count,
    ]),
    ...overview.categories.weapon_type.map((row) => [
      "weapon_type",
      row.group,
      row.marketcap_usd,
      row.share_pct,
      row.change_24h_pct,
      row.item_count,
    ]),
    ...overview.marketplaces.map((row) => [
      "marketplace_listed_value",
      row.name || row.provider,
      row.listed_value_usd,
      row.share_pct,
      "",
      row.listing_count,
    ]),
  ];

  return `data:text/csv;charset=utf-8,${encodeURIComponent(
    rows.map((row) => row.map(csvCell).join(",")).join("\n"),
  )}`;
}

function providerLogoUrl(provider: string): string | null {
  return provider ? `https://cdn.cs2c.app/images/providers/${provider}.png` : null;
}

function providerFallbackName(provider: string): string {
  const labels: Record<string, string> = {
    buff163: "BUFF163",
    c5: "C5Game",
    csfloat: "CSFloat",
    csmoney_m: "CS.MONEY Market",
    csmoney_t: "CS.MONEY Trade",
    dmarket: "DMarket",
    marketcsgo: "Market.CSGO",
    skinport: "Skinport",
    steam: "Steam",
    whitemarket: "WhiteMarket",
    youpin: "Youpin898",
  };
  return labels[provider] ?? titleCase(provider);
}

function titleCase(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function changeClass(value: number | null | undefined): string {
  if (value == null) return "text-muted-foreground";
  return value >= 0 ? "text-emerald-400" : "text-red-400";
}

function MetricCell({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "default" | "positive" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-foreground";

  return (
    <div className="border-b border-r terminal-rule bg-card/80 px-3 py-2.5 last:border-r-0 md:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="shrink-0 text-primary">{icon}</span>
      </div>
      <div className={`truncate font-mono text-lg font-black md:text-xl ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <section className="terminal-page relative overflow-x-clip py-5">
      <div className="container">
        <div className="terminal-panel p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest text-primary">
            <Clock3 className="h-4 w-4" />
            MARKET OVERVIEW WARMING
          </div>
          <h1 className="font-mono text-xl font-black tracking-tight md:text-2xl">CS2 Skin Market Cap</h1>
          <p className="mt-4 max-w-2xl font-mono text-sm leading-6 text-muted-foreground">
            The market cap dashboard cache is being rebuilt. The long-form guide
            and FAQ remain available below while the live overview warms.
          </p>
        </div>
      </div>
    </section>
  );
}

type ChartPoint = { timestamp: number; value: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function formatChartDate(ts: number, spanMs: number): string {
  const date = new Date(ts);
  if (spanMs <= 2 * DAY_MS) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAxisTick(ts: number, spanMs: number): string {
  const date = new Date(ts);
  if (spanMs <= 2 * DAY_MS) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  if (spanMs > 180 * DAY_MS) {
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Sparkline({
  points,
  range,
  onRangeChange,
}: {
  points: { t: string; marketcap_usd: string }[];
  range: MarketOverviewRange;
  onRangeChange: (next: MarketOverviewRange) => void;
}) {
  const [hovered, setHovered] = useState<ChartPoint | null>(null);

  const data = useMemo<ChartPoint[]>(
    () =>
      points
        .map((p) => ({
          timestamp: Date.parse(p.t),
          value: numeric(p.marketcap_usd),
        }))
        .filter((p) => Number.isFinite(p.timestamp)),
    [points],
  );

  const first = data[0];
  const last = data.at(-1);
  const active = hovered ?? last ?? null;
  const changePct =
    active && first && first.value > 0
      ? ((active.value - first.value) / first.value) * 100
      : null;
  const spanMs = data.length > 1 ? data[data.length - 1].timestamp - data[0].timestamp : 0;

  return (
    <div className="terminal-panel">
      <div className="flex flex-col gap-3 border-b terminal-rule px-3 py-2.5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
            TOTAL MARKET CAP
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="font-mono text-xl font-black text-foreground">
              {formatUsd(active?.value)}
            </div>
            {changePct !== null ? (
              <div className={`font-mono text-xs font-bold ${changeClass(changePct)}`}>
                {formatPct(changePct)}{" "}
                <span className="font-normal text-muted-foreground">vs range start</span>
              </div>
            ) : null}
            {hovered ? (
              <div className="font-mono text-[10px] text-muted-foreground">
                {formatChartDate(hovered.timestamp, spanMs)}
              </div>
            ) : null}
          </div>
        </div>
        <div
          className="grid w-full grid-cols-5 gap-px bg-border md:flex md:w-auto md:flex-wrap"
          role="tablist"
          aria-label="Market cap range"
        >
          {RANGE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={range === tab.key}
              onClick={() => onRangeChange(tab.key)}
              className={`px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-widest transition-colors ${
                range === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72 w-full">
        {data.length >= 2 ? (
          <ResponsiveContainer width="100%" height={288} minWidth={0}>
            <AreaChart
              data={data}
              margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
              onMouseMove={(state) => {
                const idx = state?.activeTooltipIndex;
                if (typeof idx === "number" && data[idx]) setHovered(data[idx]);
              }}
              onMouseLeave={() => setHovered(null)}
            >
              <defs>
                <linearGradient id="mcapFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeOpacity={0.4}
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => formatAxisTick(Number(value), spanMs)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(value) => formatUsd(Number(value), true)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={64}
                domain={["auto", "auto"]}
              />
              <Tooltip
                cursor={{
                  stroke: "hsl(var(--primary))",
                  strokeOpacity: 0.45,
                  strokeDasharray: "3 3",
                }}
                content={({ active: isActive, payload }) => {
                  if (!isActive || !payload?.length) return null;
                  const p = payload[0].payload as ChartPoint;
                  return (
                    <div className="border-brutal bg-card px-3 py-2 font-mono text-xs">
                      <div className="text-[10px] text-muted-foreground">
                        {formatChartDate(p.timestamp, spanMs)}
                      </div>
                      <div className="mt-1 font-bold text-foreground">
                        {formatUsd(p.value)}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={1.6}
                fill="url(#mcapFill)"
                activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
            Waiting for history
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryTreemap({ rows }: { rows: MarketOverviewCategoryRow[] }) {
  const visibleRows = rows.slice(0, 10);
  const maxShare = Math.max(...visibleRows.map((row) => row.share_pct), 1);

  return (
    <div className="terminal-panel h-full">
      <div className="flex items-center justify-between gap-3 border-b terminal-rule px-3 py-2.5">
        <div className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
          TREEMAP · CAP DISTRIBUTION
        </div>
        <Database className="h-4 w-4 text-primary" />
      </div>
      <div className="grid min-h-72 grid-cols-2 auto-rows-fr gap-1 p-2">
        {visibleRows.map((row) => {
          const share = Math.max(row.share_pct, 1);
          const intensity = Math.max(0.15, Math.min(0.75, share / maxShare));
          return (
            <div
              key={row.group}
              className="flex min-h-16 flex-col justify-between border border-primary/30 bg-primary/10 p-2"
              style={{
                gridColumn: row.share_pct >= 22 ? "span 2" : "span 1",
                opacity: 0.72 + intensity * 0.28,
              }}
            >
              <div className="truncate font-mono text-[11px] font-black uppercase tracking-widest text-foreground">
                {titleCase(row.group)}
              </div>
              <div>
                <div className="font-mono text-sm font-black text-primary">
                  {formatUsd(row.marketcap_usd, true)}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {row.share_pct.toFixed(1)}% · {formatNumber(row.included_count)} priced
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryTable({
  rows,
  category,
  onCategoryChange,
}: {
  rows: MarketOverviewCategoryRow[];
  category: MarketIndexGroupBy;
  onCategoryChange: (next: MarketIndexGroupBy) => void;
}) {
  return (
    <div className="terminal-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b terminal-rule px-3 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
          CATEGORY TABLE
        </div>
        <div className="flex flex-wrap gap-px bg-border" role="tablist" aria-label="Market cap category">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={category === tab.key}
              onClick={() => onCategoryChange(tab.key)}
              className={`px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest transition-colors ${
                category === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[34px_minmax(150px,1.4fr)_80px_80px_90px_110px] gap-3 border-b terminal-rule px-3 py-2 font-mono text-[10px] font-bold tracking-widest text-muted-foreground max-lg:min-w-170">
        <div>#</div>
        <div>CATEGORY</div>
        <div className="text-right">ITEMS</div>
        <div className="text-right">24H</div>
        <div className="text-right">SHARE</div>
        <div className="text-right">MKTCAP</div>
      </div>
      <div className="overflow-x-auto">
        {rows.map((row, index) => (
          <div
            key={row.group}
            className="grid grid-cols-[34px_minmax(150px,1.4fr)_80px_80px_90px_110px] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 max-lg:min-w-170"
          >
            <div className="font-mono text-[10px] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="truncate font-mono text-sm font-bold text-foreground">
                {titleCase(row.group)}
              </div>
              <div className="mt-1 h-1 bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(row.share_pct, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-right font-mono text-xs text-muted-foreground">
              {formatNumber(row.item_count)}
            </div>
            <div className={`text-right font-mono text-xs font-bold ${changeClass(row.change_24h_pct)}`}>
              {formatPct(row.change_24h_pct)}
            </div>
            <div className="text-right font-mono text-xs text-muted-foreground">
              {row.share_pct.toFixed(1)}%
            </div>
            <div className="text-right font-mono text-sm font-bold text-foreground">
              {formatUsd(row.marketcap_usd, true)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  compact = false,
  valueField = "marketcap",
}: {
  item: MarketOverviewItem;
  compact?: boolean;
  valueField?: "marketcap" | "price";
}) {
  const displayValue =
    valueField === "price" ? item.best_ask_usd : item.marketcap_usd;
  return (
    <Link
      href={buildItemPath(item.item_id, item.market_hash_name)}
      className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-2 transition-colors last:border-b-0 hover:bg-muted/40"
    >
      <div className="relative h-9 w-9 overflow-hidden border border-border bg-background">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt=""
            fill
            sizes="36px"
            className="object-contain p-1"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="truncate font-mono text-xs font-bold text-foreground">
          {item.market_hash_name}
        </div>
        <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
          {titleCase(item.weapon_type ?? item.item_type)} · {item.phase ?? item.wear_name ?? "Base"}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-xs font-bold text-foreground">
          {formatUsd(displayValue, compact)}
        </div>
        <div className={`font-mono text-[10px] ${changeClass(item.price_rate_24h)}`}>
          {formatPct(item.price_rate_24h)}
        </div>
      </div>
    </Link>
  );
}

function MoversPanel({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: MarketOverviewItem[];
  icon: ReactNode;
}) {
  return (
    <div className="terminal-panel">
      <div className="flex items-center justify-between gap-4 border-b terminal-rule px-3 py-2.5">
        <div className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
          {title}
        </div>
        <span className="text-primary">{icon}</span>
      </div>
      {rows.length ? (
        rows
          .slice(0, 6)
          .map((item) => (
            <ItemRow key={item.item_id} item={item} compact valueField="price" />
          ))
      ) : (
        <div className="px-4 py-8 text-center font-mono text-sm text-muted-foreground">
          No movement data
        </div>
      )}
    </div>
  );
}

function MarketplacePanel({ rows }: { rows: MarketOverviewMarketplace[] }) {
  return (
    <div className="terminal-panel">
      <div className="flex items-center justify-between gap-4 border-b terminal-rule px-3 py-2.5">
        <div className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
          MARKETPLACE LISTED VALUE
        </div>
        <Activity className="h-5 w-5 text-primary" />
      </div>
      {rows.map((row) => {
        const name = row.name || providerFallbackName(row.provider);
        const logo = row.logo || providerLogoUrl(row.provider);
        const hasListedValue = row.listed_value_usd != null && row.listed_value_usd !== "";
        const hasListingCount = Number.isFinite(row.listing_count);

        return (
          <div key={row.provider} className="border-b border-border px-3 py-2.5 last:border-b-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={name}
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 rounded-sm object-contain"
                    />
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-sm bg-muted" aria-hidden />
                  )}
                  <span className="truncate font-mono text-sm font-bold text-foreground">
                    {name}
                  </span>
                </span>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {hasListingCount ? `${formatNumber(row.listing_count)} listed units` : "listed units pending"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-foreground">
                  {hasListedValue ? formatUsd(row.listed_value_usd, true) : "—"}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {row.share_pct.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="mt-2 h-1 bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(row.share_pct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MostValuablePanel({ rows }: { rows: MarketOverviewItem[] }) {
  return (
    <div className="terminal-panel">
      <div className="flex items-center justify-between gap-4 border-b terminal-rule px-3 py-2.5">
        <div className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
          MOST VALUABLE · BY CAP
        </div>
        <Database className="h-4 w-4 text-primary" />
      </div>
      <div className="grid grid-cols-[34px_minmax(190px,1fr)_78px_70px_96px] gap-3 border-b terminal-rule px-3 py-2 font-mono text-[10px] font-bold tracking-widest text-muted-foreground max-lg:min-w-155">
        <div>#</div>
        <div>ITEM</div>
        <div className="text-right">ASK</div>
        <div className="text-right">SUP</div>
        <div className="text-right">CAP</div>
      </div>
      <div className="overflow-x-auto">
        {rows.slice(0, 10).map((item, index) => (
          <div
            key={item.item_id}
            className="grid grid-cols-[34px_minmax(190px,1fr)_78px_70px_96px] items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 max-lg:min-w-155"
          >
            <div className="font-mono text-[10px] text-muted-foreground">
              {String(item.rank ?? index + 1).padStart(2, "0")}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden border border-border bg-background">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-contain p-1"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate font-mono text-xs font-bold text-foreground">
                  {item.market_hash_name}
                </div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {titleCase(item.weapon_type ?? item.item_type)} · {item.phase ?? item.wear_name ?? "Base"}
                </div>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-muted-foreground">
              {formatUsd(item.best_ask_usd, true)}
            </div>
            <div className="text-right font-mono text-xs text-muted-foreground">
              {item.supply == null ? "—" : formatNumber(item.supply)}
            </div>
            <div className="text-right font-mono text-xs font-bold text-foreground">
              {formatUsd(item.marketcap_usd, true)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketCapView({ overview }: { overview: MarketOverviewResponse | null }) {
  const [range, setRange] = useState<MarketOverviewRange>("30d");
  const [category, setCategory] = useState<MarketIndexGroupBy>("item_type");

  const categoryRows = useMemo(
    () => (overview ? [...overview.categories[category]] : []),
    [overview, category],
  );
  const chartPoints = overview?.history[range] ?? [];

  if (!overview) return <EmptyDashboard />;
  const csvHref = buildMarketOverviewCsvHref(overview);

  return (
    <section className="terminal-page relative overflow-x-clip border-b border-border py-4 md:py-5">
      <div className="container">
        <div className="terminal-panel mb-4 overflow-hidden">
          <div className="flex flex-col gap-3 border-b terminal-rule px-3 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest text-primary">
              <Gauge className="h-5 w-5" />
                // CS2-MKTCAP::INDEX
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {formatNumber(overview.summary.items_tracked)} tracked · {formatNumber(overview.summary.included_count)} priced · {overview.summary.marketplace_count} marketplaces
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold tracking-widest">
              <a
                href={csvHref}
                download="cs2cap-market-overview.csv"
                className="inline-flex h-8 items-center gap-1 border border-border px-3 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Download className="h-3 w-3" />
                EXPORT CSV
              </a>
              <Link
                href="/api-info"
                className="inline-flex h-8 items-center gap-1 border border-border px-3 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                API
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Cache / {overview.meta.data_source.toUpperCase()} · updated {formatFreshness(overview.meta.freshness_sec)}
          </div>
        </div>

        <div className="mb-4 grid overflow-hidden border-l border-t terminal-rule md:grid-cols-3 xl:grid-cols-6">
          <MetricCell
            label="TOTAL MKTCAP · USD"
            value={formatUsd(overview.summary.total_marketcap_usd)}
            icon={<Database className="h-4 w-4" />}
          />
          <MetricCell
            label="24H CHANGE"
            value={formatPct(overview.summary.change_24h_pct)}
            tone={numeric(overview.summary.change_24h_pct) >= 0 ? "positive" : "negative"}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCell
            label="7D CHANGE"
            value={formatPct(overview.summary.change_7d_pct)}
            tone={numeric(overview.summary.change_7d_pct) >= 0 ? "positive" : "negative"}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <MetricCell
            label="30D CHANGE"
            value={formatPct(overview.summary.change_30d_pct)}
            tone={numeric(overview.summary.change_30d_pct) >= 0 ? "positive" : "negative"}
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <MetricCell
            label="24H VOLUME"
            value={formatUsd(overview.summary.volume_24h_usd, true)}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCell
            label="RELIABLE ITEMS"
            value={`${formatNumber(overview.summary.included_count)} / ${formatNumber(overview.summary.items_tracked)}`}
            icon={<Gauge className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <Sparkline points={chartPoints} range={range} onRangeChange={setRange} />
          <CategoryTreemap rows={categoryRows} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,1fr)]">
          <CategoryTable
            rows={categoryRows}
            category={category}
            onCategoryChange={setCategory}
          />
          <div className="grid gap-4">
            <MoversPanel
              title="MOVERS · GAINERS · 24H"
              rows={overview.top_movers.gainers_24h}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MoversPanel
              title="MOVERS · LOSERS · 24H"
              rows={overview.top_movers.losers_24h}
              icon={<TrendingDown className="h-5 w-5" />}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <MostValuablePanel rows={overview.most_valuable} />
          <MarketplacePanel rows={overview.marketplaces} />
        </div>
      </div>
    </section>
  );
}
