import { cookies } from "next/headers";
import {
  API_BASE_URL,
  WEB_AUTH_TOKEN_COOKIE_NAME,
  WEB_SESSION_COOKIE_NAME,
} from "./config";
import { buildQuery } from "./shared";
import {
  getCachedBidsSnapshot,
  getCachedItemsSnapshot,
  getCachedMarketItemsSnapshot,
  getCachedPricesSnapshot,
  refreshItemsSnapshotInBackground,
  refreshMarketItemsSnapshotInBackground,
  setCachedItemsSnapshot,
  setCachedMarketItemsSnapshot,
} from "../blob-snapshot-cache";
import type {
  AccountInfo,
  BatchPricesResponse,
  BidsResponse,
  BillingOverviewResponse,
  BuyOrderItem,
  ItemOut,
  ItemsMetadataResponse,
  ItemsResponse,
  MarketIndexesResponse,
  MarketIndexGroupBy,
  MarketItem,
  MarketItemsSnapshotResponse,
  MarketOverviewResponse,
  MarketTimeframe,
  PlansResponse,
  PriceCandlesPage,
  PricesMeta,
  PricesPaginatedResponse,
  ProviderInfo,
  ProvidersResponse,
  SalesHistoryResponse,
  SubscriptionStatus,
  WebSearchDirection,
  WebSearchResponse,
  WebSearchSort,
} from "./types";

interface ServerFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  revalidate?: number | false;
  timeoutMs?: number;
  // Skip reading cookies. Required for any caller that wants the surrounding
  // route to remain statically renderable — `cookies()` opts the route into
  // dynamic rendering even if the cookie value is unused.
  anon?: boolean;
}

function normalizeProvidersResponse(
  providers: ProvidersResponse | null | undefined,
): ProviderInfo[] {
  if (!providers) return [];
  if (Array.isArray(providers)) return providers;
  return Object.entries(providers).map(([name, provider]) => ({ ...provider, name }));
}

export async function serverFetch<T>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<T | null> {
  const { method = "GET", body, revalidate = false, timeoutMs = 8000, anon = false } = options;

  const headers: Record<string, string> = {};

  if (!anon) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WEB_SESSION_COOKIE_NAME);
    const authTokenCookie = cookieStore.get(WEB_AUTH_TOKEN_COOKIE_NAME);
    if (authTokenCookie?.value) {
      headers.Authorization = `Bearer ${authTokenCookie.value}`;
    }
    if (sessionCookie) {
      headers.Cookie = `${sessionCookie.name}=${sessionCookie.value}`;
    }
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { ...headers, connection: "close" },
      cache: revalidate === false ? "no-store" : "force-cache",
      next: revalidate === false ? undefined : { revalidate },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

// ── Background refresh helpers (raw fetch, no user cookies) ──────────────────


async function fetchAllItemsAndStore() {
  const apiKey = process.env.CS2C_EXPORT_API_KEY;
  if (!apiKey) return;
  try {
    const response = await fetch(`${API_BASE_URL}/v1/items`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as ItemsResponse;
    await setCachedItemsSnapshot(buildItemsSnapshotData(data.items));
  } catch {
    // Silently fail
  }
}

// ── Data assembly helpers ─────────────────────────────────────────────────────

function buildItemsSnapshotData(items: ItemOut[]) {
  const byItemId: Record<number, ItemOut> = {};
  for (const item of items) {
    if (item.item_id != null) byItemId[item.item_id] = item;
  }
  return { items, byItemId, total: items.length, timestamp: new Date().toISOString() };
}

function assemblePricesResponse(
  byItemId: Record<number, MarketItem[]>,
  query: { item_ids: number[]; currency?: string; limit?: number },
): PricesPaginatedResponse {
  const priceItems: MarketItem[] = [];
  const returnedProviders = new Set<string>();
  for (const itemId of query.item_ids) {
    const asks = byItemId[itemId] ?? [];
    const limited = query.limit != null ? asks.slice(0, query.limit) : asks;
    for (const ask of limited) {
      priceItems.push(ask);
      returnedProviders.add(ask.provider);
    }
  }
  const meta: PricesMeta = {
    currency: query.currency ?? "USD",
    filters: {},
    returned_providers: [...returnedProviders],
  };
  return {
    meta,
    items: priceItems,
    pagination: {
      limit: query.limit ?? priceItems.length,
      offset: 0,
      total: priceItems.length,
      has_next: false,
      has_prev: false,
    },
  };
}

function assembleBidsResponse(
  byItemId: Record<number, BuyOrderItem[]>,
  query: { item_ids: number[]; currency?: string; limit?: number },
): BidsResponse {
  const bidItems: BuyOrderItem[] = [];
  const queriedProviders = new Set<string>();
  for (const itemId of query.item_ids) {
    const bids = byItemId[itemId] ?? [];
    const limited = query.limit != null ? bids.slice(0, query.limit) : bids;
    for (const bid of limited) {
      bidItems.push(bid);
      queriedProviders.add(bid.provider);
    }
  }
  return {
    meta: {
      currency: query.currency ?? "USD",
      filters: {},
      providers_queried: [...queriedProviders],
    },
    items: bidItems,
    pagination: {
      limit: query.limit ?? bidItems.length,
      offset: 0,
      total: bidItems.length,
      has_next: false,
      has_prev: false,
    },
  };
}

function filterItemsFromSnapshot(items: ItemOut[], query: URLSearchParams): ItemOut[] {
  let filtered = items;
  const baseName = query.get("base_name");
  const skinName = query.get("skin_name");
  const weaponType = query.get("weapon_type");
  const offset = Number(query.get("offset")) || 0;
  const limit = Number(query.get("limit")) || 0;
  if (baseName) filtered = filtered.filter((i) => i.base_name === baseName);
  if (skinName) filtered = filtered.filter((i) => i.skin_name === skinName);
  if (weaponType) filtered = filtered.filter((i) => i.weapon_type === weaponType);
  if (offset) filtered = filtered.slice(offset);
  if (limit) filtered = filtered.slice(0, limit);
  return filtered;
}

// ── serverApi ─────────────────────────────────────────────────────────────────

export const serverApi = {
  async getSession() {
    const cookieStore = await cookies();
    const hasSessionCookie = cookieStore.has(WEB_SESSION_COOKIE_NAME);
    const hasAuthTokenCookie = cookieStore.has(WEB_AUTH_TOKEN_COOKIE_NAME);
    if (!hasSessionCookie && !hasAuthTokenCookie) return null;
    const session = await serverFetch<AccountInfo>("/v1/web/session");
    if (session) return session;
    return serverFetch<AccountInfo>("/v1/web/account");
  },

  // Returns from items snapshot when no full-text `q` param is present.
  async getItems(params = "", revalidate: number | false = false): Promise<ItemsResponse | null> {
    const qs = params.startsWith("?") ? params.slice(1) : params;
    const query = new URLSearchParams(qs);

    if (!query.has("q")) {
      const cached = await getCachedItemsSnapshot();
      if (cached) {
        if (cached.isStale) refreshItemsSnapshotInBackground(fetchAllItemsAndStore);
        const filtered = filterItemsFromSnapshot(cached.snapshot.items, query);
        return {
          items: filtered,
          pagination: {
            limit: Number(query.get("limit")) || filtered.length,
            offset: Number(query.get("offset")) || 0,
            total: filtered.length,
            has_next: false,
            has_prev: false,
          },
        };
      }
    }

    return serverFetch<ItemsResponse>(`/v1/web/items${params}`, { revalidate });
  },

  // Single item by ID — reads from items snapshot, falls back to per-item API call.
  async getItemById(itemId: number, opts: { anon?: boolean } = {}): Promise<ItemOut | null> {
    const cached = await getCachedItemsSnapshot();
    if (cached) {
      if (cached.isStale) refreshItemsSnapshotInBackground(fetchAllItemsAndStore);
      return cached.snapshot.byItemId[itemId] ?? null;
    }
    return serverFetch<ItemOut>(`/v1/web/items/${itemId}`, { revalidate: 3600, anon: opts.anon });
  },

  // Bulk variant — read the items snapshot once and look up many ids in-process,
  // instead of N parallel snapshot reads (each of which would re-fetch+gunzip
  // the whole blob on a cold instance).
  async getItemsByIds(
    itemIds: number[],
    opts: { anon?: boolean } = {},
  ): Promise<ItemOut[]> {
    const cached = await getCachedItemsSnapshot();
    if (cached) {
      if (cached.isStale) refreshItemsSnapshotInBackground(fetchAllItemsAndStore);
      return itemIds
        .map((id) => cached.snapshot.byItemId[id])
        .filter((item): item is ItemOut => item != null);
    }
    const fetched = await Promise.all(
      itemIds.map((id) =>
        serverFetch<ItemOut>(`/v1/web/items/${id}`, { revalidate: 3600, anon: opts.anon }),
      ),
    );
    return fetched.filter((item): item is ItemOut => item != null);
  },

  getItemsMetadata(revalidate: number | false = false, opts: { anon?: boolean } = {}) {
    return serverFetch<ItemsMetadataResponse>("/v1/web/items/metadata", {
      revalidate,
      anon: opts.anon,
    });
  },

  getSearch(
    params: {
      q?: string;
      item_type?: string[];
      base_name?: string[];
      weapon_type?: string[];
      rarity_name?: string[];
      wear_name?: string[];
      phase?: string[];
      collection?: string[];
      is_stattrak?: boolean;
      is_souvenir?: boolean;
      min_price_usd?: string;
      max_price_usd?: string;
      sort?: WebSearchSort;
      direction?: WebSearchDirection;
      limit?: number;
      offset?: number;
    } = {},
    revalidate: number | false = 30,
    opts: { anon?: boolean } = {},
  ) {
    return serverFetch<WebSearchResponse>(`/v1/web/search${buildQuery(params)}`, {
      revalidate,
      anon: opts.anon,
      timeoutMs: 10000,
    });
  },

  async getProviders(revalidate: number | false = false, opts: { anon?: boolean } = {}) {
    return normalizeProvidersResponse(
      await serverFetch<ProvidersResponse>("/v1/web/providers", { revalidate, anon: opts.anon }),
    );
  },

  // Prices — served from Blob snapshot; cold-starts fall through to targeted API calls.
  async postPrices(
    query: { item_ids: number[]; currency?: string; limit?: number },
    opts: { anon?: boolean; revalidate?: number | false } = {},
  ): Promise<PricesPaginatedResponse | null> {
    const cached = await getCachedPricesSnapshot();
    if (cached) {
      return assemblePricesResponse(cached.snapshot.byItemId, query);
    }
    const revalidate = opts.revalidate ?? false;
    // Cold-start: single item uses GET, multiple items use batch POST
    if (query.item_ids.length === 1) {
      const params = new URLSearchParams({ item_id: String(query.item_ids[0]) });
      if (query.limit != null) params.set("limit", String(query.limit));
      if (query.currency) params.set("currency", query.currency);
      return serverFetch<PricesPaginatedResponse>(`/v1/web/prices?${params}`, {
        revalidate,
        timeoutMs: 10000,
        anon: opts.anon,
      });
    }
    const batch = await serverFetch<BatchPricesResponse>("/v1/web/prices/batch", {
      method: "POST",
      body: { item_ids: query.item_ids, currency: query.currency },
      revalidate,
      timeoutMs: 15000,
      anon: opts.anon,
    });
    if (!batch) return null;
    const priceItems: MarketItem[] = batch.items.flatMap((bi) =>
      bi.quotes.map((q) => ({
        provider: q.provider,
        item_id: bi.item_id,
        market_hash_name: bi.market_hash_name,
        phase: bi.phase,
        lowest_ask: q.lowest_ask,
        quantity: q.quantity,
        timestamp: q.timestamp,
        last_updated: q.last_updated,
      })),
    );
    const limited = query.limit != null ? priceItems.slice(0, query.limit) : priceItems;
    return {
      meta: { currency: query.currency ?? "USD", filters: {}, returned_providers: batch.meta.providers_queried },
      items: limited,
      pagination: { limit: query.limit ?? limited.length, offset: 0, total: limited.length, has_next: false, has_prev: false },
    };
  },

  // Bids — served from Blob snapshot; cold-starts fall through to targeted GET.
  async postBids(
    query: { item_ids: number[]; currency?: string; limit?: number },
    opts: { anon?: boolean } = {},
  ): Promise<BidsResponse | null> {
    const cached = await getCachedBidsSnapshot();
    if (cached) {
      return assembleBidsResponse(cached.snapshot.byItemId, query);
    }
    // Cold-start: single item GET only — no multi-item bids endpoint
    if (query.item_ids.length !== 1) return null;
    const params = new URLSearchParams({ item_id: String(query.item_ids[0]) });
    if (query.limit != null) params.set("limit", String(query.limit));
    if (query.currency) params.set("currency", query.currency);
    return serverFetch<BidsResponse>(`/v1/web/bids?${params}`, {
      revalidate: false,
      timeoutMs: 10000,
      anon: opts.anon,
    });
  },

  getSales(path: string, revalidate: number | false = false) {
    return serverFetch<SalesHistoryResponse>(path, { revalidate });
  },

  getPriceCandles(path: string, revalidate: number | false = false) {
    return serverFetch<PriceCandlesPage>(path, { revalidate });
  },

  async getMarketItemsSnapshot(
    params: { timeframe?: MarketTimeframe; item_id?: number } = {},
    revalidate: number | false = false,
  ) {
    void revalidate;
    const timeframe = params.timeframe ?? "24h";
    const cached = await getCachedMarketItemsSnapshot(timeframe);

    const fetchAndStore = async () => {
      const fresh = await serverFetch<MarketItemsSnapshotResponse>(
        `/v1/web/market/items${buildQuery({ timeframe })}`,
        { revalidate: false, timeoutMs: 20000 },
      );
      if (fresh) await setCachedMarketItemsSnapshot(timeframe, fresh);
    };

    if (cached) {
      if (cached.isStale) refreshMarketItemsSnapshotInBackground(timeframe, fetchAndStore);
      return cached.snapshot;
    }

    const fresh = await serverFetch<MarketItemsSnapshotResponse>(
      `/v1/web/market/items${buildQuery({ timeframe })}`,
      { revalidate: false, timeoutMs: 20000 },
    );
    if (fresh) void setCachedMarketItemsSnapshot(timeframe, fresh);
    return fresh;
  },

  // Market cap indexes — anonymous public web-tier endpoint.
  getMarketIndexes(
    groupBy: MarketIndexGroupBy = "item_type",
    revalidate: number | false = 300,
  ) {
    return serverFetch<MarketIndexesResponse>(
      `/v1/web/market/indexes${buildQuery({ group_by: groupBy })}`,
      { revalidate, anon: true, timeoutMs: 10000 },
    );
  },

  getMarketOverview(revalidate: number | false = 60) {
    return serverFetch<MarketOverviewResponse>("/v1/web/market/overview", {
      revalidate,
      anon: true,
      timeoutMs: 10000,
    });
  },

  getBillingPlans(revalidate: number | false = false) {
    return serverFetch<PlansResponse>("/v1/web/account/billing/plans", { revalidate });
  },
  getBillingStatus(revalidate: number | false = false) {
    return serverFetch<SubscriptionStatus>("/v1/web/account/billing/status", { revalidate });
  },
  getBillingOverview(revalidate: number | false = false) {
    return serverFetch<BillingOverviewResponse>("/v1/web/account/billing/overview", { revalidate });
  },
};
