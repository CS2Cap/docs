/**
 * Centralized PostHog event names.
 *
 * Import these constants instead of writing inline string literals at
 * `posthog.capture(...)` call sites, so event names stay consistent and
 * greppable across the app.
 *
 * IMPORTANT: the string VALUES are the analytics contract — renaming an
 * existing value would fork its historical data in PostHog. Add new keys
 * freely, but do not change an existing value once it is in use.
 */
export const ANALYTICS_EVENTS = {
  pricingClicked: "pricing_clicked",
  docsClicked: "docs_clicked",
  signupClicked: "signup_clicked",
  loginProviderClicked: "login_provider_clicked",
  providerLinkStarted: "provider_link_started",
  itemAddedToWatchlist: "item_added_to_watchlist",
  alertCreated: "alert_created",
  alertToggled: "alert_toggled",
  alertDeleted: "alert_deleted",
  webhookCreated: "webhook_created",
  webhookToggled: "webhook_toggled",
  webhookDeleted: "webhook_deleted",
  webhookSecretRotated: "webhook_secret_rotated",
  webhookUpgradeClicked: "webhook_upgrade_clicked",
  apiKeyCreated: "api_key_created",
  apiKeyRegenerated: "api_key_regenerated",
  subKeyCreated: "sub_key_created",
  checkoutInitiated: "checkout_initiated",
  planChanged: "plan_changed",
  inventoryValued: "inventory_valued",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
