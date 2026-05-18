import openapiSpec from "../../../openapi.json";
import { serverApi } from "./server";
import { buildQuery } from "./shared";
import {
  classifyBuyOrders,
  formatPriceMinor,
  getBestAsk,
  getBestBid,
  getCoverageSummary,
  providerLabel,
  providerLogo,
} from "./view-models";
import type {
  ItemOut,
  ItemsResponse,
  MarketItem,
  PaginationMeta,
  ProviderInfo,
} from "./types";

type OpenApiOperation = {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  security?: Array<Record<string, unknown>>;
};


const SEARCH_PAGE_SIZE = 24;
// Matches SEARCH_GROUP_MAX_SCAN + the backend's endpoint_max, so a broad
// filter (e.g. item_type=knife) gets the whole scan in one hop instead of
// 5 serial paginated roundtrips. The loop below still handles tier caps
// if a lower-tier caller can't receive the full page.
const SEARCH_GROUP_FETCH_LIMIT = 1000;
const SEARCH_GROUP_MAX_SCAN = 1000;
const WEAR_ORDER: Record<string, number> = {
  "Factory New": 0,
  "Minimal Wear": 1,
  "Field-Tested": 2,
  "Well-Worn": 3,
  "Battle-Scarred": 4,
};
const WEAR_SUFFIX_PATTERN = /\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/;
const LANDING_TICKER_ITEM_IDS = [
  9879,
  12199,
  16246,
  17527,
  5719,
  12632,
  8470,
  15069,
  15707,
  17011,
];
const LANDING_TICKER_TARGET_ITEMS = LANDING_TICKER_ITEM_IDS.length;
const TICKER_WEAR_ABBREVIATIONS: Record<string, string> = {
  "(Factory New)": "FN",
  "(Minimal Wear)": "MW",
  "(Field-Tested)": "FT",
  "(Well-Worn)": "WW",
  "(Battle-Scarred)": "BS",
};
const FORGIVING_SEARCH_STOPWORDS = new Set([
  "factory",
  "new",
  "minimal",
  "wear",
  "field",
  "tested",
  "well",
  "battle",
  "scarred",
  "stattrak",
  "souvenir",
]);

function uniqByItemId<T extends { item_id?: number; market_hash_name: string }>(items: T[]): T[] {
  const seen = new Set<number>();
  const unique: T[] = [];

  for (const item of items) {
    if (!item.item_id || seen.has(item.item_id)) {
      continue;
    }

    seen.add(item.item_id);
    unique.push(item);
  }

  return unique;
}

function buildLandingTickerItems(
  items: ItemOut[],
  priceItems: MarketItem[],
): Array<{
  item_id: number;
  market_hash_name: string;
  image_url?: string | null;
  lowest_ask: number;
  provider: string;
}> {
  const bestByItemId = new Map<number, MarketItem>();
  for (const price of priceItems) {
    const current = bestByItemId.get(price.item_id);
    if (!current || price.lowest_ask < current.lowest_ask) {
      bestByItemId.set(price.item_id, price);
    }
  }

  const uniqueItems = uniqByItemId(items);
  const tickerItems: Array<{
    item_id: number;
    market_hash_name: string;
    image_url?: string | null;
    lowest_ask: number;
    provider: string;
  }> = [];

  for (const item of uniqueItems) {
    if (!item.item_id) continue;
    const best = bestByItemId.get(item.item_id);
    if (!best) continue;
    tickerItems.push({
      item_id: item.item_id,
      market_hash_name: item.market_hash_name,
      image_url: item.image_url ?? null,
      lowest_ask: best.lowest_ask,
      provider: best.provider,
    });
    if (tickerItems.length >= LANDING_TICKER_TARGET_ITEMS) break;
  }

  return tickerItems;
}

function formatTickerItemName(name: string): string {
  for (const [wearLabel, abbreviation] of Object.entries(TICKER_WEAR_ABBREVIATIONS)) {
    if (name.endsWith(` ${wearLabel}`)) {
      return name.slice(0, -wearLabel.length).trimEnd() + ` ${abbreviation}`;
    }
  }

  return name;
}

function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildMissingSeparatorVariants(query: string): string[] {
  const parts = query.trim().split(/\s+/).filter(Boolean);
  const variants: string[] = [];

  for (let index = 1; index < parts.length; index += 1) {
    variants.push(`${parts.slice(0, index).join(" ")} | ${parts.slice(index).join(" ")}`);
  }

  return variants;
}

function buildItemSearchHaystack(item: ItemOut): string {
  return normalizeSearchValue(
    [
      item.market_hash_name,
      item.base_name,
      item.skin_name,
      item.wear_name,
      item.collection,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function matchesForgivingSearch(item: ItemOut, query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = buildItemSearchHaystack(item);
  if (haystack.includes(normalizedQuery)) {
    return true;
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function paginateItems(items: ItemOut[], limit: number, offset: number): ItemsResponse {
  const pagination: PaginationMeta = {
    limit,
    offset,
    total: items.length,
    has_next: offset + limit < items.length,
    has_prev: offset > 0,
  };

  return {
    items: items.slice(offset, offset + limit),
    pagination,
  };
}

async function getForgivingSearchItems(input: {
  q: string;
  itemSubtype?: string;
  limit: number;
  offset: number;
}): Promise<ItemsResponse | null> {
  const { q, itemSubtype, limit, offset } = input;

  if (!q || q.includes("|")) {
    return null;
  }

  for (const variant of buildMissingSeparatorVariants(q)) {
    const response = await serverApi.getItems(
      buildQuery({
        q: variant,
        item_subtype: itemSubtype,
        limit,
        offset,
      }),
      60,
    );

    if ((response?.items.length ?? 0) > 0) {
      return response;
    }
  }

  const candidateTokens = [...new Set(normalizeSearchValue(q).split(" ").filter(Boolean))]
    .filter((token) => token.length >= 2 && !FORGIVING_SEARCH_STOPWORDS.has(token))
    .sort((left, right) => right.length - left.length);

  for (const token of candidateTokens) {
    const response = await serverApi.getItems(
      buildQuery({
        q: token,
        item_subtype: itemSubtype,
      }),
      60,
    );

    if ((response?.items.length ?? 0) === 0) {
      continue;
    }

    const matches = response.items.filter((item) => matchesForgivingSearch(item, q));
    if (matches.length > 0) {
      return paginateItems(matches, limit, offset);
    }
  }

  return null;
}

export async function getLandingPageData() {
  // anon: true — landing data is identical for every visitor (catalog, ticker,
  // provider list). Reading cookies via `cookies()` would force the route into
  // dynamic rendering, which currently makes every "first" hit pay the full
  // server-fetch path. With anon, the page can be statically generated with ISR.
  const [metadata, providers, catalogItems, tickerPrices] = await Promise.all([
    serverApi.getItemsMetadata(86400, { anon: true }),
    serverApi.getProviders(3600, { anon: true }),
    serverApi.getItemsByIds(LANDING_TICKER_ITEM_IDS, { anon: true }),
    serverApi.postPrices(
      { item_ids: LANDING_TICKER_ITEM_IDS, currency: "USD" },
      // revalidate: 60 here matters for cold-cache fallback only — the warm
      // path reads the blob snapshot directly. Without this, Next.js sees
      // `cache: "no-store"` during build and refuses to mark the page static.
      { anon: true, revalidate: 60 },
    ),
  ]);
  const tickerItems = buildLandingTickerItems(
    catalogItems,
    tickerPrices?.items ?? [],
  );

  return {
    providerCount: providers.length,
    totalItems: metadata?.catalog.total_items ?? 0,
    providers,
    tickerItems,
  };
}

export type SearchFilterValues = {
  item_type?: string;
  item_subtype?: string;
  weapon_type?: string;
  wear_name?: string;
  rarity_name?: string;
  collection?: string;
};

export async function getSearchPageData(input: {
  q?: string;
  page?: number;
  filters?: SearchFilterValues;
}) {
  const { q = "", page = 1, filters = {} } = input;
  const limit = SEARCH_PAGE_SIZE;
  const currentPage = Math.max(page, 1);
  const offset = (currentPage - 1) * limit;

  const baseQueryParams = {
    q: q || undefined,
    item_type: filters.item_type || undefined,
    item_subtype: filters.item_subtype || undefined,
    weapon_type: filters.weapon_type || undefined,
    wear_name: filters.wear_name || undefined,
    rarity_name: filters.rarity_name || undefined,
    collection: filters.collection || undefined,
  };

  // When the user explicitly filters by wear, skip grouping — they asked for a specific variant.
  const shouldGroup = !filters.wear_name;

  const [metadata, marketSnapshot] = await Promise.all([
    serverApi.getItemsMetadata(86400),
    serverApi.getMarketItemsSnapshot({ timeframe: "24h" }),
  ]);

  const snapshotItemsById = new Map(
    (marketSnapshot?.data.items ?? []).map((snapshotItem) => [snapshotItem.item_id, snapshotItem]),
  );
  const snapshotGeneratedAt = marketSnapshot?.meta.generated_at ?? null;

  if (!shouldGroup) {
    // Flat path — preserve previous behaviour
    const itemsResponseRaw = await serverApi.getItems(
      buildQuery({ ...baseQueryParams, limit, offset }),
      60,
    );

    const itemsResponse =
      (itemsResponseRaw?.items.length ?? 0) > 0 || !q
        ? itemsResponseRaw
        : await getForgivingSearchItems({
            q,
            itemSubtype: filters.item_subtype,
            limit,
            offset,
          });

    const results = (itemsResponse?.items ?? []).map((item) => {
      const snapshotItem = item.item_id ? snapshotItemsById.get(item.item_id) : undefined;
      const summary = snapshotItem?.summary;

      return {
        item,
        priceUsd: summary?.best_ask_usd ?? null,
        priceChange24hPct: summary?.price_rate_24h ?? null,
        volume24h: summary?.total_volume_24h ?? null,
        metricsAsOf: summary?.liquidity_last_updated ?? snapshotGeneratedAt,
        displayName: item.market_hash_name,
        variantCount: 1,
        wearsAvailable: item.wear_name ? [item.wear_name] : [],
      };
    });

    return {
      metadata,
      filters,
      query: q,
      pagination: itemsResponse?.pagination ?? null,
      results,
      grouped: false as const,
      scanCapped: false,
    };
  }

  // Grouped path — over-fetch, group by skin family, then paginate the groups.
  const scanned: ItemOut[] = [];
  let scanOffset = 0;
  let scanCapped = false;
  let lastResponseHadNext = false;

  while (scanned.length < SEARCH_GROUP_MAX_SCAN) {
    const remaining = SEARCH_GROUP_MAX_SCAN - scanned.length;
    const fetchLimit = Math.min(SEARCH_GROUP_FETCH_LIMIT, remaining);
    const response = await serverApi.getItems(
      buildQuery({ ...baseQueryParams, limit: fetchLimit, offset: scanOffset }),
      60,
    );

    if (!response || response.items.length === 0) {
      break;
    }

    scanned.push(...response.items);
    scanOffset += response.items.length;
    lastResponseHadNext = response.pagination?.has_next ?? false;

    if (!lastResponseHadNext) {
      break;
    }

    if (scanned.length >= SEARCH_GROUP_MAX_SCAN) {
      scanCapped = true;
      break;
    }
  }

  // Forgiving-search fallback when nothing came back at all.
  let usedFallback = false;
  if (scanned.length === 0 && q) {
    const fallback = await getForgivingSearchItems({
      q,
      itemSubtype: filters.item_subtype,
      limit: SEARCH_GROUP_FETCH_LIMIT,
      offset: 0,
    });
    if (fallback?.items.length) {
      scanned.push(...fallback.items);
      usedFallback = true;
    }
  }

  const groups = groupSearchResults(scanned);
  const totalGroups = groups.length;
  const pagedGroups = groups.slice(offset, offset + limit);

  const results = pagedGroups.map((group) => {
    const variantSummaries = group.variants
      .map((variant) =>
        variant.item_id ? snapshotItemsById.get(variant.item_id)?.summary ?? null : null,
      )
      .filter((summary): summary is NonNullable<typeof summary> => summary != null);

    const lowestAsk = variantSummaries
      .map((summary) => (summary.best_ask_usd != null ? Number(summary.best_ask_usd) : null))
      .filter((value): value is number => value != null && Number.isFinite(value))
      .reduce<number | null>((min, value) => (min == null || value < min ? value : min), null);

    const totalVolume = variantSummaries.reduce(
      (sum, summary) => sum + (summary.total_volume_24h ?? 0),
      0,
    );

    const representativeSummary = group.representative.item_id
      ? snapshotItemsById.get(group.representative.item_id)?.summary
      : undefined;

    const wearsAvailable = group.variants
      .map((variant) => variant.wear_name)
      .filter((wear): wear is string => Boolean(wear));
    const uniqueWears = [...new Set(wearsAvailable)].sort(
      (a, b) => (WEAR_ORDER[a] ?? 99) - (WEAR_ORDER[b] ?? 99),
    );

    return {
      item: group.representative,
      priceUsd: lowestAsk != null ? lowestAsk.toFixed(2) : null,
      priceChange24hPct: representativeSummary?.price_rate_24h ?? null,
      volume24h: totalVolume > 0 ? totalVolume : null,
      metricsAsOf: representativeSummary?.liquidity_last_updated ?? snapshotGeneratedAt,
      displayName: stripWearSuffix(group.representative.market_hash_name),
      variantCount: group.variants.length,
      wearsAvailable: uniqueWears,
    };
  });

  const pagination: PaginationMeta = {
    limit,
    offset,
    total: totalGroups,
    has_next:
      !usedFallback && (offset + limit < totalGroups || (scanCapped && lastResponseHadNext)),
    has_prev: offset > 0,
  };

  return {
    metadata,
    filters,
    query: q,
    pagination,
    results,
    grouped: true as const,
    scanCapped,
  };
}

function stripWearSuffix(name: string): string {
  return name.replace(WEAR_SUFFIX_PATTERN, "");
}

type SearchGroup = {
  key: string;
  representative: ItemOut;
  variants: ItemOut[];
};

function groupSearchResults(items: ItemOut[]): SearchGroup[] {
  const groupsByKey = new Map<string, SearchGroup>();
  const orderedKeys: string[] = [];

  for (const item of items) {
    const hasFamily = Boolean(item.base_name && item.skin_name);
    const key = hasFamily
      ? [
          item.base_name,
          item.skin_name,
          item.is_stattrak ? "st" : "",
          item.is_souvenir ? "sv" : "",
          item.phase ?? "",
        ].join("|")
      : `mhn:${item.market_hash_name}`;

    let group = groupsByKey.get(key);
    if (!group) {
      group = { key, representative: item, variants: [item] };
      groupsByKey.set(key, group);
      orderedKeys.push(key);
      continue;
    }

    group.variants.push(item);

    // Pick the variant closest to FN as the representative.
    const currentRank = WEAR_ORDER[group.representative.wear_name ?? ""] ?? 99;
    const candidateRank = WEAR_ORDER[item.wear_name ?? ""] ?? 99;
    if (candidateRank < currentRank) {
      group.representative = item;
    }
  }

  return orderedKeys.map((key) => groupsByKey.get(key)!);
}

export async function getItemDetailPageCoreData(
  itemId: number,
  opts: { anon?: boolean } = {},
) {
  const [item, providers, prices, bids] = await Promise.all([
    serverApi.getItemById(itemId, { anon: opts.anon }),
    serverApi.getProviders(3600, { anon: opts.anon }),
    serverApi.postPrices({ item_ids: [itemId], limit: 50 }, { anon: opts.anon }),
    serverApi.postBids({ item_ids: [itemId], limit: 50 }, { anon: opts.anon }),
  ]);

  if (!item) {
    return null;
  }

  // Split buy orders into reliable bids and soft-hidden edge cases. The
  // headline best bid and all derived metadata use the reliable subset only.
  const buyOrders = classifyBuyOrders(bids?.items ?? [], prices?.items ?? []);

  return {
    item,
    providers,
    prices,
    bids,
    buyOrders,
    bestAsk: getBestAsk(prices?.items ?? []),
    bestBid: getBestBid(buyOrders.reliable),
    coverage: getCoverageSummary(prices, bids),
  };
}

function summarizeOperationDescription(operation: OpenApiOperation) {
  const rawDescription = operation.description?.trim();
  if (!rawDescription) {
    return operation.summary || "Undocumented endpoint";
  }

  const lines = rawDescription
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("-"))
    .filter((line) => !/^Tier:/i.test(line));

  return (lines[0] ?? operation.summary ?? "Undocumented endpoint").replace(/\s+/g, " ");
}

function describeEndpoint(path: string, method: string, operation: OpenApiOperation) {
  return {
    method: method.toUpperCase(),
    path,
    summary: operation.summary || operation.operationId || "Untitled endpoint",
    description: summarizeOperationDescription(operation),
    tag: Array.isArray(operation.tags) ? operation.tags[0] : "Other",
    auth:
      Array.isArray(operation.security) && operation.security.length > 0
        ? Object.keys(operation.security[0] ?? {})[0] ?? "public"
        : "public",
  };
}

const API_INFO_GROUPS = [
  {
    title: "Pricing",
    paths: [
      "/v1/prices",
      "/v1/prices/batch",
      "/v1/bids",
      "/v1/bids/batch",
    ],
  },
  {
    title: "Historical Data",
    paths: [
      "/v1/prices/history",
      "/v1/prices/candles",
      "/v1/sales"
    ],
  },
  {
    title: "Market Intelligence",
    paths: [
      "/v1/market/arbitrage",
      "/v1/market/indicators",
      "/v1/market/items"
    ],
  },
  {
    title: "Catalog",
    paths: [
      "/v1/items"
    ],
  },
] as const;

export async function getApiInfoPageData() {
  const pathEntries = Object.entries(openapiSpec.paths ?? {}).filter(
    ([path]) => !path.startsWith("/v1/web/"),
  );
  const endpoints = pathEntries.flatMap(([path, pathItem]) =>
    Object.entries(pathItem as Record<string, OpenApiOperation>)
      .filter(([method]) => ["get", "post", "patch", "delete"].includes(method))
      .map(([method, operation]) => describeEndpoint(path, method, operation)),
  );

  const endpointByPath = new Map(endpoints.map((endpoint) => [endpoint.path, endpoint]));

  return {
    endpointCount: endpoints.length,
    categories: API_INFO_GROUPS.map((group) => ({
      title: group.title,
      endpoints: group.paths
        .map((path) => endpointByPath.get(path))
        .filter((endpoint): endpoint is NonNullable<typeof endpoint> => endpoint != null),
    })).filter((group) => group.endpoints.length > 0),
    authSchemes: Object.keys(openapiSpec.components?.securitySchemes ?? {}),
  };
}

export function buildTickerRows(
  items: Array<{
    item_id?: number;
    market_hash_name: string;
    image_url?: string | null;
    lowest_ask?: number;
    provider?: string;
  }>,
  providers: ProviderInfo[],
) {
  return items.map((item) => ({
    id: item.item_id ?? item.market_hash_name,
    name: formatTickerItemName(item.market_hash_name),
    imageUrl: item.image_url ?? null,
    price: item.lowest_ask != null ? formatPriceMinor(item.lowest_ask) : "N/A",
    provider:
      item.provider != null
        ? {
            name: providerLabel(item.provider, providers),
            logo: providerLogo(item.provider, providers),
          }
        : null,
  }));
}
