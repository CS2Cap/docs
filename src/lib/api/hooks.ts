"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webApi } from "./client";
import type {
  AccountInfo,
  AccountPreferences,
  AlertCreateRequest,
  AlertEventsResponse,
  AlertListResponse,
  AlertUpdateRequest,
  APIKeyGetResponse,
  BillingOverviewResponse,
  ChildAPIKeyListResponse,
  InventoryValueToolResponse,
  ItemOut,
  ItemSearchResponse,
  ItemSuggestion,
  PlansResponse,
  SessionListResponse,
  UsageDashboardResponse,
  ViewerResponse,
  WatchlistResponse,
  WebhookCreateRequest,
  WebhookEndpointsResponse,
  WebhookUpdateRequest,
} from "./types";
import type { BrowseNavData } from "@/lib/browse/nav-types";

export const queryKeys = {
  viewer: ["viewer"] as const,
  session: ["viewer"] as const,
  account: ["viewer"] as const,
  preferences: ["viewer"] as const,
  apiKey: ["api-key"] as const,
  subKeys: (params: Record<string, unknown>) => ["sub-keys", params] as const,
  watchlist: (params: Record<string, unknown>) => ["watchlist", params] as const,
  alerts: (params: Record<string, unknown>) => ["alerts", params] as const,
  alertEvents: (params: Record<string, unknown>) => ["alert-events", params] as const,
  webhooks: ["webhooks"] as const,
  billingPlans: ["billing-plans"] as const,
  billingOverview: ["billing-overview"] as const,
  usage: ["usage"] as const,
  inventory: (steamId: string | null) => ["inventory", steamId] as const,
  itemSearch: (query: string) => ["item-search", query] as const,
  item: (itemId: number | null) => ["item", itemId] as const,
  browseNav: ["browse-nav"] as const,
  sessions: ["sessions"] as const,
};

export function useBrowseNav(enabled: boolean) {
  return useQuery<BrowseNavData>({
    queryKey: queryKeys.browseNav,
    queryFn: async () => {
      const res = await fetch("/api/browse-nav");
      if (!res.ok) throw new Error("Failed to load browse nav");
      return (await res.json()) as BrowseNavData;
    },
    enabled,
    staleTime: 60 * 60_000, // 1h — catalog changes at most daily
  });
}

export function useViewer() {
  return useQuery<ViewerResponse>({
    queryKey: queryKeys.viewer,
    queryFn: () => webApi.getViewer(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useAccount() {
  return useQuery<ViewerResponse, Error, AccountInfo | null>({
    queryKey: queryKeys.account,
    queryFn: () => webApi.getViewer(),
    select: (viewer) => viewer.user,
    retry: false,
    staleTime: 60_000,
  });
}

export function useSession() {
  return useQuery<ViewerResponse, Error, AccountInfo | null>({
    queryKey: queryKeys.session,
    queryFn: () => webApi.getViewer(),
    select: (viewer) => viewer.user,
    retry: false,
    staleTime: 60_000,
  });
}

export function useAccountPreferences() {
  return useQuery<ViewerResponse, Error, AccountPreferences | null>({
    queryKey: queryKeys.preferences,
    queryFn: () => webApi.getViewer(),
    select: (viewer) => viewer.preferences,
    retry: false,
    staleTime: 60_000,
  });
}

export function useAPIKey() {
  return useQuery<APIKeyGetResponse>({
    queryKey: queryKeys.apiKey,
    queryFn: () => webApi.getAPIKey(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useSubKeys(params: { limit?: number; offset?: number } = {}) {
  return useQuery<ChildAPIKeyListResponse>({
    queryKey: queryKeys.subKeys(params),
    queryFn: () => webApi.listSubKeys(params),
    retry: false,
    staleTime: 60_000,
  });
}

export function useWatchlist(params: { limit?: number; offset?: number; search?: string } = {}) {
  return useQuery<WatchlistResponse>({
    queryKey: queryKeys.watchlist(params),
    queryFn: () => webApi.getWatchlist(params),
    retry: false,
    staleTime: 30_000,
  });
}

export function useAlerts(params: { limit?: number; offset?: number; search?: string } = {}) {
  return useQuery<AlertListResponse>({
    queryKey: queryKeys.alerts(params),
    queryFn: () => webApi.getAlerts(params),
    retry: false,
    staleTime: 30_000,
  });
}

export function useAlertEvents(params: { limit?: number; offset?: number } = {}) {
  return useQuery<AlertEventsResponse>({
    queryKey: queryKeys.alertEvents(params),
    queryFn: () => webApi.getAlertEvents(params),
    retry: false,
    // Kept shorter than the rest: alert fires arrive passively, so lingering
    // stale data here can hide a just-triggered alert the user is waiting on.
    staleTime: 15_000,
  });
}

// Typeahead search runs against the prewarmed catalog snapshot via our own
// /api/item-search route (in-process, ranked there) — not the upstream
// /v1/web/search endpoint, which rescans and rescores the whole catalog per
// request and takes multiple seconds.
async function fetchItemSuggestions(query: string): Promise<ItemSuggestion[]> {
  const response = await fetch(`/api/item-search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`Item search failed: ${response.status}`);
  }
  const data = (await response.json()) as ItemSearchResponse;
  return data.items;
}

export function useItemSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.itemSearch(trimmed),
    queryFn: () => fetchItemSuggestions(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useItem(itemId: number | null) {
  return useQuery<ItemOut>({
    queryKey: queryKeys.item(itemId),
    queryFn: () => webApi.getItem(itemId as number),
    enabled: itemId != null && Number.isFinite(itemId),
    staleTime: 5 * 60_000,
  });
}

export function useWebhooks() {
  return useQuery<WebhookEndpointsResponse>({
    queryKey: queryKeys.webhooks,
    queryFn: () => webApi.getWebhooks(),
    retry: false,
    staleTime: 30_000,
  });
}

export function useBillingPlans() {
  return useQuery<PlansResponse>({
    queryKey: queryKeys.billingPlans,
    queryFn: () => webApi.getBillingPlans(),
    retry: false,
    staleTime: 300_000,
  });
}

export function useBillingOverview() {
  return useQuery<BillingOverviewResponse>({
    queryKey: queryKeys.billingOverview,
    queryFn: () => webApi.getBillingOverview(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useSteamInventory(steamId: string | null) {
  return useQuery<InventoryValueToolResponse>({
    queryKey: queryKeys.inventory(steamId),
    queryFn: () => webApi.valueSteamInventory({ steam_id: steamId as string }),
    enabled: steamId !== null,
    retry: false,
    staleTime: 60_000,
  });
}

export function useAccountUsageStats() {
  return useQuery<UsageDashboardResponse>({
    queryKey: queryKeys.usage,
    queryFn: () => webApi.getAccountUsageStats(),
    retry: false,
    staleTime: 30_000,
  });
}

export function useAddToWatchlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => webApi.addToWatchlist(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
      queryClient.invalidateQueries({ queryKey: queryKeys.account });
    },
  });
}

export function useRemoveFromWatchlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => webApi.removeFromWatchlist(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
      queryClient.invalidateQueries({ queryKey: queryKeys.account });
    },
  });
}

export function useCreateAlertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AlertCreateRequest) => webApi.createAlert(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-events"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
      queryClient.invalidateQueries({ queryKey: queryKeys.account });
    },
  });
}

export function useUpdateAlertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, data }: { alertId: string; data: AlertUpdateRequest }) =>
      webApi.updateAlert(alertId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-events"] });
    },
  });
}

export function useDeleteAlertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => webApi.deleteAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-events"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
      queryClient.invalidateQueries({ queryKey: queryKeys.account });
    },
  });
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WebhookCreateRequest) => webApi.createWebhook(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
      queryClient.invalidateQueries({ queryKey: queryKeys.viewer });
      queryClient.invalidateQueries({ queryKey: queryKeys.account });
    },
  });
}

export function useUpdateWebhookMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ webhookId, data }: { webhookId: string; data: WebhookUpdateRequest }) =>
      webApi.updateWebhook(webhookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
  });
}

export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (webhookId: string) => webApi.deleteWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
      queryClient.invalidateQueries({ queryKey: queryKeys.viewer });
      queryClient.invalidateQueries({ queryKey: queryKeys.account });
    },
  });
}

export function useRotateWebhookSecretMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (webhookId: string) => webApi.rotateWebhookSecret(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => webApi.listSessions(),
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => webApi.revokeSession(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions });
      const previous = queryClient.getQueryData<SessionListResponse>(queryKeys.sessions);
      if (previous) {
        queryClient.setQueryData<SessionListResponse>(queryKeys.sessions, {
          sessions: previous.sessions.filter((s) => s.id !== id),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.sessions, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

export function useRevokeOtherSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => webApi.revokeOtherSessions(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions });
      const previous = queryClient.getQueryData<SessionListResponse>(queryKeys.sessions);
      if (previous) {
        queryClient.setQueryData<SessionListResponse>(queryKeys.sessions, {
          sessions: previous.sessions.filter((s) => s.current),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.sessions, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}
