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
  LayoutList,
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
  if (!n) return "$0.00";
  const useCompact = compact && Math.abs(n) >= 1000;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: useCompact ? 0 : 2,
    maximumFractionDigits: useCompact ? 1 : 2,
    notation: useCompact ? "compact" : "standard",
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

type ItemNameTag = "st" | "sv" | null;

const ITEM_STRIP_PREFIXES = ["Sticker | ", "Souvenir Charm | ", "Graffiti | ", "Music Kit | ", "Autograph Capsule | "];
const ITEM_STRIP_SUFFIXES = [
  " (Factory New)",
  " (Minimal Wear)",
  " (Field-Tested)",
  " (Well-Worn)",
  " (Battle-Scarred)",
];

function formatItemDisplay(rawName: string): { star: boolean; prefix: string | null; name: string; tag: ItemNameTag } {
  let name = rawName;
  let tag: ItemNameTag = null;
  let prefix: string | null = null;
  let star = false;

  for (const p of ITEM_STRIP_PREFIXES) {
    if (name.startsWith(p)) {
      name = name.slice(p.length);
      break;
    }
  }

  if (name.startsWith("★ StatTrak™ ")) {
    name = name.slice("★ StatTrak™ ".length);
    prefix = "ST";
    tag = "st";
    star = true;
  } else if (name.startsWith("StatTrak™ ")) {
    name = name.slice("StatTrak™ ".length);
    prefix = "ST";
    tag = "st";
  } else if (name.startsWith("Souvenir ")) {
    name = name.slice("Souvenir ".length);
    prefix = "SV";
    tag = "sv";
  }

  for (const suffix of ITEM_STRIP_SUFFIXES) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }

  return { star, prefix, name, tag };
}

function itemTagFrameClass(tag: ItemNameTag): string {
  if (tag === "st") return "border-orange-500/70";
  if (tag === "sv") return "border-yellow-400/70";
  return "border-border";
}

function itemTagTextClass(tag: ItemNameTag): string {
  if (tag === "st") return "text-orange-400";
  if (tag === "sv") return "text-yellow-400";
  return "";
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
    <div className="border-b border-r terminal-rule bg-card/80 px-4 py-3.5 last:border-r-0 md:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-xs font-bold tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="shrink-0 text-primary">{icon}</span>
      </div>
      <div className={`truncate font-mono text-2xl font-black md:text-3xl ${valueClass}`}>
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
          <div className="mb-3 flex items-center gap-2 font-mono text-sm font-bold tracking-widest text-primary">
            <Clock3 className="h-5 w-5" />
            MARKET OVERVIEW WARMING
          </div>
          <h1 className="font-mono text-3xl font-black tracking-tight md:text-4xl">CS2 Skin Market Cap</h1>
          <p className="mt-4 max-w-2xl font-mono text-base leading-7 text-muted-foreground">
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

function formatChartDate(ts: number, spanMs: number, pointSpacingMs = Infinity): string {
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
  if (pointSpacingMs < DAY_MS) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
  const pointSpacingMs = data.length > 1 ? spanMs / (data.length - 1) : Infinity;

  return (
    <div className="terminal-panel flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b terminal-rule px-4 py-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
            TOTAL MARKET CAP
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="font-mono text-3xl font-black text-foreground md:text-4xl">
              {formatUsd(active?.value)}
            </div>
            {changePct !== null ? (
              <div className={`font-mono text-sm font-bold ${changeClass(changePct)}`}>
                {formatPct(changePct)}{" "}
                <span className="font-normal text-muted-foreground">vs range start</span>
              </div>
            ) : null}
            {hovered ? (
              <div className="font-mono text-xs text-muted-foreground">
                {formatChartDate(hovered.timestamp, spanMs, pointSpacingMs)}
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
              className={`px-3 py-2 font-mono text-xs font-bold tracking-widest transition-colors ${
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
      <div className="min-h-72 w-full flex-1">
        {data.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={288} minWidth={0}>
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
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(value) => formatUsd(Number(value), true)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13 }}
                tickLine={false}
                axisLine={false}
                width={72}
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
                    <div className="border-brutal bg-card px-3 py-2 font-mono text-sm">
                      <div className="text-xs text-muted-foreground">
                        {formatChartDate(p.timestamp, spanMs, pointSpacingMs)}
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
          <div className="flex h-full items-center justify-center font-mono text-base text-muted-foreground">
            Waiting for history
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryTreemap({
  rows,
  category,
  onCategoryChange,
}: {
  rows: MarketOverviewCategoryRow[];
  category: MarketIndexGroupBy;
  onCategoryChange: (next: MarketIndexGroupBy) => void;
}) {
  const visibleRows = useMemo(() => {
    const TARGET_ROWS = 5;
    const COLS = 2;
    const out: MarketOverviewCategoryRow[] = [];
    let filled = 0;
    for (const row of rows) {
      const span = row.share_pct >= 22 ? 2 : 1;
      const startCol = filled % COLS;
      const lead = startCol === 0 ? 0 : COLS - startCol;
      if (span === 2 && lead > 0) {
        filled += lead;
      }
      const rowsAfter = Math.ceil((filled + span) / COLS);
      if (rowsAfter > TARGET_ROWS) break;
      out.push(row);
      filled += span;
    }
    return out;
  }, [rows]);
  const maxShare = Math.max(...visibleRows.map((row) => row.share_pct), 1);

  return (
    <div className="terminal-panel">
      <div className="flex flex-col gap-3 border-b terminal-rule px-4 py-3">
        <div className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
          TREEMAP · DISTRIBUTION
        </div>
        <div className="grid w-full grid-cols-2 gap-px bg-border" role="tablist" aria-label="Market cap category">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={category === tab.key}
              onClick={() => onCategoryChange(tab.key)}
              className={`min-w-0 px-3 py-2 text-center font-mono text-xs font-bold tracking-widest transition-colors ${
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
      <div className="grid h-112 grid-cols-2 auto-rows-fr gap-1 p-2">
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
              <div className="truncate font-mono text-sm font-black uppercase leading-tight tracking-widest text-foreground">
                {titleCase(row.group)}
              </div>
              <div>
                <div className="font-mono text-base font-black leading-tight text-primary">
                  {row.share_pct.toFixed(2)}%
                </div>
                <div className="font-mono text-xs leading-tight text-muted-foreground">
                  {formatNumber(row.included_count)} items
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryTable({ rows }: { rows: MarketOverviewCategoryRow[] }) {
  return (
    <div className="terminal-panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b terminal-rule px-4 py-3">
        <div className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
          CATEGORY TABLE
        </div>
        <LayoutList className="h-5 w-5 text-primary" />
      </div>
      <div className="grid grid-cols-[28px_minmax(0,1fr)_64px_84px] gap-2 border-b terminal-rule px-4 py-2.5 font-mono text-xs font-bold tracking-widest text-muted-foreground">
        <div>#</div>
        <div>CATEGORY</div>
        <div className="text-right">24H</div>
        <div className="text-right">MKTCAP</div>
      </div>
      <div className="flex flex-1 flex-col">
        {rows.map((row, index) => (
          <div
            key={row.group}
            className="grid grid-cols-[28px_minmax(0,1fr)_64px_84px] items-center gap-2 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="font-mono text-xs text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="truncate font-mono text-base font-bold text-foreground">
                {titleCase(row.group)}
              </div>
              <div className="mt-1.5 h-1 bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(row.share_pct, 100)}%` }}
                />
              </div>
            </div>
            <div className={`text-right font-mono text-sm font-bold ${changeClass(row.change_24h_pct)}`}>
              {formatPct(row.change_24h_pct)}
            </div>
            <div className="text-right font-mono text-base font-bold text-foreground">
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
  const display = formatItemDisplay(item.market_hash_name);
  return (
    <Link
      href={buildItemPath(item.item_id, item.market_hash_name)}
      className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
    >
      <div className={`relative h-16 w-16 overflow-hidden border bg-background ${itemTagFrameClass(display.tag)}`}>
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt=""
            fill
            sizes="64px"
            className="object-contain p-1"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="truncate font-mono text-base font-bold text-foreground">
          {display.star ? "★ " : null}
          {display.prefix ? (
            <span className={itemTagTextClass(display.tag)}>{display.prefix} </span>
          ) : null}
          {display.name}
        </div>
        <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {titleCase(item.weapon_type ?? item.item_type)} · {item.phase ?? item.wear_name ?? "Base"}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-base font-bold text-foreground">
          {formatUsd(displayValue, compact)}
        </div>
        <div className={`font-mono text-xs ${changeClass(item.price_rate_24h)}`}>
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
    <div className="terminal-panel flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b terminal-rule px-4 py-3">
        <div className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
          {title}
        </div>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="flex flex-1 flex-col">
        {rows.length ? (
          rows
            .slice(0, 8)
            .map((item) => (
              <ItemRow key={item.item_id} item={item} compact valueField="price" />
            ))
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center font-mono text-base text-muted-foreground">
            No movement data
          </div>
        )}
      </div>
    </div>
  );
}

const MARKETPLACE_VISIBLE_LIMIT = 10;

function MarketplacePanel({ rows }: { rows: MarketOverviewMarketplace[] }) {
  const visible = rows.slice(0, MARKETPLACE_VISIBLE_LIMIT);
  const overflow = rows.slice(MARKETPLACE_VISIBLE_LIMIT);
  const othersShare = overflow.reduce((sum, r) => sum + (r.share_pct || 0), 0);
  const othersListingCount = overflow.reduce(
    (sum, r) => sum + (Number.isFinite(r.listing_count) ? r.listing_count : 0),
    0,
  );
  const othersValue = overflow.reduce((sum, r) => {
    const n = r.listed_value_usd == null || r.listed_value_usd === "" ? NaN : Number(r.listed_value_usd);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);

  return (
    <div className="terminal-panel">
      <div className="flex items-center justify-between gap-4 border-b terminal-rule px-4 py-3">
        <div className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
          MARKETPLACE LISTED VALUE
        </div>
        <Activity className="h-5 w-5 text-primary" />
      </div>
      {visible.map((row) => {
        const name = row.name || providerFallbackName(row.provider);
        const logo = row.logo || providerLogoUrl(row.provider);
        const hasListedValue = row.listed_value_usd != null && row.listed_value_usd !== "";
        const hasListingCount = Number.isFinite(row.listing_count);

        return (
          <div key={row.provider} className="border-b border-border px-4 py-3 last:border-b-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={name}
                      width={24}
                      height={24}
                      className="h-6 w-6 shrink-0 rounded-sm object-contain"
                    />
                  ) : (
                    <span className="h-6 w-6 shrink-0 rounded-sm bg-muted" aria-hidden />
                  )}
                  <span className="truncate font-mono text-base font-bold text-foreground">
                    {name}
                  </span>
                </span>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {hasListingCount ? `${formatNumber(row.listing_count)} listings` : "listings pending"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-base font-bold text-foreground">
                  {hasListedValue ? formatUsd(row.listed_value_usd, true) : "—"}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
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
      {overflow.length ? (
        <div className="border-b border-border px-3 py-2.5 last:border-b-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-5 w-5 shrink-0 rounded-sm bg-muted" aria-hidden />
                <span className="truncate font-mono text-sm font-bold text-foreground">
                  Others
                </span>
              </span>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {othersListingCount > 0
                  ? `${formatNumber(othersListingCount)} listings · ${overflow.length} marketplaces`
                  : `${overflow.length} marketplaces`}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-foreground">
                {othersValue > 0 ? formatUsd(othersValue, true) : "—"}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {othersShare.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="mt-2 h-1 bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(othersShare, 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MostValuablePanel({ rows }: { rows: MarketOverviewItem[] }) {
  return (
    <div className="terminal-panel">
      <div className="flex items-center justify-between gap-4 border-b terminal-rule px-4 py-3">
        <div className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
          MOST VALUABLE · BY CAP
        </div>
        <Database className="h-5 w-5 text-primary" />
      </div>
      <div className="grid grid-cols-[40px_minmax(220px,1fr)_90px_80px_110px] gap-3 border-b terminal-rule px-4 py-2.5 font-mono text-xs font-bold tracking-widest text-muted-foreground max-lg:min-w-160">
        <div>#</div>
        <div>ITEM</div>
        <div className="text-right">ASK</div>
        <div className="text-right">SUP</div>
        <div className="text-right">CAP</div>
      </div>
      <div className="overflow-x-auto">
        {rows.slice(0, 10).map((item, index) => {
          const display = formatItemDisplay(item.market_hash_name);
          return (
          <div
            key={item.item_id}
            className="grid grid-cols-[40px_minmax(220px,1fr)_90px_80px_110px] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 max-lg:min-w-160"
          >
            <div className="font-mono text-xs text-muted-foreground">
              {String(item.rank ?? index + 1).padStart(2, "0")}
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className={`relative h-14 w-14 shrink-0 overflow-hidden border bg-background ${itemTagFrameClass(display.tag)}`}>
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate font-mono text-base font-bold text-foreground">
                  {display.star ? "★ " : null}
                  {display.prefix ? (
                    <span className={itemTagTextClass(display.tag)}>{display.prefix} </span>
                  ) : null}
                  {display.name}
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {titleCase(item.weapon_type ?? item.item_type)} · {item.phase ?? item.wear_name ?? "Base"}
                </div>
              </div>
            </div>
            <div className="text-right font-mono text-sm text-muted-foreground">
              {formatUsd(item.best_ask_usd, true)}
            </div>
            <div className="text-right font-mono text-sm text-muted-foreground">
              {item.supply == null ? "—" : formatNumber(item.supply)}
            </div>
            <div className="text-right font-mono text-base font-bold text-foreground">
              {formatUsd(item.marketcap_usd, true)}
            </div>
          </div>
          );
        })}
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
              <div className="flex items-center gap-2 font-mono text-2xl font-bold tracking-widest text-primary md:text-3xl">
              <Gauge className="h-6 w-6" />
              CS2 MARKETCAP INDEX
            </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold tracking-widest">
              <a
                href={csvHref}
                download="cs2cap-market-overview.csv"
                className="inline-flex h-10 items-center gap-1 border border-border px-3 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Download className="h-3 w-3" />
                EXPORT CSV
              </a>
              <Link
                href="/api-info"
                className="inline-flex h-10 items-center gap-1 border border-border px-3 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                API
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="px-3 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Updated {formatFreshness(overview.meta.freshness_sec)}
          </div>
        </div>

        <div className="mb-4 grid overflow-hidden border terminal-rule md:grid-cols-3 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
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
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.85fr)]">
          <Sparkline points={chartPoints} range={range} onRangeChange={setRange} />
          <CategoryTreemap
            rows={categoryRows}
            category={category}
            onCategoryChange={setCategory}
          />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.85fr)]">
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
          <CategoryTable rows={categoryRows} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.85fr)]">
          <MostValuablePanel rows={overview.most_valuable} />
          <MarketplacePanel rows={overview.marketplaces} />
        </div>
      </div>
    </section>
  );
}
