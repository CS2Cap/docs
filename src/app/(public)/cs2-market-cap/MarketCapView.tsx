"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Activity,
  BarChart3,
  Clock3,
  Database,
  Gauge,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  MarketIndexGroupBy,
  MarketOverviewCategoryRow,
  MarketOverviewItem,
  MarketOverviewMarketplace,
  MarketOverviewRange,
  MarketOverviewResponse,
} from "@/lib/api/types";

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

function formatMonthYear(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    year: "2-digit",
  }).format(date);
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

function buildChartPath(points: { t: string; marketcap_usd: string }[]): string {
  if (points.length < 2) return "";
  const values = points.map((point) => numeric(point.marketcap_usd));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 100;
  const height = 42;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((numeric(point.marketcap_usd) - min) / span) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MetricCell({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
}) {
  return (
    <div className="border-b-2 border-r-2 border-border bg-card px-4 py-3 last:border-r-0 md:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="shrink-0 text-primary">{icon}</span>
      </div>
      <div className="truncate font-mono text-xl font-black text-foreground md:text-2xl">
        {value}
      </div>
      {sub && (
        <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <section className="relative overflow-x-clip bg-grid py-14 md:py-16">
      <div className="container">
        <div className="border-brutal bg-card p-6 md:p-8">
          <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest text-primary">
            <Clock3 className="h-4 w-4" />
            MARKET OVERVIEW WARMING
          </div>
          <h1 className="display-heading text-4xl font-black tracking-tighter md:text-6xl">
            CS2 Skin Market Cap
          </h1>
          <p className="mt-4 max-w-2xl font-mono text-sm leading-6 text-muted-foreground">
            The market cap dashboard cache is being rebuilt. The long-form guide
            and FAQ remain available below while the live overview warms.
          </p>
        </div>
      </div>
    </section>
  );
}

function Sparkline({ points }: { points: { t: string; marketcap_usd: string }[] }) {
  const path = buildChartPath(points);
  const latest = points.at(-1);

  return (
    <div className="border-brutal bg-card">
      <div className="flex items-center justify-between gap-4 border-b-2 border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
            TOTAL MARKET CAP
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-foreground">
            {formatUsd(latest?.marketcap_usd)}
          </div>
        </div>
        <BarChart3 className="h-5 w-5 text-primary" />
      </div>
      <div className="relative h-80 px-4 py-5">
        <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-border" />
        {path ? (
          <svg
            viewBox="0 0 100 42"
            preserveAspectRatio="none"
            className="relative h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <path
              d={`${path} L 100 42 L 0 42 Z`}
              fill="currentColor"
              className="text-primary/10"
            />
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              className="text-primary"
            />
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
            Waiting for history
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryTable({ rows }: { rows: MarketOverviewCategoryRow[] }) {
  return (
    <div className="overflow-hidden border-brutal bg-card">
      <div className="grid grid-cols-[minmax(150px,1.4fr)_90px_90px_120px] gap-4 border-b-2 border-border px-4 py-3 font-mono text-[10px] font-bold tracking-widest text-muted-foreground max-lg:min-w-160">
        <div>CATEGORY</div>
        <div className="text-right">SHARE</div>
        <div className="text-right">24H</div>
        <div className="text-right">MARKET CAP</div>
      </div>
      <div className="overflow-x-auto">
        {rows.map((row) => (
          <div
            key={row.group}
            className="grid grid-cols-[minmax(150px,1.4fr)_90px_90px_120px] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 max-lg:min-w-160"
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-sm font-bold text-foreground">
                {titleCase(row.group)}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                {formatNumber(row.included_count)} priced variants
              </div>
            </div>
            <div className="text-right font-mono text-xs text-muted-foreground">
              {row.share_pct.toFixed(1)}%
            </div>
            <div className={`text-right font-mono text-xs font-bold ${changeClass(row.change_24h_pct)}`}>
              {formatPct(row.change_24h_pct)}
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
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="relative h-10 w-10 overflow-hidden border border-border bg-background">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt=""
            fill
            sizes="40px"
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
    </div>
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
    <div className="border-brutal bg-card">
      <div className="flex items-center justify-between gap-4 border-b-2 border-border px-4 py-3">
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
    <div className="border-brutal bg-card">
      <div className="flex items-center justify-between gap-4 border-b-2 border-border px-4 py-3">
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
          <div key={row.provider} className="border-b border-border px-4 py-3 last:border-b-0">
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

export function MarketCapView({ overview }: { overview: MarketOverviewResponse | null }) {
  const [range, setRange] = useState<MarketOverviewRange>("30d");
  const [category, setCategory] = useState<MarketIndexGroupBy>("item_type");

  const categoryRows = useMemo(
    () => (overview ? [...overview.categories[category]] : []),
    [overview, category],
  );
  const chartPoints = overview?.history[range] ?? [];
  const athPoint = useMemo(() => {
    const points = overview?.history.all ?? [];
    return points.reduce<(typeof points)[number] | null>((max, point) => {
      if (!max) return point;
      return numeric(point.marketcap_usd) > numeric(max.marketcap_usd) ? point : max;
    }, null);
  }, [overview]);

  if (!overview) return <EmptyDashboard />;

  return (
    <section className="relative overflow-x-clip bg-grid py-10 md:py-14">
      <div className="container">
        <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3 font-mono text-xs font-bold tracking-widest text-primary">
              <Gauge className="h-5 w-5" />
              MARKET INDEX TERMINAL
            </div>
            <h1 className="display-heading text-4xl font-black tracking-tighter sm:text-5xl md:text-7xl">
              <span className="text-foreground">CS2 Skin </span>
              <span className="glow-text text-gradient-brand">Market Cap</span>
            </h1>
            <p className="mt-5 max-w-2xl font-mono text-sm leading-6 text-muted-foreground">
              Live total value, category concentration, item movers, and marketplace
              listed value across the CS2 skin economy.
            </p>
          </div>
          <div className="border-brutal bg-card px-4 py-3 font-mono text-[11px] text-muted-foreground">
            <div className="text-primary">CACHE / {overview.meta.data_source.toUpperCase()}</div>
            <div>Updated {formatFreshness(overview.meta.freshness_sec)}</div>
          </div>
        </div>

        <div className="mb-7 grid overflow-hidden border-l-2 border-t-2 border-border md:grid-cols-3 xl:grid-cols-6">
          <MetricCell
            label="TOTAL CAP"
            value={formatUsd(overview.summary.total_marketcap_usd)}
            sub={`${formatNumber(overview.summary.included_count)} priced items`}
            icon={<Database className="h-4 w-4" />}
          />
          <MetricCell
            label="24H CHANGE"
            value={formatPct(overview.summary.change_24h_pct)}
            sub="total index"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCell
            label="7D CHANGE"
            value={formatPct(overview.summary.change_7d_pct)}
            sub="total index"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <MetricCell
            label="30D CHANGE"
            value={formatPct(overview.summary.change_30d_pct)}
            sub="total index"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <MetricCell
            label="24H VOLUME"
            value={formatUsd(overview.summary.volume_24h_usd, true)}
            sub="activity proxy"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCell
            label="ATH"
            value={formatUsd(athPoint?.marketcap_usd, true)}
            sub={`ATH · ${formatMonthYear(athPoint?.t)}`}
            icon={<Gauge className="h-4 w-4" />}
          />
        </div>

        <div className="mb-5 flex flex-wrap gap-px bg-border" role="tablist" aria-label="Market cap range">
          {RANGE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={range === tab.key}
              onClick={() => setRange(tab.key)}
              className={`px-4 py-2 font-mono text-[11px] font-bold tracking-widest transition-colors ${
                range === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5">
          <Sparkline points={chartPoints} />
        </div>

        <div className="mt-5 flex flex-wrap gap-px bg-border" role="tablist" aria-label="Market cap category">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={category === tab.key}
              onClick={() => setCategory(tab.key)}
              className={`px-4 py-2 font-mono text-[11px] font-bold tracking-widest transition-colors ${
                category === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <CategoryTable rows={categoryRows} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <MoversPanel
            title="TOP GAINERS / 24H"
            rows={overview.top_movers.gainers_24h}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MoversPanel
            title="TOP LOSERS / 24H"
            rows={overview.top_movers.losers_24h}
            icon={<TrendingDown className="h-5 w-5" />}
          />
          <MarketplacePanel rows={overview.marketplaces} />
        </div>

        <div className="mt-5 border-brutal bg-card">
          <div className="flex items-center justify-between gap-4 border-b-2 border-border px-4 py-3">
            <div className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
              MOST VALUABLE ITEMS
            </div>
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3">
            {overview.most_valuable.slice(0, 12).map((item) => (
              <ItemRow key={item.item_id} item={item} compact />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
