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
  PlansResponse,
  UsageDashboardResponse,
  ViewerResponse,
  WatchlistResponse,
} from "./types";

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
  billingPlans: ["billing-plans"] as const,
  billingOverview: ["billing-overview"] as const,
  usage: ["usage"] as const,
  inventory: (steamId: string | null) => ["inventory", steamId] as const,
};

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
