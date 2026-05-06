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
  refreshBidsSnapshotInBackground,
  refreshItemsSnapshotInBackground,
  refreshMarketItemsSnapshotInBackground,
  refreshPricesSnapshotInBackground,
  setCachedBidsSnapshot,
  setCachedItemsSnapshot,
  setCachedMarketItemsSnapshot,
  setCachedPricesSnapshot,
} from "../upstash-cache";
import type {
  AccountInfo,
  BidsResponse,
  BillingOverviewResponse,
  BuyOrderItem,
  ItemOut,
  ItemsMetadataResponse,
  ItemsResponse,
  MarketItem,
  MarketItemsSnapshotResponse,
  MarketTimeframe,
  PlansResponse,
  PriceCandlesPage,
  PricesMeta,
  PricesPaginatedResponse,
  ProviderInfo,
  ProvidersResponse,
  SalesHistoryResponse,
  SubscriptionStatus,
} from "./types";

interface ServerFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  revalidate?: number | false;
  timeoutMs?: number;
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
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WEB_SESSION_COOKIE_NAME);
  const authTokenCookie = cookieStore.get(WEB_AUTH_TOKEN_COOKIE_NAME);
  const { method = "GET", body, revalidate = false, timeoutMs = 8000 } = options;

  const headers: Record<string, string> = {};

  if (authTokenCookie?.value) {
    headers.Authorization = `Bearer ${authTokenCookie.value}`;
  }
  if (sessionCookie) {
    headers.Cookie = `${sessionCookie.name}=${sessionCookie.value}`;
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

async function fetchAllPricesAndStore() {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/web/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as PricesPaginatedResponse;
    await setCachedPricesSnapshot({
      byItemId: groupMarketItemsById(data.items),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Silently fail — next request retries, cron ensures eventual freshness
  }
}

async function fetchAllBidsAndStore() {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/web/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as BidsResponse;
    await setCachedBidsSnapshot({
      byItemId: groupBidItemsById(data.items),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Silently fail
  }
}

async function fetchAllItemsAndStore() {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/web/items?limit=1000`, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as ItemsResponse;
    if (!data.pagination.has_next) {
      await setCachedItemsSnapshot(buildItemsSnapshotData(data.items));
    }
    // Partial data — let cron handle full pagination
  } catch {
    // Silently fail
  }
}

// ── Data assembly helpers ─────────────────────────────────────────────────────

function groupMarketItemsById(items: MarketItem[]): Record<number, MarketItem[]> {
  const grouped: Record<number, MarketItem[]> = {};
  for (const item of items) {
    (grouped[item.item_id] ??= []).push(item);
  }
  return grouped;
}

function groupBidItemsById(items: BuyOrderItem[]): Record<number, BuyOrderItem[]> {
  const grouped: Record<number, BuyOrderItem[]> = {};
  for (const item of items) {
    (grouped[item.item_id] ??= []).push(item);
  }
  return grouped;
}

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
  async getItemById(itemId: number): Promise<ItemOut | null> {
    const cached = await getCachedItemsSnapshot();
    if (cached) {
      if (cached.isStale) refreshItemsSnapshotInBackground(fetchAllItemsAndStore);
      return cached.snapshot.byItemId[itemId] ?? null;
    }
    return serverFetch<ItemOut>(`/v1/web/items/${itemId}`, { revalidate: 3600 });
  },

  getItemsMetadata(revalidate: number | false = false) {
    return serverFetch<ItemsMetadataResponse>("/v1/web/items/metadata", { revalidate });
  },

  getProviders(revalidate: number | false = false) {
    return serverFetch<ProvidersResponse>("/v1/web/providers", { revalidate }).then(
      normalizeProvidersResponse,
    );
  },

  // Prices — served from Redis snapshot; cold-starts fall through to targeted POST.
  async postPrices(
    query: { item_ids: number[]; currency?: string; limit?: number },
  ): Promise<PricesPaginatedResponse | null> {
    const cached = await getCachedPricesSnapshot();
    if (cached) {
      if (cached.isStale) refreshPricesSnapshotInBackground(fetchAllPricesAndStore);
      return assemblePricesResponse(cached.snapshot.byItemId, query);
    }
    return serverFetch<PricesPaginatedResponse>("/v1/web/prices", {
      method: "POST",
      body: query,
      revalidate: false,
      timeoutMs: 20000,
    });
  },

  // Bids — served from Redis snapshot; cold-starts fall through to targeted POST.
  async postBids(
    query: { item_ids: number[]; currency?: string; limit?: number },
  ): Promise<BidsResponse | null> {
    const cached = await getCachedBidsSnapshot();
    if (cached) {
      if (cached.isStale) refreshBidsSnapshotInBackground(fetchAllBidsAndStore);
      return assembleBidsResponse(cached.snapshot.byItemId, query);
    }
    return serverFetch<BidsResponse>("/v1/web/bids", {
      method: "POST",
      body: query,
      revalidate: false,
      timeoutMs: 20000,
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
