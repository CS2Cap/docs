import { cookies } from "next/headers";
import {
  API_BASE_URL,
  WEB_AUTH_TOKEN_COOKIE_NAME,
  WEB_SESSION_COOKIE_NAME,
} from "./config";
import { buildQuery } from "./shared";
import {
  getCachedMarketItemsSnapshot,
  refreshMarketItemsSnapshotInBackground,
  setCachedMarketItemsSnapshot,
} from "../upstash-cache";
import type {
  AccountInfo,
  BatchPricesResponse,
  BidsResponse,
  BillingOverviewResponse,
  ItemOut,
  ItemsMetadataResponse,
  ItemsResponse,
  MarketItemAnalyticsResponse,
  MarketItemsSnapshotResponse,
  MarketTimeframe,
  PlansResponse,
  PriceCandlesPage,
  PriceSnapshotPage,
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

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const serverApi = {
  async getSession() {
    const cookieStore = await cookies();
    const hasSessionCookie = cookieStore.has(WEB_SESSION_COOKIE_NAME);
    const hasAuthTokenCookie = cookieStore.has(WEB_AUTH_TOKEN_COOKIE_NAME);

    if (!hasSessionCookie && !hasAuthTokenCookie) {
      return null;
    }

    const session = await serverFetch<AccountInfo>("/v1/web/session");
    if (session) {
      return session;
    }

    return serverFetch<AccountInfo>("/v1/web/account");
  },
  getItems(params = "", revalidate: number | false = false) {
    return serverFetch<ItemsResponse>(`/v1/web/items${params}`, { revalidate });
  },
  getItem(itemId: number, revalidate: number | false = false) {
    return serverFetch<ItemOut>(`/v1/web/items/${itemId}`, { revalidate });
  },
  getItemsMetadata(revalidate: number | false = false) {
    return serverFetch<ItemsMetadataResponse>("/v1/web/items/metadata", { revalidate });
  },
  getProviders(revalidate: number | false = false) {
    return serverFetch<ProvidersResponse>("/v1/web/providers", { revalidate }).then(
      normalizeProvidersResponse,
    );
  },
  getPrices(path: string, revalidate: number | false = false) {
    return serverFetch<PricesPaginatedResponse>(path, { revalidate });
  },
  getBatchPrices(body: { item_ids: number[]; currency?: string }, revalidate: number | false = false) {
    return serverFetch<BatchPricesResponse>("/v1/web/prices/batch", {
      method: "POST",
      body,
      revalidate,
    });
  },
  getBids(path: string, revalidate: number | false = false) {
    return serverFetch<BidsResponse>(path, { revalidate });
  },
  getSales(path: string, revalidate: number | false = false) {
    return serverFetch<SalesHistoryResponse>(path, { revalidate });
  },
  getPriceHistory(path: string, revalidate: number | false = false) {
    return serverFetch<PriceSnapshotPage>(path, { revalidate });
  },
  getPriceCandles(path: string, revalidate: number | false = false) {
    return serverFetch<PriceCandlesPage>(path, { revalidate });
  },
  async getMarketItemsSnapshot(
    params: { timeframe?: MarketTimeframe } = {},
    revalidate: number | false = false,
  ) {
    void revalidate;
    const timeframe = params.timeframe ?? "24h";
    const cached = await getCachedMarketItemsSnapshot(timeframe);

    const fetchAndStore = async () => {
      const fresh = await serverFetch<MarketItemsSnapshotResponse>(
        `/v1/web/market/items${buildQuery(params)}`,
        {
          revalidate: false,
          timeoutMs: 20000,
        },
      );

      if (fresh) {
        await setCachedMarketItemsSnapshot(timeframe, fresh);
      }
    };

    if (cached) {
      // Stale-while-revalidate: serve immediately, refresh in the background if stale.
      if (cached.isStale) {
        refreshMarketItemsSnapshotInBackground(timeframe, fetchAndStore);
      }
      return cached.snapshot;
    }

    // Cold cache — we have to wait, but cap the wait so the page never hangs forever.
    const fresh = await serverFetch<MarketItemsSnapshotResponse>(
      `/v1/web/market/items${buildQuery(params)}`,
      {
        revalidate: false,
        timeoutMs: 20000,
      },
    );

    if (fresh) {
      void setCachedMarketItemsSnapshot(timeframe, fresh);
    }

    return fresh;
  },
  getMarketItem(itemId: number, revalidate: number | false = false) {
    return serverFetch<MarketItemAnalyticsResponse>(`/v1/web/market/items/${itemId}`, {
      revalidate,
    });
  },
  getBillingPlans(revalidate: number | false = false) {
    return serverFetch<PlansResponse>("/v1/web/account/billing/plans", { revalidate });
  },
  getBillingStatus(revalidate: number | false = false) {
    return serverFetch<SubscriptionStatus>("/v1/web/account/billing/status", { revalidate });
  },
  getBillingOverview(revalidate: number | false = false) {
    return serverFetch<BillingOverviewResponse>("/v1/web/account/billing/overview", {
      revalidate,
    });
  },
};
