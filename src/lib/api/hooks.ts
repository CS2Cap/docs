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
  PlansResponse,
  UsageDashboardResponse,
  WatchlistResponse,
} from "./types";

export const queryKeys = {
  session: ["session"] as const,
  account: ["account"] as const,
  preferences: ["account-preferences"] as const,
  apiKey: ["api-key"] as const,
  subKeys: (params: Record<string, unknown>) => ["sub-keys", params] as const,
  watchlist: (params: Record<string, unknown>) => ["watchlist", params] as const,
  alerts: (params: Record<string, unknown>) => ["alerts", params] as const,
  alertEvents: (params: Record<string, unknown>) => ["alert-events", params] as const,
  billingPlans: ["billing-plans"] as const,
  billingOverview: ["billing-overview"] as const,
  usage: ["usage"] as const,
};

export function useSession() {
  return useQuery<AccountInfo>({
    queryKey: queryKeys.session,
    queryFn: () => webApi.getSession(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useAccount() {
  return useQuery<AccountInfo>({
    queryKey: queryKeys.account,
    queryFn: () => webApi.getAccount(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useAccountPreferences() {
  return useQuery<AccountPreferences>({
    queryKey: queryKeys.preferences,
    queryFn: () => webApi.getAccountPreferences(),
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
