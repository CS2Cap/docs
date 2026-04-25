"use client";

import { API_BASE_URL, BROWSER_API_BASE_PATH } from "./config";
import { buildQuery, parseApiResponse } from "./shared";
import type {
  AccountInfo,
  AccountPreferences,
  AlertCreateRequest,
  AlertDefinition,
  AlertEventsResponse,
  AlertListResponse,
  AlertUpdateRequest,
  AllProviders,
  APIKeyGetResponse,
  APIKeyReissueResponse,
  BatchPricesResponse,
  BidsResponse,
  BillingOverviewResponse,
  ChangePlanRequest,
  ChangePlanResponse,
  ChildAPIKeyCreateRequest,
  ChildAPIKeyCreateResponse,
  ChildAPIKeyDetailResponse,
  ChildAPIKeyListResponse,
  ChildAPIKeyUpdateRequest,
  CheckoutRequest,
  CheckoutResponse,
  CryptoCheckoutRequest,
  CryptoCheckoutResponse,
  DeleteAccountResponse,
  EmailChangeRequest,
  EmailSetRequest,
  ItemOut,
  ItemsMetadataResponse,
  ItemsResponse,
  LinkedProviderResponse,
  MarketItemAnalyticsResponse,
  PendingChangeCancelResponse,
  PhaseName,
  PlansResponse,
  PortalResponse,
  PriceCandlesPage,
  PriceSnapshotPage,
  PricesPaginatedResponse,
  ProviderInfo,
  ProvidersResponse,
  SalesHistoryResponse,
  SubscriptionStatus,
  UsageDashboardResponse,
  VerifyEmailConfirmResponse,
  VerifyEmailSendResponse,
  WatchlistResponse,
  WebSessionLogoutResponse,
} from "./types";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
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

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BROWSER_API_BASE_PATH}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseApiResponse<T>(response);
}

export function getOAuthLoginUrl(provider: "steam" | "google" | "discord"): string {
  return `${API_BASE_URL}/v1/web/auth/${provider}/login`;
}

export const webApi = {
  async getSession(): Promise<AccountInfo> {
    try {
      return await request("/v1/web/session");
    } catch {
      return request("/v1/web/account");
    }
  },

  logout(): Promise<WebSessionLogoutResponse> {
    return request("/v1/web/auth/logout", { method: "POST" });
  },

  getLinkedProviders(): Promise<LinkedProviderResponse[]> {
    return request("/v1/web/auth/providers");
  },

  unlinkProvider(provider: string): Promise<unknown> {
    return request(`/v1/web/auth/providers/${provider}`, { method: "DELETE" });
  },

  getItems(
    params: {
      q?: string;
      item_id?: number;
      market_hash_name?: string;
      item_type?: string;
      item_subtype?: string;
      weapon_type?: string;
      base_name?: string;
      skin_name?: string;
      wear_name?: string;
      phase?: PhaseName;
      collection?: string;
      rarity_name?: string;
      is_stattrak?: boolean;
      is_souvenir?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<ItemsResponse> {
    return request(`/v1/web/items${buildQuery(params)}`);
  },

  getItem(itemId: number): Promise<ItemOut> {
    return request(`/v1/web/items/${itemId}`);
  },

  getItemsMetadata(): Promise<ItemsMetadataResponse> {
    return request("/v1/web/items/metadata");
  },

  getProviders(params: { provider?: string } = {}): Promise<ProviderInfo[]> {
    return request<ProvidersResponse>(`/v1/web/providers${buildQuery(params)}`).then(
      normalizeProvidersResponse,
    );
  },

  getPrices(
    params: {
      item_id?: number;
      market_hash_name?: string;
      phase?: PhaseName;
      providers?: AllProviders[];
      currency?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<PricesPaginatedResponse> {
    return request(`/v1/web/prices${buildQuery(params)}`);
  },

  getBatchPrices(data: {
    item_ids: number[];
    providers?: AllProviders[];
    currency?: string;
  }): Promise<BatchPricesResponse> {
    return request("/v1/web/prices/batch", { method: "POST", body: data });
  },

  getPriceHistory(params: {
    item_id?: number;
    market_hash_name?: string;
    phase?: PhaseName;
    provider?: string;
    start?: string;
    end?: string;
    currency?: string;
    limit?: number;
    cursor?: string;
  }): Promise<PriceSnapshotPage> {
    return request(`/v1/web/prices/history${buildQuery(params)}`);
  },

  getPriceCandles(params: {
    item_id?: number;
    market_hash_name?: string;
    phase?: PhaseName;
    start?: string;
    end?: string;
    lookback?: string;
    interval?: "5m" | "1h" | "1d";
    fill?: boolean;
    currency?: string;
    limit?: number;
    cursor?: string;
  }): Promise<PriceCandlesPage> {
    return request(`/v1/web/prices/candles${buildQuery(params)}`);
  },

  getBids(params: {
    item_id?: number;
    market_hash_name?: string;
    phase?: PhaseName;
    providers?: AllProviders[];
    currency?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<BidsResponse> {
    return request(`/v1/web/bids${buildQuery(params)}`);
  },

  getSales(params: {
    item_id?: number;
    market_hash_name?: string;
    phase?: PhaseName;
    providers?: AllProviders[];
    currency?: string;
    limit?: number;
  } = {}): Promise<SalesHistoryResponse> {
    return request(`/v1/web/sales${buildQuery(params)}`);
  },

  getMarketItem(itemId: number, params: { timeframe?: string } = {}): Promise<MarketItemAnalyticsResponse> {
    return request(`/v1/web/market/items/${itemId}${buildQuery(params)}`);
  },

  getAccount(): Promise<AccountInfo> {
    return request("/v1/web/account");
  },

  getAccountPreferences(): Promise<AccountPreferences> {
    return request("/v1/account/preferences");
  },

  updateAccountPreferences(data: Partial<AccountPreferences>): Promise<AccountPreferences> {
    return request("/v1/account/preferences", { method: "PATCH", body: data });
  },

  getAPIKey(): Promise<APIKeyGetResponse> {
    return request("/v1/web/account/key");
  },

  reissueAPIKey(): Promise<APIKeyReissueResponse> {
    return request("/v1/web/account/key/reissue", { method: "POST" });
  },

  getWatchlist(params: { limit?: number; offset?: number; search?: string } = {}): Promise<WatchlistResponse> {
    return request(`/v1/web/account/watchlist${buildQuery(params)}`);
  },

  addToWatchlist(itemId: number): Promise<unknown> {
    return request("/v1/web/account/watchlist", {
      method: "POST",
      body: { item_id: itemId },
    });
  },

  removeFromWatchlist(itemId: number): Promise<unknown> {
    return request(`/v1/web/account/watchlist/${itemId}`, { method: "DELETE" });
  },

  getAlerts(params: { limit?: number; offset?: number; search?: string } = {}): Promise<AlertListResponse> {
    return request(`/v1/web/account/alerts${buildQuery(params)}`);
  },

  createAlert(data: AlertCreateRequest): Promise<AlertDefinition> {
    return request("/v1/web/account/alerts", { method: "POST", body: data });
  },

  updateAlert(alertId: string, data: AlertUpdateRequest): Promise<AlertDefinition> {
    return request(`/v1/web/account/alerts/${alertId}`, {
      method: "PATCH",
      body: data,
    });
  },

  deleteAlert(alertId: string): Promise<unknown> {
    return request(`/v1/web/account/alerts/${alertId}`, { method: "DELETE" });
  },

  getAlertEvents(params: { limit?: number; offset?: number } = {}): Promise<AlertEventsResponse> {
    return request(`/v1/web/account/alerts/events${buildQuery(params)}`);
  },

  getBillingPlans(): Promise<PlansResponse> {
    return request("/v1/web/account/billing/plans");
  },

  getBillingStatus(): Promise<SubscriptionStatus> {
    return request("/v1/web/account/billing/status");
  },

  getBillingOverview(): Promise<BillingOverviewResponse> {
    return request("/v1/web/account/billing/overview");
  },

  createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
    return request("/v1/web/account/billing/checkout", {
      method: "POST",
      body: data,
    });
  },

  createCryptoCheckout(data: CryptoCheckoutRequest): Promise<CryptoCheckoutResponse> {
    return request("/v1/web/account/billing/crypto/checkout", {
      method: "POST",
      body: data,
    });
  },

  getBillingPortal(): Promise<PortalResponse> {
    return request("/v1/web/account/billing/portal", { method: "POST" });
  },

  changePlan(priceId: string): Promise<ChangePlanResponse> {
    return request("/v1/web/account/billing/change-plan", {
      method: "POST",
      body: { price_id: priceId } satisfies ChangePlanRequest,
    });
  },

  cancelPendingChange(): Promise<PendingChangeCancelResponse> {
    return request("/v1/web/account/billing/pending-change", { method: "DELETE" });
  },

  getAccountUsageStats(): Promise<UsageDashboardResponse> {
    return request("/v1/account/usage");
  },

  sendVerifyEmail(): Promise<VerifyEmailSendResponse> {
    return request("/v1/account/verify-email/send", { method: "POST" });
  },

  confirmVerifyEmail(token: string): Promise<VerifyEmailConfirmResponse> {
    return request("/v1/account/verify-email/confirm", {
      method: "POST",
      body: { token },
    });
  },

  setEmail(email: string): Promise<VerifyEmailSendResponse> {
    return request("/v1/account/email", {
      method: "POST",
      body: { email } satisfies EmailSetRequest,
    });
  },

  changeEmail(newEmail: string): Promise<VerifyEmailSendResponse> {
    return request("/v1/account/email", {
      method: "PATCH",
      body: { new_email: newEmail } satisfies EmailChangeRequest,
    });
  },

  listSubKeys(params: { limit?: number; offset?: number } = {}): Promise<ChildAPIKeyListResponse> {
    return request(`/v1/account/sub-keys${buildQuery(params)}`);
  },

  createSubKey(data: ChildAPIKeyCreateRequest): Promise<ChildAPIKeyCreateResponse> {
    return request("/v1/account/sub-keys", { method: "POST", body: data });
  },

  updateSubKey(keyId: string, data: ChildAPIKeyUpdateRequest): Promise<ChildAPIKeyDetailResponse> {
    return request(`/v1/account/sub-keys/${keyId}`, { method: "PATCH", body: data });
  },

  deleteSubKey(keyId: string): Promise<unknown> {
    return request(`/v1/account/sub-keys/${keyId}`, { method: "DELETE" });
  },

  reissueSubKey(keyId: string): Promise<ChildAPIKeyCreateResponse> {
    return request(`/v1/account/sub-keys/${keyId}/reissue`, { method: "POST" });
  },

  deleteAccount(): Promise<DeleteAccountResponse> {
    return request("/v1/account?confirm=DELETE", { method: "DELETE" });
  },
};
