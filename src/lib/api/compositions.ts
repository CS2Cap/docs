import openapiSpec from "../../../openapi.json";
import { serverApi } from "./server";
import { buildQuery } from "./shared";
import {
  formatPriceMinor,
  getBestAsk,
  getBestBid,
  getCoverageSummary,
  getSiblingVariants,
  providerLabel,
  providerLogo,
} from "./view-models";
import type {
  BatchPriceItem,
  ItemOut,
  ItemsResponse,
  PaginationMeta,
  PriceSnapshotPage,
  ProviderInfo,
} from "./types";

type OpenApiOperation = {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  security?: Array<Record<string, unknown>>;
};

const SEARCH_CATEGORY_MAP: Record<string, string | undefined> = {
  All: undefined,
  Rifles: "Rifles",
  Pistols: "Pistols",
  Knives: "Knives",
  Gloves: "Gloves",
  SMGs: "SMGs",
  Heavy: "Heavy",
};

const SEARCH_PAGE_SIZE = 24;
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

function getBestBatchQuote(batchItem?: BatchPriceItem | null) {
  if (!batchItem?.quotes.length) {
    return null;
  }

  return batchItem.quotes.reduce((best, quote) =>
    quote.lowest_ask < best.lowest_ask ? quote : best,
  );
}

function buildLandingTickerItems(
  items: ItemOut[],
  batchItems: BatchPriceItem[],
): Array<{
  item_id: number;
  market_hash_name: string;
  image_url?: string | null;
  lowest_ask: number;
  provider: string;
}> {
  const batchItemsById = new Map(batchItems.map((batchItem) => [batchItem.item_id, batchItem]));
  const uniqueItems = uniqByItemId(items);
  const tickerItems: Array<{
    item_id: number;
    market_hash_name: string;
    image_url?: string | null;
    lowest_ask: number;
    provider: string;
  }> = [];

  for (const item of uniqueItems) {
    if (!item.item_id) {
      continue;
    }

    const bestQuote = getBestBatchQuote(batchItemsById.get(item.item_id));
    if (!bestQuote) {
      continue;
    }

    tickerItems.push({
      item_id: item.item_id,
      market_hash_name: item.market_hash_name,
      image_url: item.image_url ?? null,
      lowest_ask: bestQuote.lowest_ask,
      provider: bestQuote.provider,
    });

    if (tickerItems.length >= LANDING_TICKER_TARGET_ITEMS) {
      break;
    }
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
  const [metadata, providers, catalogItems, tickerPrices] = await Promise.all([
    serverApi.getItemsMetadata(300),
    serverApi.getProviders(300),
    Promise.all(
      LANDING_TICKER_ITEM_IDS.map((itemId) => serverApi.getItem(itemId, 60)),
    ).then((items) => items.filter((item): item is ItemOut => item != null)),
    serverApi.getBatchPrices({ item_ids: LANDING_TICKER_ITEM_IDS, currency: "USD" }, 60),
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

export async function getSearchPageData(input: {
  q?: string;
  category?: string;
  page?: number;
}) {
  const { q = "", category = "All", page = 1 } = input;
  const limit = SEARCH_PAGE_SIZE;
  const offset = Math.max(page - 1, 0) * limit;
  const itemSubtype = SEARCH_CATEGORY_MAP[category];

  const [metadata, initialItemsResponse, marketSnapshot] = await Promise.all([
    serverApi.getItemsMetadata(300),
    serverApi.getItems(
      buildQuery({
        q: q || undefined,
        item_subtype: itemSubtype,
        limit,
        offset,
      }),
      60,
    ),
    serverApi.getMarketItemsSnapshot({ timeframe: "24h" }, 30),
  ]);

  const itemsResponse =
    (initialItemsResponse?.items.length ?? 0) > 0 || !q
      ? initialItemsResponse
      : await getForgivingSearchItems({
          q,
          itemSubtype,
          limit,
          offset,
        });

  const snapshotItemsById = new Map(
    (marketSnapshot?.data.items ?? []).map((snapshotItem) => [snapshotItem.item_id, snapshotItem]),
  );
  const snapshotGeneratedAt = marketSnapshot?.meta.generated_at ?? null;

  const categories = ["All", ...(metadata?.filters.item_subtype ?? [])].filter((value) =>
    ["All", "Rifles", "Pistols", "Knives", "Gloves", "SMGs", "Heavy"].includes(value),
  );

  const results = (itemsResponse?.items ?? []).map((item) => {
    const snapshotItem = item.item_id ? snapshotItemsById.get(item.item_id) : undefined;
    const summary = snapshotItem?.summary;

    return {
      item,
      priceUsd: summary?.best_ask_usd ?? null,
      priceChange24hPct: summary?.price_rate_24h ?? null,
      volume24h: summary?.total_volume_24h ?? null,
      metricsAsOf: summary?.liquidity_last_updated ?? snapshotGeneratedAt,
    };
  });

  return {
    metadata,
    categories,
    category,
    query: q,
    pagination: itemsResponse?.pagination ?? null,
    results,
  };
}

function buildPriceHistorySeries(priceHistory: PriceSnapshotPage | null) {
  const snapshots = priceHistory?.items ?? [];
  const byTime = new Map<string, { isoTime: string; price: number }>();

  for (const snapshot of snapshots) {
    const existing = byTime.get(snapshot.time);
    if (!existing || snapshot.price < existing.price) {
      byTime.set(snapshot.time, { isoTime: snapshot.time, price: snapshot.price });
    }
  }

  return [...byTime.values()]
    .sort((left, right) => new Date(left.isoTime).getTime() - new Date(right.isoTime).getTime())
    .map((point) => ({
      ...point,
      label: new Date(point.isoTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
}

export async function getItemDetailPageData(itemId: number) {
  const item = await serverApi.getItem(itemId, 120);
  if (!item) {
    return null;
  }

  const [providers, prices, bids, sales, analytics, priceHistory, siblingItems, relatedItems] =
    await Promise.all([
      serverApi.getProviders(300),
      serverApi.getPrices(`/v1/web/prices?item_id=${itemId}&limit=50`, 30),
      serverApi.getBids(`/v1/web/bids?item_id=${itemId}&limit=50`, 30),
      serverApi.getSales(`/v1/web/sales?item_id=${itemId}&limit=10`, 60),
      serverApi.getMarketItem(itemId, 60),
      serverApi.getPriceHistory(`/v1/web/prices/history?item_id=${itemId}&limit=36`, 120),
      item.base_name && item.skin_name
        ? serverApi.getItems(
            buildQuery({
              base_name: item.base_name,
              skin_name: item.skin_name,
              limit: 50,
            }),
            300,
          )
        : Promise.resolve(null),
      item.weapon_type
        ? serverApi.getItems(
            buildQuery({
              weapon_type: item.weapon_type,
              limit: 12,
            }),
            300,
          )
        : Promise.resolve(null),
    ]);

  const siblingItemIds =
    siblingItems?.items
      .map((candidate) => candidate.item_id)
      .filter((candidate): candidate is number => typeof candidate === "number") ?? [];

  const siblingBatch =
    siblingItemIds.length > 0
      ? await serverApi.getBatchPrices({ item_ids: siblingItemIds, currency: "USD" }, 30)
      : null;

  const relatedItemIds =
    relatedItems?.items
      .map((candidate) => candidate.item_id)
      .filter((candidate): candidate is number => typeof candidate === "number")
      .filter((candidate) => candidate !== item.item_id)
      .slice(0, 6) ?? [];

  const relatedBatch =
    relatedItemIds.length > 0
      ? await serverApi.getBatchPrices({ item_ids: relatedItemIds, currency: "USD" }, 30)
      : null;

  const relatedQuotes = new Map<number, BatchPriceItem>();
  for (const row of relatedBatch?.items ?? []) {
    relatedQuotes.set(row.item_id, row);
  }

  return {
    item,
    providers,
    prices,
    bids,
    sales,
    analytics,
    priceHistory,
    chartSeries: buildPriceHistorySeries(priceHistory),
    bestAsk: getBestAsk(prices?.items ?? []),
    bestBid: getBestBid(bids?.items ?? []),
    coverage: getCoverageSummary(prices, bids),
    siblingVariants: getSiblingVariants(
      siblingItems?.items ?? [],
      item,
      siblingBatch?.items ?? [],
    ),
    relatedItems:
      relatedItems?.items
        .filter((candidate) => candidate.item_id !== item.item_id)
        .slice(0, 6)
        .map((related) => {
          const bestQuote =
            related.item_id != null
              ? relatedQuotes
                  .get(related.item_id)
                  ?.quotes.slice()
                  .sort((left, right) => left.lowest_ask - right.lowest_ask)[0] ?? null
              : null;

          return {
            item: related,
            bestAsk: bestQuote?.lowest_ask ?? null,
          };
        }) ?? [],
  };
}

export async function getItemDetailPageCoreData(itemId: number) {
  const [item, providers, prices, bids] = await Promise.all([
    serverApi.getItem(itemId, 120),
    serverApi.getProviders(300),
    serverApi.getPrices(`/v1/web/prices?item_id=${itemId}&limit=50`, 30),
    serverApi.getBids(`/v1/web/bids?item_id=${itemId}&limit=50`, 30),
  ]);

  if (!item) {
    return null;
  }

  return {
    item,
    providers,
    prices,
    bids,
    bestAsk: getBestAsk(prices?.items ?? []),
    bestBid: getBestBid(bids?.items ?? []),
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
