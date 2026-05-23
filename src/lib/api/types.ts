export type PhaseName =
  | "Phase 1"
  | "Phase 2"
  | "Phase 3"
  | "Phase 4"
  | "Sapphire"
  | "Ruby"
  | "Black Pearl"
  | "Emerald";

export type AllProviders =
  | "avanmarket"
  | "bitskins"
  | "buff163"
  | "buffmarket"
  | "c5"
  | "csdeals"
  | "csfloat"
  | "csgo500"
  | "csgoempire"
  | "csmoney_m"
  | "csmoney_t"
  | "cstrade"
  | "dmarket"
  | "ecosteam"
  | "haloskins"
  | "itradegg"
  | "lisskins"
  | "lootfarm"
  | "mannco"
  | "marketcsgo"
  | "pirateswap"
  | "rapidskins"
  | "shadowpay"
  | "skinbaron"
  | "skinflow"
  | "skinout"
  | "skinplace"
  | "skinport"
  | "skinscom"
  | "skinsmonkey"
  | "skinswap"
  | "skinvault"
  | "steam"
  | "swapgg"
  | "tradeit"
  | "waxpeer"
  | "whitemarket"
  | "youpin";

export type BuyOrderProvider =
  | "buff163"
  | "buffmarket"
  | "c5"
  | "csfloat"
  | "dmarket"
  | "ecosteam"
  | "marketcsgo"
  | "steam"
  | "waxpeer"
  | "whitemarket"
  | "youpin";

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
  next_cursor?: string;
}

export interface ValidationErrorItem {
  type: string;
  loc: Array<string | number>;
  msg: string;
  input: unknown;
  ctx?: Record<string, unknown>;
}

export interface ErrorResponse {
  code: string;
  detail: string | ValidationErrorItem[];
}

export interface ItemOut {
  item_id?: number;
  market_hash_name: string;
  phase?: string;
  item_type?: string;
  item_subtype?: string;
  weapon_type?: string;
  base_name?: string;
  skin_name?: string;
  wear_name?: string;
  def_index?: string;
  paint_index?: number;
  collection?: string;
  crates?: string[];
  rarity_name?: string;
  rarity_color?: string;
  style_name?: string;
  is_stattrak?: boolean;
  is_souvenir?: boolean;
  min_float?: number;
  max_float?: number;
  image_url?: string;
  supply?: number;
}

export interface ItemsCatalogSummary {
  total_items: number;
}

export interface ItemsFilterMetadata {
  item_type: string[];
  item_subtype: string[];
  weapon_type: string[];
  wear_name: string[];
  phase: string[];
  collection: string[];
  rarity_name: string[];
  rarity_color: string[];
  style_name: string[];
}

export interface ItemsMetadataResponse {
  catalog: ItemsCatalogSummary;
  filters: ItemsFilterMetadata;
}

export interface ItemsResponse {
  items: ItemOut[];
  pagination: PaginationMeta;
}

export interface ItemIdLookupRequest {
  market_hash_names: string[];
  phases?: (string | null)[] | null;
}

export interface ItemIdLookupResult {
  market_hash_name: string;
  phase?: string | null;
  item_id: number | null;
}

export interface ItemIdLookupResponse {
  items: ItemIdLookupResult[];
  found_count: number;
  missing_count: number;
}

export interface MarketItem {
  provider: string;
  item_id: number;
  market_hash_name: string;
  phase?: string;
  lowest_ask: number;
  quantity: number;
  link?: string;
  url?: string;
  timestamp?: string;
  last_updated?: string;
}

export interface PricesMeta {
  currency: string;
  filters: {
    item_id?: number;
    market_hash_name?: string;
    phase?: string;
    requested_providers?: string[];
  };
  returned_providers: string[];
}

export interface PricesPaginatedResponse {
  meta: PricesMeta;
  items: MarketItem[];
  pagination: PaginationMeta;
}

export interface BatchPriceQuote {
  provider: string;
  lowest_ask: number;
  quantity: number;
  timestamp?: string;
  last_updated?: string;
}

export interface BatchPriceItem {
  item_id: number;
  market_hash_name: string;
  phase?: string;
  quotes: BatchPriceQuote[];
}

export interface BatchPricesResponse {
  meta: {
    currency: string;
    requested_item_count: number;
    found_item_count: number;
    providers_queried: string[];
    generated_at: string;
  };
  items: BatchPriceItem[];
  items_not_found: number[];
}

export interface PriceSnapshot {
  item_id: number;
  market_hash_name: string;
  phase?: string;
  provider: string;
  time: string;
  price: number;
  currency: string;
  quantity: number;
}

export interface PriceSnapshotPage {
  meta: {
    currency: string;
    filters: {
      item_id?: number;
      market_hash_name?: string;
      phase?: string;
      provider?: string;
      start?: string;
      end?: string;
    };
    result_count: number;
  };
  items: PriceSnapshot[];
  pagination: PaginationMeta;
}

export interface CandleProviders {
  h: string;
  l: string;
}

export interface PriceCandleItem {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  q?: number;
  providers: CandleProviders;
}

export interface PriceCandlesPage {
  meta: {
    item_id: number;
    market_hash_name: string;
    phase?: string;
    provider?: string;
    currency: string;
    interval: string;
    start: string;
    end: string;
  };
  data: PriceCandleItem[];
}

export interface BuyOrderItem {
  item_id: number;
  market_hash_name: string;
  phase?: string;
  provider: string;
  highest_bid: number;
  num_bids: number;
  timestamp?: string;
  last_updated?: string;
}

export interface BidsResponse {
  meta: {
    currency: string;
    filters: {
      item_id?: number;
      market_hash_name?: string;
      phase?: string;
      requested_providers?: string[];
    };
    providers_queried: string[];
  };
  items: BuyOrderItem[];
  pagination: PaginationMeta;
}

export interface SaleRecordDetail {
  date: string;
  provider: string;
  price: number;
  currency: string;
  item_id: number;
  market_hash_name: string;
  phase?: string;
  float?: number;
  paint_seed?: number;
}

export interface SalesHistoryResponse {
  meta: {
    currency: string;
    filters: {
      item_id?: number;
      market_hash_name?: string;
      phase?: string;
      requested_providers?: string[];
      limit: number;
    };
    providers_queried: string[];
    result_count: number;
  };
  items: SaleRecordDetail[];
  cache_status: Record<string, unknown>;
}

export interface ProviderFees {
  sell_fee?: number;
  insta_sell_fee?: number;
  trading_spread_fee?: number;
}

export interface ProviderFeatures {
  has_buy_orders?: boolean;
  has_recent_sales?: boolean;
}

export interface ProviderHealth {
  status: string;
  last_checked_at?: string;
  total_offers?: number;
  unique_items?: number;
  market_coverage?: number;
  total_value?: number;
  total_value_usd?: number;
}

export interface ProviderInfo {
  name?: string;
  key: string;
  logo?: string;
  code?: string;
  market_type?: string;
  default_currency?: string;
  fees: ProviderFees;
  features: ProviderFeatures;
  health: ProviderHealth;
}

export type ProvidersResponse = ProviderInfo[] | Record<string, ProviderInfo>;

export type MarketTimeframe = "1h" | "24h" | "7d" | "30d";

export interface MarketMeta {
  generated_at: string;
  data_source: "cache" | "live" | "mixed";
  freshness_sec: number;
  window?: {
    timeframe: MarketTimeframe;
  } | null;
}

export interface MarketItemAnalyticsSummary {
  provider_count: number;
  total_volume_24h: number;
  best_ask_usd?: string | null;
  best_bid_usd?: string | null;
  avg_spread_pct?: number | null;
  liquidity?: number | null;
  liquidity_score?: number | null;
  supply?: number | null;
  rank?: number | null;
  marketcap?: string | null;
  price_rate_24h?: number | null;
  price_diff_24h?: string | null;
  price_rate_7d?: number | null;
  price_diff_7d?: string | null;
  price_rate_30d?: number | null;
  price_diff_30d?: string | null;
  sales_1d?: number;
  sales_7d?: number;
  sales_30d?: number;
  steam_sales_7d?: number | null;
  steam_sales_30d?: number | null;
  listing_score?: number | null;
  gap_score?: number | null;
  volume_score?: number | null;
  doppler_bonus?: boolean | null;
  price_anomaly?: boolean | null;
  high_tier_override?: boolean | null;
  liquidity_last_updated?: string | null;
}

export interface MarketItemAnalyticsProvider {
  provider: string;
  ask_usd?: string;
  bid_usd?: string;
  spread_usd?: string;
  spread_pct?: number;
  ask_depth?: number;
  bid_depth?: number;
  volume_24h?: number;
  volume_7d?: number;
  total_value_24h_usd?: string;
  price_rate_24h?: number | null;
  price_diff_24h?: string | null;
  price_rate_7d?: number | null;
  price_diff_7d?: string | null;
  price_rate_30d?: number | null;
  price_diff_30d?: string | null;
  bid_anomaly?: boolean;
}

export interface MarketItemAnalyticsResponse {
  meta: MarketMeta;
  data: {
    item_id: number;
    market_hash_name: string;
    phase?: string;
    summary: MarketItemAnalyticsSummary;
    providers: MarketItemAnalyticsProvider[];
    coverage: Record<string, unknown>;
  };
}

export interface MarketItemsSnapshotItem {
  item_id: number;
  market_hash_name: string;
  phase?: string | null;
  summary: MarketItemAnalyticsSummary;
}

export interface MarketItemsSnapshotResponse {
  meta: MarketMeta;
  data: {
    items: MarketItemsSnapshotItem[];
  };
}

export type WebSearchSort =
  | "rank"
  | "name"
  | "best_ask_usd"
  | "best_bid_usd"
  | "spread_pct"
  | "price_rate_24h"
  | "price_rate_7d"
  | "sales_1d"
  | "provider_count"
  | "marketcap";

export type WebSearchDirection = "asc" | "desc";

export interface WebSearchAppliedFilters {
  item_type: string[];
  weapon_type: string[];
  rarity_name: string[];
  wear_name: string[];
  phase: string[];
  collection: string[];
  is_stattrak?: boolean | null;
  is_souvenir?: boolean | null;
  min_price_usd?: string | null;
  max_price_usd?: string | null;
}

export interface WebSearchMeta {
  generated_at: string;
  data_source: "cache" | "live" | string;
  freshness_sec: number;
  query?: string | null;
  filters: WebSearchAppliedFilters;
  sort: WebSearchSort;
  direction: WebSearchDirection;
}

export interface WebSearchItem {
  item_id: number;
  market_hash_name: string;
  phase?: string | null;
  image_url?: string | null;
  item_type?: string | null;
  item_subtype?: string | null;
  weapon_type?: string | null;
  base_name?: string | null;
  skin_name?: string | null;
  wear_name?: string | null;
  rarity_name?: string | null;
  collection?: string | null;
  is_stattrak?: boolean | null;
  is_souvenir?: boolean | null;
  best_ask_usd?: string | null;
  best_bid_usd?: string | null;
  avg_spread_pct?: number | null;
  price_rate_24h?: number | null;
  price_rate_7d?: number | null;
  sales_1d: number;
  sales_7d: number;
  provider_count: number;
  marketcap?: string | null;
  rank?: number | null;
  is_watchlisted: boolean;
}

export interface WebSearchFacetBucket {
  value: string;
  count: number;
}

export interface WebSearchFacets {
  item_type: WebSearchFacetBucket[];
  weapon_type: WebSearchFacetBucket[];
  rarity_name: WebSearchFacetBucket[];
  wear_name: WebSearchFacetBucket[];
  phase: WebSearchFacetBucket[];
  collection: WebSearchFacetBucket[];
}

export interface WebSearchPriceHistogramBucket {
  min_price_usd: string;
  max_price_usd?: string | null;
  count: number;
}

export interface WebSearchResponse {
  meta: WebSearchMeta;
  items: WebSearchItem[];
  facets: WebSearchFacets;
  price_histogram: WebSearchPriceHistogramBucket[];
  pagination: PaginationMeta;
}

export interface TierInfo {
  tier_id: string;
  code: string;
  display_name: string;
  description?: string;
  monthly_price_cents: number;
  currency?: string;
  quota_requests_per_month: number;
  rate_requests_per_minute: number;
  limit_param_cap: number;
  support_level: string;
  support_sla_hours?: number;
  can_access_analytics: boolean;
  can_access_webhooks: boolean;
  max_providers?: number;
}

export interface UsageStats {
  requests_this_month: number;
  requests_limit: number;
  requests_remaining: number;
  percentage_used: number;
  reset_date: string;
}

export interface APIKeyInfo {
  id: string;
  key_prefix: string;
  name?: string;
  root_key_id?: string;
  is_root_key?: boolean;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  quota_requests_per_month_override?: number;
  rate_requests_per_minute_override?: number;
  effective_quota_requests_per_month?: number;
  effective_rate_requests_per_minute?: number;
}

export interface ActiveKeySummary {
  has_active_key: boolean;
  active_child_key_count?: number;
  key?: APIKeyInfo | null;
}

export interface AccountLinkedProvider {
  provider: string;
  provider_user_id: string;
  created_at?: string;
  last_login_at?: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface AccountCapabilities {
  can_manage_watchlist: boolean;
  can_manage_alerts: boolean;
  can_manage_webhooks: boolean;
  can_export_account_data: boolean;
  can_open_billing_portal: boolean;
}

export interface AccountLimits {
  max_watchlist_items: number;
  max_active_alerts: number;
  max_webhook_destinations: number;
  max_child_api_keys?: number;
  max_portfolios: number;
  max_portfolio_items: number;
}

export interface AccountUpgradeOption {
  tier_id: string;
  code: string;
  display_name: string;
  monthly_price_cents: number;
  currency: string;
}

export interface AccountInfo {
  user_id: string;
  email: string | null;
  display_name?: string;
  email_verified_at?: string;
  tier_info: TierInfo;
  usage: UsageStats;
  active_key_summary: ActiveKeySummary;
  linked_providers: AccountLinkedProvider[];
  capabilities: AccountCapabilities;
  limits: AccountLimits;
  required_actions: string[];
  upgrade_options: AccountUpgradeOption[];
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface AccountPreferences {
  preferred_currency: string;
  alert_emails_enabled: boolean;
  product_update_emails_enabled: boolean;
  billing_reminder_emails_enabled: boolean;
}

export interface ViewerResponse {
  authenticated: boolean;
  user: AccountInfo | null;
  preferences: AccountPreferences | null;
}

export interface APIKeyGetResponse {
  key: APIKeyInfo;
}

export interface APIKeyReissueResponse {
  key: string;
  key_prefix: string;
  id: string;
  created_at: string;
  message?: string;
}

export interface WatchlistItem {
  id: string;
  item_id: number;
  market_hash_name: string;
  phase?: string;
  created_at: string;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
  pagination: PaginationMeta;
}

export interface AlertItemSummary {
  item_id: number;
  market_hash_name: string;
  phase?: string;
}

export interface AlertDeliverySummary {
  channel: string;
  status: string;
  delivery_id?: string;
  endpoint_id?: string;
  endpoint_label?: string;
  attempt_count?: number;
  last_http_status?: number;
  next_attempt_at?: string;
  error?: string;
  created_at: string;
}

export interface AlertDefinition {
  id: string;
  kind: string;
  threshold_value: string;
  threshold_currency?: string;
  is_enabled: boolean;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
  item: AlertItemSummary;
}

export interface AlertListResponse {
  alerts: AlertDefinition[];
  pagination: PaginationMeta;
}

export interface AlertEventSummary {
  id: string;
  alert_id: string;
  kind: string;
  item: AlertItemSummary;
  triggered_value: string;
  triggered_currency?: string;
  reason?: string;
  created_at: string;
  deliveries: AlertDeliverySummary[];
}

export interface AlertEventsResponse {
  events: AlertEventSummary[];
  pagination: PaginationMeta;
}

export interface AlertCreateRequest {
  item_id: number;
  kind: string;
  threshold_value: string;
  threshold_currency?: string;
  is_enabled?: boolean;
}

export interface AlertUpdateRequest {
  threshold_value?: string;
  threshold_currency?: string;
  is_enabled?: boolean;
}

export interface LinkedProviderResponse {
  provider: string;
  provider_user_id: string;
  created_at?: string;
  last_login_at?: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface PlanInfo {
  code: string;
  display_name: string;
  description: string;
  monthly_price_cents: number;
  currency: string;
  quota_requests_per_month: number;
  rate_requests_per_minute: number;
  limit_param_cap: number;
  support_level: string;
  support_sla_hours: number | null;
  can_access_analytics: boolean;
  can_access_webhooks: boolean;
  max_providers: number | null;
  billing_price_monthly_id: string | null;
  billing_price_quarterly_id: string | null;
}

export interface PlansResponse {
  plans: PlanInfo[];
}

export interface PendingPlanChange {
  target_tier_code: string;
  target_display_name: string;
  effective_at: string;
}

export interface SubscriptionStatus {
  tier_code: string;
  has_subscription: boolean;
  stripe_customer_id: string | null;
  pending_change?: PendingPlanChange | null;
}

export interface CheckoutRequest {
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutResponse {
  checkout_url: string;
}

export interface CryptoCheckoutRequest {
  tier_code: string;
  billing_interval: "monthly" | "quarterly";
  success_url: string;
  cancel_url: string;
}

export interface CryptoCheckoutResponse {
  checkout_url: string;
  provider: string;
  tier_code: string;
  billing_interval: string;
}

export interface PortalResponse {
  portal_url: string;
}

export interface BillingOverviewCurrentPlan {
  code: string;
  display_name: string;
  monthly_price_cents: number;
  currency: string;
}

export interface BillingOverviewPaymentMethod {
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
}

export interface BillingOverviewInvoice {
  id: string;
  amount_cents: number;
  currency: string;
  status?: string | null;
  created_at?: string | null;
  hosted_invoice_url?: string | null;
  invoice_pdf_url?: string | null;
}

export interface BillingOverviewResponse {
  current_plan: BillingOverviewCurrentPlan;
  has_subscription: boolean;
  renews_at?: string | null;
  cancels_at?: string | null;
  portal_available: boolean;
  default_payment_method?: BillingOverviewPaymentMethod | null;
  invoices: BillingOverviewInvoice[];
  pending_change?: PendingPlanChange | null;
}

export interface UsageDailyPoint {
  date: string;
  request_count: number;
  error_count: number;
}

export interface UsageEndpointPoint {
  endpoint: string;
  request_count: number;
  share_pct: number;
  error_rate_pct: number;
}

export interface UsageProjection {
  avg_requests_per_day_7d: number;
  estimated_days_to_limit: number | null;
  upgrade_recommended: boolean;
}

export interface UsageDashboardResponse {
  requests_this_month: number;
  requests_limit: number;
  requests_remaining: number;
  percentage_used: number;
  reset_date: string;
  generated_at: string;
  tracked_requests_this_month: number;
  ingestion_gap_estimate?: number;
  trend_window_days: number;
  daily_usage: UsageDailyPoint[];
  top_endpoints: UsageEndpointPoint[];
  projection: UsageProjection;
}

export interface WebSessionLogoutResponse {
  ok: boolean;
}

// Sub-keys
export interface ChildAPIKeyCreateRequest {
  name: string;
  quota_requests_per_month_override?: number | null;
}

export interface ChildAPIKeyCreateResponse {
  key: string;
  key_info: APIKeyInfo;
  message?: string;
}

export interface ChildAPIKeyDetailResponse {
  key: APIKeyInfo;
  requests_this_month: number;
}

export interface ChildAPIKeyListResponse {
  keys: ChildAPIKeyDetailResponse[];
  pagination: PaginationMeta;
}

export interface ChildAPIKeyUpdateRequest {
  name?: string | null;
  quota_requests_per_month_override?: number | null;
}

// Email operations
export interface VerifyEmailSendResponse {
  ok: boolean;
}

export interface VerifyEmailConfirmRequest {
  token: string;
}

export interface VerifyEmailConfirmResponse {
  ok: boolean;
  key?: string | null;
}

export interface EmailSetRequest {
  email: string;
}

export interface EmailChangeRequest {
  new_email: string;
}

// Plan changes
export interface ChangePlanRequest {
  price_id: string;
}

export interface ChangePlanResponse {
  outcome: string;
  pending_change?: PendingPlanChange | null;
}

export interface PendingChangeCancelResponse {
  ok: boolean;
}

// Account deletion
export interface DeleteAccountResponse {
  ok: boolean;
}

// ============================================================================
// Steam inventory + stateless portfolio valuation (public Inventory Value tool)
// ============================================================================

// Loose shapes — we do not strictly use individual fields on these.
export interface InventorySticker {
  name?: string;
  slot?: number;
  wear?: number | null;
  image_url?: string | null;
}

export interface InventoryCharm {
  name?: string;
  pattern?: number | null;
  image_url?: string | null;
}

export interface SteamInventoryItem {
  assetid: string;
  market_hash_name: string;
  phase: string | null;
  name: string;
  icon_url: string;
  tradable: boolean;
  marketable: boolean;
  quantity: number;
  float_value: number | null;
  paint_seed: number | null;
  inspect_link: string | null;
  name_tag: string | null;
  stickers: InventorySticker[] | null;
  charms: InventoryCharm[] | null;
}

export interface SteamInventoryLookupResponse {
  data: SteamInventoryItem[];
  total_count: number;
}

// POST /v1/portfolio/value upstream shapes.
export interface PortfolioValueRequest {
  items: Array<{ item_id: number; quantity: number }>;
  providers?: AllProviders[];
  currency?: string;
}

export interface PortfolioValueProviderBreakdown {
  provider: string;
  lowest_ask: number;
  quantity: number;
  timestamp?: string;
  last_updated?: string;
}

export interface PortfolioValueLineItem {
  item_id: number;
  market_hash_name: string;
  phase: string | null;
  quantity: number;
  best_ask: number | null;
  best_bid?: number | null;
  item_value: number;
  providers: PortfolioValueProviderBreakdown[];
}

export interface PortfolioValueResponse {
  meta: {
    currency: string;
    generated_at: string;
    providers_queried: string[];
  };
  data: {
    line_items: PortfolioValueLineItem[];
    total_value: number;
    items_valued: number;
    items_not_found: number[];
  };
}

// App-route request/response (what the browser actually talks to).
export interface InventoryValueRequest {
  steam_id: string;
}

export type InventoryValueUnmatchedReason =
  | "no_catalog_match"
  | "valuation_missing";

export interface InventoryValueResolvedItem {
  item_id: number;
  market_hash_name: string;
  phase: string | null;
  icon_url: string;
  tradable: boolean;
  marketable: boolean;
  quantity: number;
  // Money fields are integer minor units (e.g. cents for USD).
  best_ask: number | null;
  best_bid: number | null;
  item_value: number;
  providers: PortfolioValueProviderBreakdown[];
}

export interface InventoryValueUnmatchedItem {
  assetid: string;
  market_hash_name: string;
  phase: string | null;
  icon_url: string;
  quantity: number;
  reason: InventoryValueUnmatchedReason;
}

export interface InventoryValueStats {
  total_value: number; // minor units
  currency: string;
  items_priced: number; // distinct catalog items with a non-null best_ask
  items_unpriced: number; // resolved-but-no-price + unmatched
  units_total: number;
  providers_queried_count: number;
}

export interface InventoryValueMeta {
  generated_at: string;
  steam_inventory_total: number;
  resolved_distinct_item_count: number;
  cache_hit: boolean;
}

export interface InventoryValueToolResponse {
  meta: InventoryValueMeta;
  stats: InventoryValueStats;
  items: InventoryValueResolvedItem[];
  unmatched_items: InventoryValueUnmatchedItem[];
}

export type MarketIndexGroupBy = "item_type" | "weapon_type";

export interface MarketIndexGroup {
  group: string;
  marketcap_usd: string;
  item_count: number;
  included_count: number;
  excluded_count: number;
}

export interface MarketIndexesResponse {
  meta: {
    generated_at: string;
    data_source: "cache" | "live" | "mixed";
    freshness_sec: number;
    window: { timeframe: MarketTimeframe };
    group_by: MarketIndexGroupBy;
  };
  data: {
    total_marketcap_usd: string;
    groups: MarketIndexGroup[];
  };
}
