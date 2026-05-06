<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the CS2Cap Next.js App Router application. The following changes were made:

- **`instrumentation-client.ts`** (new): Initializes PostHog client-side using the Next.js 15.3+ `instrumentation-client.ts` pattern, with reverse proxy routing through `/ingest`, session replay, and error tracking enabled.
- **`next.config.ts`**: Added reverse proxy rewrites for PostHog ingestion (`/ingest/*` → `us.i.posthog.com`) and `skipTrailingSlashRedirect: true`.
- **`src/lib/posthog-server.ts`** (new): Singleton server-side PostHog client (`posthog-node`) for use in Route Handlers and Server Actions.
- **`src/components/PostHogIdentify.tsx`** (new): Client component that calls `posthog.identify()` with the user's `user_id`, email, display name, and tier whenever a session is present.
- **`src/app/(auth)/layout.tsx`**: Renders `<PostHogIdentify />` in every authenticated route, ensuring users are identified as soon as they enter the dashboard.
- **`src/components/LoginProviderButtons.tsx`** (new): Client component replacing the server-rendered OAuth button list, adding `login_provider_clicked` tracking on each provider click.
- **`src/app/(public)/login/page.tsx`**: Replaced inline provider button loop with `<LoginProviderButtons>`.
- **`.env.local`**: Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`.

| Event | Description | File |
|-------|-------------|------|
| `login_provider_clicked` | User clicks a login provider button (Steam, Google, Discord) | `src/components/LoginProviderButtons.tsx` |
| `item_added_to_watchlist` | User successfully adds an item to their watchlist | `src/components/WatchItemButton.tsx` |
| `alert_created` | User creates a new price alert for an item | `src/app/(auth)/alerts/page.tsx` |
| `alert_deleted` | User deletes a price alert | `src/app/(auth)/alerts/page.tsx` |
| `alert_toggled` | User enables or disables a price alert | `src/app/(auth)/alerts/page.tsx` |
| `checkout_initiated` | User initiates a checkout flow (card or crypto) | `src/app/(auth)/account/billing/page.tsx` |
| `plan_changed` | User switches from one subscription plan to another | `src/app/(auth)/account/billing/page.tsx` |
| `api_key_created` | User creates their first API key | `src/app/(auth)/account/api-keys/page.tsx` |
| `api_key_regenerated` | User regenerates their existing root API key | `src/app/(auth)/account/api-keys/page.tsx` |
| `sub_key_created` | User creates a new sub-key (child API key) | `src/app/(auth)/account/api-keys/page.tsx` |
| `inventory_valued` | User successfully values a Steam inventory | `src/app/(public)/inventory-value/InventoryValueTool.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1551275)
- [Login-to-Checkout Conversion Funnel](/insights/IYXKxgJs) — measures how many users who click login end up initiating a checkout
- [Login-to-API Key Activation Funnel](/insights/3gNoDP7e) — measures activation rate (login → first API key)
- [User Engagement Over Time](/insights/8p53jvP6) — daily trend of watchlist adds, alert creations, and inventory lookups
- [Revenue Signals Over Time](/insights/lLLoCHTl) — checkout initiations and plan changes over time
- [API Key Activity](/insights/D97LKru4) — API key lifecycle: created, regenerated, sub-keys

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
