import type {
  BatchPriceItem,
  BidsResponse,
  BillingOverviewCurrentPlan,
  BuyOrderItem,
  ItemOut,
  MarketItem,
  PlanInfo,
  PricesPaginatedResponse,
  ProviderInfo,
  ProvidersResponse,
} from "./types";

const WEAR_ORDER = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];

export function formatPriceMinor(
  value: number | null | undefined,
  currency = "USD",
): string {
  if (value == null) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function rarityColor(rarity: string | undefined): string {
  switch (rarity?.toLowerCase()) {
    case "contraband":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "covert":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "classified":
      return "bg-pink-500/10 text-pink-400 border-pink-500/20";
    case "restricted":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "mil-spec grade":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "industrial grade":
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "consumer grade":
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

export function normalizeProviders(
  providers?: ProvidersResponse | ProviderInfo[] | null,
): ProviderInfo[] {
  if (!providers) {
    return [];
  }

  if (Array.isArray(providers)) {
    return providers;
  }

  return Object.entries(providers).map(([name, provider]) => ({
    ...provider,
    name,
  }));
}

export function getProvider(
  providerKey: string,
  providers?: ProvidersResponse | ProviderInfo[] | null,
): ProviderInfo | null {
  return normalizeProviders(providers).find((provider) => provider.key === providerKey) ?? null;
}

export function providerLabel(
  providerKey: string,
  providers?: ProvidersResponse | ProviderInfo[] | null,
): string {
  const match = getProvider(providerKey, providers);
  return match?.name || match?.code || match?.key || providerKey;
}

export function providerLogo(
  providerKey: string,
  providers?: ProvidersResponse | ProviderInfo[] | null,
): string | null {
  return getProvider(providerKey, providers)?.logo ?? null;
}

export function getBestAsk(items: MarketItem[]): MarketItem | null {
  if (items.length === 0) {
    return null;
  }

  return [...items].sort((left, right) => left.lowest_ask - right.lowest_ask)[0] ?? null;
}

export function getBestBid(items: BuyOrderItem[]): BuyOrderItem | null {
  if (items.length === 0) {
    return null;
  }

  return [...items].sort((left, right) => right.highest_bid - left.highest_bid)[0] ?? null;
}

// Providers whose buy-order data is systematically unreliable and must never
// drive the headline "highest bid". They are still shown, but demoted.
const UNRELIABLE_BID_PROVIDERS = new Set(["steam"]);

// A bid at or above this multiple of the item's global lowest ask is treated
// as suspect (likely bad data or a niche item variant).
const EXCESSIVE_BID_ASK_MULTIPLE = 2;

// A bid below this multiple of the median reliable bid is treated as a
// stale/abandoned lowball offer that would mislead the headline range.
// Only applied when there are enough reliable bids to compute a stable median.
const LOWBALL_BID_MEDIAN_MULTIPLE = 0.5;
const MIN_BIDS_FOR_LOWBALL_DETECTION = 4;

export type BuyOrderFlag =
  | "unreliable-provider"
  | "inverted-spread"
  | "excessive-bid"
  | "lowball-bid";

export interface ClassifiedBuyOrder extends BuyOrderItem {
  /** `null` means the bid passed every reliability check. */
  flag: BuyOrderFlag | null;
}

/**
 * Splits buy orders into reliable bids and edge-case bids that should be
 * soft-hidden. A bid is flagged when any of these hold:
 *  - it comes from a systematically unreliable provider (e.g. Steam);
 *  - it exceeds the SAME provider's own lowest ask (inverted spread) — the
 *    same-provider reference deliberately avoids sidelining genuine
 *    cross-market arbitrage;
 *  - it is >= EXCESSIVE_BID_ASK_MULTIPLE x the global lowest ask for the item.
 */
export function classifyBuyOrders(
  bids: BuyOrderItem[],
  asks: MarketItem[],
): { reliable: BuyOrderItem[]; flagged: ClassifiedBuyOrder[] } {
  const lowestAskByProvider = new Map<string, number>();
  for (const ask of asks) {
    const current = lowestAskByProvider.get(ask.provider);
    if (current == null || ask.lowest_ask < current) {
      lowestAskByProvider.set(ask.provider, ask.lowest_ask);
    }
  }
  const globalLowestAsk = asks.length
    ? Math.min(...asks.map((ask) => ask.lowest_ask))
    : null;

  const flagFor = (bid: BuyOrderItem): BuyOrderFlag | null => {
    if (UNRELIABLE_BID_PROVIDERS.has(bid.provider)) {
      return "unreliable-provider";
    }
    const providerAsk = lowestAskByProvider.get(bid.provider);
    if (providerAsk != null && bid.highest_bid > providerAsk) {
      return "inverted-spread";
    }
    if (
      globalLowestAsk != null &&
      bid.highest_bid >= EXCESSIVE_BID_ASK_MULTIPLE * globalLowestAsk
    ) {
      return "excessive-bid";
    }
    return null;
  };

  const byBidDesc = (left: BuyOrderItem, right: BuyOrderItem) =>
    right.highest_bid - left.highest_bid;

  let reliable: BuyOrderItem[] = [];
  const flagged: ClassifiedBuyOrder[] = [];
  for (const bid of bids) {
    const flag = flagFor(bid);
    if (flag) {
      flagged.push({ ...bid, flag });
    } else {
      reliable.push(bid);
    }
  }

  // Second pass: demote outlier-low bids once we know the reliable cohort.
  if (reliable.length >= MIN_BIDS_FOR_LOWBALL_DETECTION) {
    const sorted = [...reliable].map((b) => b.highest_bid).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const threshold = median * LOWBALL_BID_MEDIAN_MULTIPLE;
    const survivors: BuyOrderItem[] = [];
    for (const bid of reliable) {
      if (bid.highest_bid < threshold) {
        flagged.push({ ...bid, flag: "lowball-bid" });
      } else {
        survivors.push(bid);
      }
    }
    reliable = survivors;
  }

  reliable.sort(byBidDesc);
  flagged.sort(byBidDesc);
  return { reliable, flagged };
}

export function getCoverageSummary(
  prices: PricesPaginatedResponse | null,
  bids: BidsResponse | null,
): { askProviders: number; bidProviders: number } {
  return {
    askProviders: prices?.meta.returned_providers?.length ?? 0,
    bidProviders: bids?.meta.providers_queried?.length ?? 0,
  };
}

type VariantKind = "normal" | "stattrak" | "souvenir";

function getVariantKind(item: ItemOut): VariantKind {
  if (item.is_stattrak) return "stattrak";
  if (item.is_souvenir) return "souvenir";
  return "normal";
}

const VARIANT_KIND_ORDER: Record<VariantKind, number> = {
  normal: 0,
  stattrak: 1,
  souvenir: 2,
};

const VARIANT_KIND_LABEL: Record<VariantKind, string> = {
  normal: "Normal",
  stattrak: "StatTrak™",
  souvenir: "Souvenir",
};

export function getVariantKindLabel(item: ItemOut): string {
  return VARIANT_KIND_LABEL[getVariantKind(item)];
}

export function getVariantWearLabel(item: ItemOut): string {
  const wear = item.wear_name ?? "";
  const phase = item.phase ?? "";
  if (!wear && !phase) {
    return item.market_hash_name;
  }
  return phase ? `${wear || "Variant"} · ${phase}` : wear;
}

export function getSiblingVariants(
  allItems: ItemOut[],
  currentItem: ItemOut,
  batch: BatchPriceItem[],
): Array<{ item: ItemOut; bestAsk: number | null }> {
  return allItems
    .filter(
      (candidate) =>
        candidate.base_name &&
        candidate.skin_name &&
        candidate.base_name === currentItem.base_name &&
        candidate.skin_name === currentItem.skin_name,
    )
    .map((item) => {
      const batchItem = batch.find((entry) => entry.item_id === item.item_id);
      const bestQuote =
        batchItem?.quotes
          ?.slice()
          .sort((left, right) => left.lowest_ask - right.lowest_ask)[0] ?? null;

      return { item, bestAsk: bestQuote?.lowest_ask ?? null };
    })
    .sort((left, right) => {
      // Group by variant kind first (Normal → StatTrak → Souvenir)
      const kindDiff =
        VARIANT_KIND_ORDER[getVariantKind(left.item)] -
        VARIANT_KIND_ORDER[getVariantKind(right.item)];
      if (kindDiff !== 0) return kindDiff;

      // Then by phase (alphabetical; empty phase comes first)
      const leftPhase = left.item.phase ?? "";
      const rightPhase = right.item.phase ?? "";
      if (leftPhase !== rightPhase) return leftPhase.localeCompare(rightPhase);

      // Then by wear (FN → BS)
      const leftWearIndex = WEAR_ORDER.indexOf(left.item.wear_name ?? "");
      const rightWearIndex = WEAR_ORDER.indexOf(right.item.wear_name ?? "");
      return leftWearIndex - rightWearIndex;
    });
}

export function planFeatureList(plan: PlanInfo | BillingOverviewCurrentPlan): string[] {
  const features: string[] = [];

  if ("quota_requests_per_month" in plan) {
    features.push(`${formatCompact(plan.quota_requests_per_month)} requests / month`);
  }

  if ("rate_requests_per_minute" in plan) {
    features.push(`${plan.rate_requests_per_minute.toLocaleString()} requests / minute`);
  }

  if ("max_providers" in plan) {
    features.push(
      plan.max_providers == null ? "All providers included" : `${plan.max_providers} providers`,
    );
  }

  if ("can_access_analytics" in plan && plan.can_access_analytics) {
    features.push("Analytics access");
  }

  if ("can_access_webhooks" in plan && plan.can_access_webhooks) {
    features.push("Webhook access");
  }

  return features;
}
