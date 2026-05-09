import Link from "next/link";
import { ItemPriceHistoryChart } from "@/components/ItemPriceHistoryChart";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import {
  formatCompact,
  getProvider,
  getSiblingVariants,
  getVariantKindLabel,
  getVariantWearLabel,
  providerLabel,
} from "@/lib/api";
import { Price } from "@/components/Price";
import { serverApi } from "@/lib/api/server";
import { buildQuery } from "@/lib/api/shared";
import { buildItemPath } from "@/lib/seo/itemSlug";
import type {
  ItemOut,
  MarketItem,
  PriceCandlesPage,
  ProviderInfo,
} from "@/lib/api/types";

function formatTimestamp(value?: string) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildPriceCandleSeries(priceCandles: PriceCandlesPage | null) {
  const candles = priceCandles?.data ?? [];

  return candles.map((candle) => {
    const date = new Date(candle.t * 1000);

    return {
      timestamp: candle.t * 1000,
      isoTime: date.toISOString(),
      price: candle.c,
      volume: candle.v ?? 0,
      quotes: candle.q ?? 0,
      tooltipLabel: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  });
}

async function getLongRangePriceCandles(itemId: number) {
  // The candles endpoint now returns the full requested history in a single
  // response — no pagination/cursor handling required.
  const params = new URLSearchParams({
    item_id: String(itemId),
    // API rejects exactly 365d for 1d interval ("start must be within last 365 days").
    lookback: "364d",
    interval: "1d",
  });

  return serverApi.getPriceCandles(`/v1/web/prices/candles?${params.toString()}`, 86400);
}

function getBestAskFromPrices(prices: MarketItem[], itemId: number): number | null {
  let best: number | null = null;
  for (const p of prices) {
    if (p.item_id === itemId && (best === null || p.lowest_ask < best)) {
      best = p.lowest_ask;
    }
  }
  return best;
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-secondary/70 ${className}`.trim()} />;
}

export function ItemConditionVariantsFallback() {
  return (
    <div className="border-brutal bg-card p-4">
      <div className="mb-3 font-mono text-[10px] tracking-widest text-primary">
        CONDITION VARIANTS
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between px-2 py-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export async function ItemConditionVariants({
  item,
  currentItemId,
}: {
  item: ItemOut;
  currentItemId: number;
}) {
  if (!item.base_name || !item.skin_name) {
    return null;
  }

  const siblingItems = await serverApi.getItems(
    buildQuery({
      base_name: item.base_name,
      skin_name: item.skin_name,
      limit: 50,
    }),
    300,
  );

  const siblingItemIds =
    siblingItems?.items
      .map((candidate) => candidate.item_id)
      .filter((candidate): candidate is number => typeof candidate === "number") ?? [];

  if (siblingItemIds.length === 0) {
    return null;
  }

  const siblingPrices = await serverApi.postPrices({ item_ids: siblingItemIds, currency: "USD" });
  const priceItems = siblingPrices?.items ?? [];
  const siblingVariants = getSiblingVariants(
    siblingItems?.items ?? [],
    item,
    // Adapt MarketItem[] → BatchPriceItem[] shape for getSiblingVariants
    siblingItemIds.map((id) => ({
      item_id: id,
      market_hash_name: "",
      quotes: priceItems
        .filter((p) => p.item_id === id)
        .map((p) => ({ provider: p.provider, lowest_ask: p.lowest_ask, quantity: p.quantity })),
    })),
  );

  if (siblingVariants.length === 0) {
    return null;
  }

  // Group by variant kind so StatTrak / Souvenir / Phases are visually separated.
  const groupedByKind = new Map<string, typeof siblingVariants>();
  for (const variant of siblingVariants) {
    const label = getVariantKindLabel(variant.item);
    const bucket = groupedByKind.get(label) ?? [];
    bucket.push(variant);
    groupedByKind.set(label, bucket);
  }

  // Within each kind, also group by phase when present.
  const renderGroups: Array<{ heading: string; rows: typeof siblingVariants }> = [];
  for (const [kindLabel, variants] of groupedByKind) {
    const byPhase = new Map<string, typeof siblingVariants>();
    for (const variant of variants) {
      const phase = variant.item.phase ?? "";
      const list = byPhase.get(phase) ?? [];
      list.push(variant);
      byPhase.set(phase, list);
    }

    if (byPhase.size === 1 && byPhase.has("")) {
      renderGroups.push({ heading: kindLabel, rows: variants });
    } else {
      for (const [phase, rows] of byPhase) {
        renderGroups.push({
          heading: phase ? `${kindLabel} · ${phase}` : kindLabel,
          rows,
        });
      }
    }
  }

  return (
    <div className="border-brutal bg-card p-4">
      <div className="mb-3 font-mono text-[10px] tracking-widest text-primary">
        CONDITION VARIANTS
      </div>
      <div className="space-y-4">
        {renderGroups.map((group) => (
          <div key={group.heading} className="space-y-1">
            <div className="mb-1 border-b border-border/60 pb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {group.heading}
            </div>
            {group.rows.map((variant) =>
              variant.item.item_id ? (
                <Link
                  key={variant.item.item_id}
                  href={buildItemPath(variant.item.item_id, variant.item.market_hash_name)}
                  className={`flex items-center justify-between px-2 py-2 font-mono text-xs transition-colors ${
                    variant.item.item_id === currentItemId
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-secondary/30"
                  }`}
                >
                  <span>{getVariantWearLabel(variant.item)}</span>
                  <span className="font-bold"><Price cents={variant.bestAsk} /></span>
                </Link>
              ) : null,
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItemPriceHistoryFallback() {
  return (
    <div className="border-brutal bg-card">
      <div className="border-b-2 border-border px-4 py-3">
        <span className="font-mono text-xs tracking-widest text-primary">PRICE HISTORY</span>
      </div>
      <div className="p-4">
        <div className="flex h-64 items-end gap-2">
          {["h-16", "h-24", "h-20", "h-28", "h-32", "h-20", "h-36", "h-24", "h-40", "h-28"].map(
            (heightClass, index) => (
              <SkeletonLine key={index} className={`flex-1 ${heightClass}`} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export async function ItemPriceHistorySection({ itemId }: { itemId: number }) {
  const priceCandles = await getLongRangePriceCandles(itemId);

  return (
    <div className="border-brutal bg-card">
      <div className="border-b-2 border-border px-4 py-3">
        <span className="font-mono text-xs tracking-widest text-primary">PRICE HISTORY</span>
      </div>
      <div className="p-4">
        <ItemPriceHistoryChart
          points={buildPriceCandleSeries(priceCandles)}
          seriesLabel="Price"
        />
      </div>
    </div>
  );
}

export function ItemMarketInsightsFallback() {
  return (
    <div className="grid gap-px bg-border md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-card p-4">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="mt-3 h-8 w-24" />
          <SkeletonLine className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export async function ItemMarketInsightsSection({
  itemId,
  listingProvidersCount,
}: {
  itemId: number;
  listingProvidersCount: number;
}) {
  const snapshot = await serverApi.getMarketItemsSnapshot({ timeframe: "24h" });
  const analyticsSummary = snapshot?.data.items.find((i) => i.item_id === itemId)?.summary ?? null;

  return (
    <div className="grid gap-px bg-border md:grid-cols-4">
      {[
        {
          label: "PROVIDERS",
          value: String(listingProvidersCount),
          detail: "Markets with listings",
        },
        {
          label: "24H VOLUME",
          value: formatCompact(analyticsSummary?.total_volume_24h ?? null),
          detail: "Sales in the last 24 hours",
        },
        {
          label: "LIQUIDITY",
          value:
            analyticsSummary?.liquidity != null
              ? `${analyticsSummary.liquidity}/100`
              : "N/A",
          detail: "How easy this item is to sell",
        },
        {
          label: "AVG SPREAD",
          value:
            analyticsSummary?.avg_spread_pct != null
              ? `${analyticsSummary.avg_spread_pct.toFixed(2)}%`
              : "N/A",
          detail: "Gap between best buy and sell price",
        },
      ].map((card) => (
        <div key={card.label} className="bg-card p-4">
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {card.label}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-foreground">{card.value}</div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">{card.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function ItemRecentSalesFallback() {
  return (
    <div className="border-brutal bg-card">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <span className="font-mono text-xs tracking-widest text-primary">RECENT SALES</span>
        <SkeletonLine className="h-3 w-20" />
      </div>
      <div className="space-y-3 px-4 py-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_120px_100px]">
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-28" />
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export async function ItemRecentSalesSection({
  itemId,
  providers,
}: {
  itemId: number;
  providers: ProviderInfo[];
}) {
  const sales = await serverApi.getSales(`/v1/web/sales?item_id=${itemId}&limit=10`, 600);

  return (
    <div className="border-brutal bg-card">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <span className="font-mono text-xs tracking-widest text-primary">RECENT SALES</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {sales?.items.length ?? 0} recent sales
        </span>
      </div>

      {sales?.items.length ? (
        sales.items.map((sale, index) => (
          <div
            key={`${sale.provider}-${sale.date}-${index}`}
            className="grid gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[160px_minmax(0,1fr)_120px_100px]"
          >
            <div className="font-mono text-xs text-muted-foreground">{formatTimestamp(sale.date)}</div>
            <div>
              <ProviderIdentity
                provider={getProvider(sale.provider, providers)}
                fallback={providerLabel(sale.provider, providers)}
                logoSize={18}
                textClassName="font-mono text-xs font-bold text-foreground"
              />
            </div>
            <div className="font-mono text-xs font-bold text-foreground md:text-right">
              <Price cents={sale.price} />
            </div>
            <div className="font-mono text-xs text-muted-foreground md:text-right">
              {sale.float != null ? `Float ${sale.float.toFixed(4)}` : "No float"}
            </div>
          </div>
        ))
      ) : (
        <div className="px-4 py-8 font-mono text-sm text-muted-foreground">
          No recent sales recorded for this item.
        </div>
      )}
    </div>
  );
}

export function ItemRelatedItemsFallback() {
  return (
    <div className="border-brutal bg-card">
      <div className="border-b-2 border-border px-4 py-3">
        <span className="font-mono text-xs tracking-widest text-primary">RELATED ITEMS</span>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-card p-4">
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="mt-2 h-3 w-24" />
            <div className="mt-3 flex items-center justify-between">
              <SkeletonLine className="h-3 w-14" />
              <SkeletonLine className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function ItemRelatedItemsSection({ item }: { item: ItemOut }) {
  if (!item.weapon_type) {
    return null;
  }

  const relatedItems = await serverApi.getItems(
    buildQuery({
      weapon_type: item.weapon_type,
      limit: 12,
    }),
    300,
  );

  const relatedItemIds =
    relatedItems?.items
      .map((candidate) => candidate.item_id)
      .filter((candidate): candidate is number => typeof candidate === "number")
      .filter((candidate) => candidate !== item.item_id)
      .slice(0, 6) ?? [];

  if (relatedItemIds.length === 0) {
    return null;
  }

  const relatedPrices = await serverApi.postPrices({ item_ids: relatedItemIds, currency: "USD" });
  const relatedPriceItems = relatedPrices?.items ?? [];

  const items =
    relatedItems?.items
      .filter((candidate) => candidate.item_id !== item.item_id)
      .slice(0, 6)
      .map((related) => ({
        item: related,
        bestAsk: related.item_id != null ? getBestAskFromPrices(relatedPriceItems, related.item_id) : null,
      })) ?? [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="border-brutal bg-card">
      <div className="border-b-2 border-border px-4 py-3">
        <span className="font-mono text-xs tracking-widest text-primary">RELATED ITEMS</span>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
        {items.map((related) =>
          related.item.item_id ? (
            <Link
              key={related.item.item_id}
              href={buildItemPath(related.item.item_id, related.item.market_hash_name)}
              className="bg-card p-4 transition-colors hover:bg-secondary/30"
            >
              <div className="mb-2 font-mono text-xs font-bold text-foreground">
                {related.item.market_hash_name}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {[related.item.wear_name, related.item.collection].filter(Boolean).join(" • ")}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-primary">BEST ASK</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  <Price cents={related.bestAsk} />
                </span>
              </div>
            </Link>
          ) : null,
        )}
      </div>
    </div>
  );
}
