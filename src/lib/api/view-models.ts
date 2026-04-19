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

export function getCoverageSummary(
  prices: PricesPaginatedResponse | null,
  bids: BidsResponse | null,
): { askProviders: number; bidProviders: number } {
  return {
    askProviders: prices?.meta.returned_providers.length ?? 0,
    bidProviders: bids?.meta.providers_queried.length ?? 0,
  };
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
