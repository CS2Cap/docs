import openapiSpec from "../../../openapi.json";
import { serverApi } from "./server";
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
  MarketItem,
  ProviderInfo,
  WebSearchDirection,
  WebSearchResponse,
  WebSearchSort,
} from "./types";

type OpenApiOperation = {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  security?: Array<Record<string, unknown>>;
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
  weapon_type?: string;
  wear_name?: string;
  rarity_name?: string;
  collection?: string;
  phase?: string;
  min_price_usd?: string;
  max_price_usd?: string;
  sort?: WebSearchSort;
  direction?: WebSearchDirection;
};

export async function getSearchPageData(input: {
  q?: string;
  page?: number;
  filters?: SearchFilterValues;
}): Promise<WebSearchResponse> {
  const { q = "", page = 1, filters = {} } = input;
  const limit = SEARCH_PAGE_SIZE;
  const currentPage = Math.max(page, 1);
  const offset = (currentPage - 1) * limit;

  const response = await serverApi.getSearch(
    {
      q: q || undefined,
      item_type: filters.item_type ? [filters.item_type] : undefined,
      weapon_type: filters.weapon_type ? [filters.weapon_type] : undefined,
      wear_name: filters.wear_name ? [filters.wear_name] : undefined,
      rarity_name: filters.rarity_name ? [filters.rarity_name] : undefined,
      collection: filters.collection ? [filters.collection] : undefined,
      phase: filters.phase ? [filters.phase] : undefined,
      min_price_usd: filters.min_price_usd || undefined,
      max_price_usd: filters.max_price_usd || undefined,
      sort: filters.sort || "rank",
      direction: filters.direction || "asc",
      limit,
      offset,
    },
    30,
    { anon: true },
  );

  return response ?? {
    meta: {
      generated_at: new Date().toISOString(),
      data_source: "cache",
      freshness_sec: 0,
      query: q || null,
      filters: {
        item_type: filters.item_type ? [filters.item_type] : [],
        weapon_type: filters.weapon_type ? [filters.weapon_type] : [],
        rarity_name: filters.rarity_name ? [filters.rarity_name] : [],
        wear_name: filters.wear_name ? [filters.wear_name] : [],
        phase: filters.phase ? [filters.phase] : [],
        collection: filters.collection ? [filters.collection] : [],
        min_price_usd: filters.min_price_usd ?? null,
        max_price_usd: filters.max_price_usd ?? null,
      },
      sort: filters.sort || "rank",
      direction: filters.direction || "asc",
    },
    items: [],
    facets: {
      item_type: [],
      weapon_type: [],
      rarity_name: [],
      wear_name: [],
      phase: [],
      collection: [],
    },
    price_histogram: [],
    pagination: {
      limit,
      offset,
      total: 0,
      has_next: false,
      has_prev: offset > 0,
    },
  };
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
