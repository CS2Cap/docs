# Enhancement & Optimization Catalog — derived from `deep-research-report.md`

## Context

`deep-research-report.md` is a competitive analysis of five CS2 market-intelligence sites (Pricempire, SteamLedger, CS2Locker, Skinbase, CSGOSKINS.GG) with a recommended data-model backbone and a prioritized feature roadmap.

This catalog cross-references the report's recommendations against what cs2cap (frontend) and cs2c-api (FastAPI backend) already have. Its purpose is to surface enhancements and optimizations worth implementing to **prepare the codebase for future feature additions** — not to commit to building any specific feature now. Each item is a candidate; promotion to an implementation plan should happen one feature at a time.

**Current state (last refreshed 2026-06-04):**

- Frontend: faceted search, item detail (history, market distribution, similar items, variants, cases, asks, images), marketcap (treemap, sparkline, movers), auth (Steam/Google/Discord), inventory tracker, alerts, watchlist, API key/billing/usage UI, ~40 marketplace landing pages, and a data-driven browse navigation system — cached `/api/browse-nav` + hover-rail mega-menu with Containers/Gear/Stickers-&-More hubs and index/detail pages for crates, collections, stickers, slabs, charms, graffiti, music kits, patches, collectibles (rarity/text facet filtering, `BrowseUnavailable` graceful degradation). Deal scanner still absent on FE.
- Backend: 40+ provider adapters, prices/sales/buy_orders services, liquidity scoring, cross-provider price-outlier rejection, portfolio + transactions + CSV import, account/api-key/webhook services, OAuth (with `/v1/web/auth/{provider}/link` account linking) over an `oauth_accounts` identity table + `account_merge_service`, Steam inventory parser, skinscanner/deals_service, 67 alembic migrations (latest `0067`). Web search: snapshot scores on `/v1/web/search`, query understanding with alias dictionary + relevance sort, isolated rate-limit bucket. Alerts: `user_alerts`→`user_alert_events`→`user_alert_deliveries` split with window-based dedupe, plus multi-channel delivery (custom/Discord/Telegram/Google Sheets). Sales ingest is a background service feeding a cache-only `/sales` endpoint.

---

## Tier 1 — Item-page metadata depth (matches CSGOSKINS.GG)

> **Deprioritized (2026-05-30).** Reviewed for promotion and deferred — there is no concrete metadata consumer driving any of these today, and the catalog's serving layer is a flat, wholesale-cached `tradable_items` blob (built by `src/database` against the separate `CATALOG_DATABASE_URL`, *not* alembic). An open key/value (`item_attribute`) table is the opposite shape from that blob — EAV rows would just be pivoted back to flat columns at build time — so it earns its keep only once a real field needs adding that a JSONB column on the existing pipeline can't cheaply absorb. Note also that the original examples don't survive scrutiny: "supported phases" already ships (`phase` column + per-phase variant rows), "drop odds" is really Tier 1 #2 (`drop_source`), and "sticker compatibility" is already in Rejected. Treat this whole tier as lower priority than the data-credibility and user-facing work the team is actually shipping; promote an item only when a named consumer appears.

1. **`item_attribute` open key/value table** — Game-file vs provider-derived attributes separated by `source enum(gamefile, provider, derived)`. Lets us add new metadata (drop odds, supported phases, sticker compatibility) without schema churn.
2. **`drop_source` table** — Collection / case / capsule / update with `odds` numeric. Backs an unboxing-odds view, "drops from" reverse lookups, and case-EV calculators.
3. **`media_asset` per-variant table** — `media_kind enum(image, video, wear_preview, screenshot, inspect_preview)`. Today only `cdn.cs2c.app` images are wired; this enables wear-preview videos, inspect renders, and 3D viewers later. *(Partially addressed: flat image columns were added to the `tradable_items` blob + `/v1/items` and wired into the FE — see "Item-page image fields" under Recently shipped. The table itself is only justified by the non-image media kinds, which remain deferred.)*
4. **Hide canonical static metadata from per-asset instance data** — Asset-instance rows (float, paint seed, applied stickers) must be scoped to the owning inventory snapshot with retention lifecycles — a privacy obligation as soon as inventories are stored.

## Tier 2 — User-state hardening (unlocks portfolio/alert depth)

1. **`session` table with revocation + device fingerprint** — Today sessions live in Redis; backing them with an auditable durable table enables "sign out all devices", anomaly alerts, and forensic trails.
2. **`consent_record` + retention policies** — Versioned policy acceptance, prerequisite for GDPR-clean data export/delete (`account_export_service.py` exists; consent is the missing companion).
3. **`portfolio_position` distinct from `inventory_item`** — Inventory = "what I physically own"; portfolio = "cost basis, strategy tag, P/L". Currently `portfolio_service.py` and `transaction_service.py` straddle both. Splitting unlocks DCA tracking, strategy buckets, and tax reporting. *(Note: there is no persisted inventory table today — Steam inventory is parsed ephemerally — so the "they straddle both" framing is partly moot; the portfolio tables already carry cost-basis via `user_portfolio_transactions`.)*
4. **`inventory_import_job` idempotency keys** — Dedup imports by `(steam_id, window)` so re-syncs are safe; required before public scheduled refresh (e.g. SteamLedger's 15-min cadence).
5. **`transaction_ledger` kind-enum normalization** — Today CSV import + manual + buy/sell live in `transaction_service.py`; canonicalize into one ledger with `txn_kind enum(buy, sell, trade, manual_adjustment, import_basis)` so reports/analytics don't duplicate logic. *(Partial: `user_portfolio_transactions` is already a single ledger with a `type` `String(4)` field, but not the full 5-value enum — `import_basis` / `trade` / `manual_adjustment` aren't distinguished.)*

## Tier 3 — Alerts, watchlists, notifications (unlocks retention plays)

1. **Centralized notification scheduler/worker** — Separate from the SSE / push fanout for deal signals so alerting and live UI streams don't share back-pressure.

## Tier 4 — Trader tools

1. **`tradeup_contract` / `tradeup_contract_input` / `tradeup_outcome`** — Deterministic, hash-cached EV computation. No backend trade-up service exists today; adding one unlocks both the tool and shareable trade-up links.
2. **`deal_signal` table + SSE fanout for arbitrage** — `skinscanner/deals_service.py` exists; promote outputs to a typed table (variant, source/target marketplace, ROI, liquidity score, observed_profit) and stream via SSE. The report shows competitors treat this as their hook feature.
3. **`loadout` / `loadout_slot` + share tokens** — Differentiator from CS2Locker. Cheap to add once we have variant + price projections; high engagement potential.

## Tier 5 — Sponsored placements & affiliate attribution

1. **`campaign` / `placement` / `placement_event` tables with explicit editorial-vs-paid separation** — Prerequisite for monetizing marketplace partnerships without polluting "best price" ranking. Currently absent. Critical to design before adding monetization, not after.
2. **`is_paid` flag plumbed through ranking now, even before any sponsored deal exists** — Wire ranking code to read an `is_paid` column so paid placements physically cannot mix into organic results. Cheap insurance now; expensive retrofit later, with serious user-trust risk if any contamination ever ships. No `is_paid` plumbing exists in the codebase today (only ToS mentions "sponsored").

## Tier 6 — Cross-cutting frontend optimizations

1. **TanStack Query key registry audit** — `src/lib/api/hooks.ts` has a `queryKeys` registry; ensure every new fetcher uses it and that mutation-driven invalidations are co-located.
2. **Edge-cache policy parity** — The proxy `matchEdgeCachePolicy` and the server `revalidate` values per endpoint must move from two hand-synced lists into a single source-of-truth module imported by both.
3. **`compositions.ts` / `view-models.ts` typing tightness** — As new entities land (taxonomy, drop_source, media_asset), view-model adapters will balloon; promote per-entity adapters into a `view-models/` folder.
4. **Render-time currency boundary** — `Price.tsx` + `CurrencyContext.tsx` is correct; audit that no server-side render touches FX (otherwise cache fragmentation explodes).
5. **`(seo)` landing-page generation** — `landing-pages.ts` is the right shape; introduce per-marketplace `captured_at`-driven content blocks (fee, payout, last sync) so SEO pages stay fresh automatically.
6. **PostHog event taxonomy** — Codify event names for the new feature surfaces (deal-click, trade-up-run, loadout-share, alert-trigger) in a single TS const before usage scatters.
7. **Image pipeline for non-cdn assets** — `next.config.ts` allows only `cdn.cs2c.app`; planning provider screenshots, sticker overlays, or wear previews requires expanding the allowlist (or proxying through cdn.cs2c.app).
8. **Loading/error-state primitives** — As item-page sections multiply, a `<DeferredSection>` + skeleton primitive (started in `ItemDetailDeferredSections`) should become the standard wrapper to keep PPR friendly.

## Explicitly out of scope (per the report)

The report's 0/5 family — **direct checkout, escrow, seller profiles, bot custody, deposit/withdrawal** — is intentionally omitted. None of the competitive set ships it; introducing it drags in KYC/AML, payments, sanctions screening, and bot operations. Defer indefinitely.

## Recently shipped

These items shipped to `main` and are no longer candidates. Listed here briefly so the catalog's trace isn't lost; full detail is in the commit history.

- **Rate-limit isolation for `/v1/web/search`** *(was Tier 2 #5)* — Scrape-prone faceted search lives in its own `search:`-namespaced Redis bucket; limit is the stricter of `SEARCH_RATE_REQUESTS_PER_MINUTE` (default 60) and the user's tier rpm. Commit `7063be3af`.
- **Snapshot scores on `/v1/web/search`** *(was Tier 1 #1)* — `WebSearchItem` now carries `liquidity`, `listing_score`, `gap_score`, `volume_score`, `stability_score`, `external_score`; new `liquidity` sort key. (Skipped `total_volume_24h` — already exposed as `sales_1d`.) Commit `78dbac294`.
- **Query understanding for search** *(was Tier 2 #3)* — New `query_parser.py` with alias dictionary (`ak`→`AK-47`, `ft`→`Field-Tested`, …), tokenization, weighted-field scoring. Drops zero-score candidates, adds `relevance` sort key (auto-default when `q` is set). Trigram typo tolerance deferred. Commit `fbb39c45f` (+ follow-up `75e649009`).
- **Taxonomy DAG (containers MVP)** *(was Tier 1, search/catalog)* — `taxonomy_node` / `taxonomy_edge` / `item_taxonomy` tables (migration `0062`), `taxonomy_service.py` with descendant/ancestor walks + cycle guard, `seed_container_taxonomy.py` deriving container nodes from catalog `crates`, and a `/v1/web/search?container_slug=` filter. Two deliberate MVP simplifications vs the original plan: recursive CTE instead of a `taxonomy_closure` table (simpler, fine at current scale), and `item_taxonomy` has no `relation_kind` column yet (containers-only). Seeding is wired into the catalog rebuild behind an optional `seed_taxonomy` flag. Commits `86f624ff6` + follow-ups (`9ea9a3464`, `dea2190e5`). Not migrated: existing string-based collection/rarity/wear filters; tournament/player/team seeding. ~~FE container navigation~~ → now shipped (see "FE browse navigation" below).
- **Multi-channel alert delivery** *(was Tier 3 #2)* — `notification_endpoint`-style multi-platform delivery: a `platform` column on `user_webhook_endpoints` / `user_webhook_delivery_jobs` (enum: `custom`, `discord`, `telegram`, `google_sheets`) with native payload formatting (Discord embeds, Telegram `sendMessage` + `chat_id` validation, Google Sheets), platform snapshots in delivery jobs, and a unique active-platform-per-user index. Migrations `0066_add_alert_delivery_platforms` + `0067_open_managed_webhook_platforms` (the latter opens platforms to all tiers). cs2c-api commits `af89755cd5` + `5b0a62724f`. Replaces the prior browser/email-only surface. (The Tier 3 #1 `alert_rule` ↔ `alert_event` dedupe split it builds on was already in place — see "Alert rule/event/delivery split" below.)
- **FE browse navigation** *(was the open "FE container navigation" follow-up to the Taxonomy DAG)* — Cached `/api/browse-nav` route + `useBrowseNav` hook, desktop hover-rail mega-menu, Containers/Gear/Stickers-&-More hub pages, and index/detail pages for crates, collections, stickers, slabs, charms, graffiti, music kits, patches, and collectibles, with per-page rarity/text facet filtering. Resilient to snapshot gaps via `BrowseUnavailable`. cs2cap commits `f491bf8`…`56e5d43`, `8daeb15`, `398de54` (caching) and follow-ups.
- **Item-page image fields** *(partial — was Tier 1 #3 `media_asset`)* — Instead of a per-variant `media_asset` table, flat image columns were added to the existing wholesale-cached `tradable_items` blob and exposed through `/v1/items` (cs2c-api `e230b47ea5`, `d10e84dd27`); the frontend wires them into item-detail and cases sections (cs2cap `c765500`). This is the cheap flat-column path the 2026-05-30 Tier 1 deferral note anticipated. Still deferred: video / wear-preview / inspect-render media kinds, which are what would actually justify the `media_asset` table.

The next three predate this catalog — they were already built when it was written and were never candidates; recorded here so they aren't re-proposed.

- **Alert rule/event/delivery split** *(was Tier 3 #1)* — `user_alerts` (rule: `kind` / `threshold_value` / `is_enabled` / `last_triggered_at`), `user_alert_events` (event), and `user_alert_deliveries` (per-channel) are three distinct tables in `db_base.py`. The dedupe key is `UniqueConstraint("alert_id", "window_start_at")` (`uq_user_alert_event_window`), enforced in code — `account_domain_service.py` checks for an existing event on `(alert_id, window_start)` before insert, so simultaneous provider crossings collapse to one event. Per-channel delivery deduped via `UniqueConstraint("event_id", "channel")`.
- **Watchlist distinct from alerts** *(was Tier 3 #3)* — `user_watchlist_items` is a table distinct from `user_alerts`, so a user can favorite without alerting and vice versa. (No separate `watchlist` parent table — items hang directly off `user_id` — but the favorite-vs-alert separation the item was about already exists.)
- **OAuth identity separation** *(was Tier 2 #1 `auth_identity`)* — `oauth_accounts` is a table distinct from `api_users`, with `UniqueConstraint("provider", "provider_user_id")` and a `user_id` FK (multiple providers per user), wired into `oauth_service.py`. The account-merge it was meant to unlock already exists (`account_merge_service.py`, which reassigns/dedupes `oauth_accounts` rows on merge). The OAuth *linking endpoint* (`/v1/web/auth/{provider}/link`) landed later, on top of this existing model.

## Dropped

- **Sub-hour intraday price buckets (`price_bucket_5m`)** *(was Tier 1 #2)* — Decided during planning that hourly resolution is sufficient for the redesigned charts. Daily and hourly rollups already exist; if minute-scale resolution is ever needed within a recent window, reopen as a sibling of any future short-window chart work.

## Rejected ideas (and why)

These items appeared in earlier versions of this catalog and were dropped after evidence from the cs2c-api codebase or design conversations contradicted the premise. Recorded here so they aren't re-proposed in future sessions without new information.

### `provider_item_map` + `raw_quote` split *(was Tier 1)*

**Proposed:** Promote provider-scoped IDs and raw provider payloads to first-class Postgres tables so parser changes can be replayed and adapter drift is auditable.

**Rejected because:**

- Identity mapping is already solved by the Redis `all_ids` cache, which maps each canonical item name to every provider's ID for that item (`{"buff163_goods_id": ..., "csfloat_id": ..., "youpin_id": ..., ...}`). Provider IDs are stable in practice — schema changes that would invalidate them are <1% likely.
- Provider adapters in `src/app/providers/*` are **mechanical readers** of pre-aggregated endpoints (lowest price + quantity per item, from grouped endpoints — never raw order books except for Doppler phases, where they sort+limit to 1). There is no interpretive parser logic that could be buggy in ways requiring replay against raw payloads.
- Interpretive logic (lowball-bid classification, sales rollups, market_overview quorum, liquidity scoring) lives downstream in services operating on already-canonical durable tables, so any tuning of those heuristics can be replayed against existing data without needing provider payloads.

### Provider-quote provenance tags (`parse_status`, `source enum`) *(was Tier 1)*

**Proposed:** Add `source enum(api, scraped, manual)` and `parse_status` to every ingested offer row so trust scoring and incident response can distinguish data classes.

**Rejected because:**

- `parse_status` is moot for the same reason the `raw_quote` split is moot — adapters can't meaningfully fail in interpretive ways.
- `source enum` only earns its keep if manual entry is ever accepted or if scrape-based providers need to be down-weighted for trust scoring. Neither is planned. Worth revisiting only if either changes.

### `best_offer_projection` materialization *(was Tier 1)*

**Proposed:** A precomputed per-(variant, marketplace) cheapest-ask + qty table so the item page and search don't have to scan offer snapshots with GROUP BY on every request.

**Rejected because:** Already solved in Redis via the price-cache pipeline:

- `k_prices_bulk(provider)` — per-provider price blob (JSON of all current prices for that provider)
- `k_prices_items_hash(provider)` — per-item price documents (one hash field per item) — the moral equivalent of `best_offer_projection` rows, keyed by item
- `k_prices_index_all` / `k_prices_index_provider` / `k_prices_index_phase` — Redis sorted sets for paginated lookups

The GROUP BY scan the catalog described doesn't apply because providers return pre-aggregated lowest-ask per item from grouped endpoints (see the provider-adapter rejection above). The best-ask answer arrives ready to store, not computed.

### Minor-currency invariant + central FX table *(was Tier 1)*

**Proposed:** Audit all price columns to use bigint minor units (the report flagged floating-point currency as a bug magnet); centralize FX into a dated table and remove inline conversions.

**Rejected because:** Both halves are already done.

- **Money invariant:** `MoneyInt` / `MoneyIntNullable` Pydantic annotated types ([schemas.py:35-57](cs2c-api/src/app/schemas.py#L35-L57)) coerce every money input to integer minor units via `_money_to_minor_units` (Decimal × 100, ROUND_HALF_UP). `MONEY_MINOR_UNITS_DESCRIPTION` documents the convention. A `DecimalString` type exists for cases where string representation is preferred. No floating-point money in API contracts.
- **Central FX:** [fx.py](cs2c-api/src/app/fx.py) is a full implementation — CurrencyBeacon API integration, hourly refresh, Redis-backed rates (`fx:USD` key + per-pair keys), 5-minute in-memory cache layer, `get_rate_cached` / `convert_price` / `convert_price_float` / `ensure_rates_loaded` helpers, `FXRateUnavailableError` exception. Centralized, not inline.

### Snapshot pipeline replayability *(was Tier 11)*

**Proposed:** Ensure rollups can be rebuilt after parser bugs without losing history.

**Rejected because:** Already achieved. Downstream services operate on durable normalized tables (`prices.py`, `sales.py`, `buy_orders.py`, etc.) that survive parser changes by design. Any rollup can be recomputed from those tables directly — no separate replay infrastructure required.

### Facet count cache (`facet_cache`) *(was Tier 2)*

**Proposed:** Persist filter-combination → counts JSON behind a hash key with short TTL so the FE can show "12,341 results" instantly without re-aggregating.

**Rejected because:** The architecture sidesteps it entirely.

- `/v1/items` is designed to be cached basically 24/7 in Redis (`get_extended_catalog()` / `set_extended_catalog()`), with `limit` optional so a single response can return the whole filtered catalog.
- `/v1/items/metadata` returns `total_items = len(items)` plus **static** filter-value tuples from `items_filter_values.py` (hardcoded enums of possible item types, rarities, wears, etc.) — not data-driven counts.
- There is no server-side facet-count aggregation anywhere to cache. The frontend derives per-facet counts client-side from the cached items array. The catalog *is* the cache; the client does the math.

### `sticker_slot` per-asset table *(was Tier 3)*

**Proposed:** Asset-instance level slot/wear/offset/rotation table to enable "find skins with these stickers applied" search and sticker-craft showcasing.

**Rejected because:**

- The product doesn't surface "search user-owned skins by applied sticker set" and has no plans to. No use case to back the storage cost.
- Valve removed the slot concept as a meaningful attribute. Users can now apply an arbitrary number of stickers, anywhere on the weapon, at any rotation. A "slot_no" column has nothing canonical to store; an "offset/rotation" column would store data with no planned read path. The CSGOSKINS.GG-style sticker model assumes the old fixed-slot world and no longer maps to CS2's mechanics.

### Marketplace metadata layer (review/fee/payment/payout/status tables) *(was Tier 6)*

**Proposed:** Add `marketplace_review_summary`, `marketplace_fee_schedule`, `marketplace_payment_method`, `marketplace_status_snapshot` as DB tables with `captured_at` provenance to back a marketplace directory filter UI, "fees updated 2 days ago" displays, and per-provider health badges on item pages.

**Rejected because:**

- **Most of the data is already in `ProviderDictionary`** ([db_base.py:54](cs2c-api/src/app/db_base.py#L54)): identity, country, currency, market_type, base_url, seller-side fees (`sell_fee`, `insta_sell_fee`, `trading_spread_fee`), current status, capability flags (`has_buy_orders`, `has_recent_sales`).
- Historical health rollups live in `ProviderHealthDailySnapshot`.
- The genuinely-missing pieces (third-party review ratings, payment/payout methods, buyer/deposit/withdraw fee breakdown, per-attribute `captured_at`) are only worth adding if users specifically request the surfaces they would power — which isn't the case today. Out of scope until requested.

### Admin tooling for marketplace fee/review edits *(was Tier 11)*

**Proposed:** Build an `admin/marketplaces.py` surface for editing provider fees and reviews.

**Rejected because:** Provider admin tooling already exists at `cs2c-api/src/app/api/admin/providers.py` (20.5K) covering the fields that `ProviderDictionary` actually has. The review-editing surface was a dependency of the now-rejected Tier 6 marketplace metadata layer and has no purpose without it.

### Float-checker browser extension surface *(was Tier 6)*

**Proposed:** Ship a browser extension (à la SteamLedger) that overlays float, phase, fade, and paint-seed info on the official Steam Market while users browse.

**Rejected because:** Valve has been shipping updates that natively acknowledge float values and paint seeds. Third-party "show me the float" extensions are heading toward redundancy — Valve will likely surface this data in the official UI within a foreseeable window, so investing in the extension now risks building something that loses its differentiator before it pays off.

### API plans + usage rollups (`api_plan` + `api_usage_bucket`) *(was Tier 7)*

**Proposed:** Lift quota/feature definitions out of code into a table so plans are admin-editable; track usage in coarse buckets for billing/abuse detection.

**Rejected because:** Done.

- `APITier` table ([db_base.py:~1145](cs2c-api/src/app/db_base.py#L1145)) holds `code`, `display_name`, `quota_requests_per_month`, `rate_requests_per_minute`, `limit_param_cap`, `features_json` (per-endpoint entitlements), `limits_json`, `support_level`, billing IDs — admin-editable.
- `APITierBillingOffer` covers checkout offers per (tier, provider, billing_interval).
- `UserApiKey.quota_requests_per_month_override` allows per-key overrides.
- `APIUsageLog` table + `account_usage_repository.py` (`get_monthly_request_count_for_api_key`, `get_daily_usage`, `get_top_endpoints`) handle the usage rollups.
- Hot-path quota enforcement via Redis monthly counters; reconciled against `APIUsageLog`.
- `tier_features.py` codifies `ACTIVE_TIER_ENDPOINTS` + tier-feature sanitization for entitlements.

### Async bulk export endpoints (`api_export_job`) *(was Tier 7)*

**Proposed:** Add async export jobs for catalog snapshots and history (à la Pricempire/CSGOSKINS.GG bulk API positioning).

**Rejected because:** The async job machinery already exists for account data exports — `account_export_service.py` provides `create_export_job`, `get_export_job`, `download_export_payload`, `serialize_export_job`; `/account/export` returns `HTTP 202` + job id; `/account/export/{job_id}` polls; `AccountExportJobResponse` schema. Extending this pattern to catalog/price bulk exports for API customers would be a small wiring task — worth doing *only if* an external API customer specifically asks for it.

### Webhook delivery per-attempt audit (`webhook_delivery`) *(was Tier 7)*

**Proposed:** Persist per-attempt status with backoff schedule so customers can self-serve debug.

**Rejected because:** Already a full three-table model in `db_base.py`:

- `UserWebhookEndpoint` (line 720) — registered endpoints
- `UserWebhookDeliveryJob` (line 760) — queued/retry/failed/delivered state with `attempt_count`, `next_attempt_at`
- `UserWebhookDeliveryAttempt` (line 833) — per-attempt audit rows

Worker (`account_webhook_delivery_worker.py`) implements exponential backoff (`_backoff_seconds`), claim-with-lock (`_claim_jobs`), per-attempt logging (`_record_attempt`), and final state transitions (`_mark_success`, `_mark_retry_or_failed`) capped by `settings.ACCOUNT_WEBHOOK_MAX_ATTEMPTS`.

### Endpoint cache keys scoped by normalized query params *(was Tier 7)*

**Proposed:** Codify a `normalize → hash → CDN key` helper so cache entries don't fragment when callers send the same params in different orders.

**Rejected because:** Largely moot in practice.

- Backend uses Redis with deterministic per-shape keys (`k_prices_bulk`, `k_prices_items_hash`, `k_prices_index_*`), already stable.
- FE proxy ([route.ts](cs2cap/src/app/api/cs2c/[...path]/route.ts)) caches at Vercel's edge by URL; the FE constructs URLs through the centralized `queryKeys` registry in `src/lib/api/hooks.ts`, so callers don't send arbitrary orderings.
- External API customers hit `api.cs2c.app` directly (FastAPI), bypassing the FE proxy. Cache fragmentation across param orderings is a theoretical risk but not a real problem given current call patterns.

### Per-provider freshness SLOs *(was Tier 9)*

**Proposed:** Track ingestion lag per adapter and surface in admin + status page, gating alerts on stale data.

**Rejected because:** Substantially done.

- `ProviderHealth` schema ([schemas.py:384](cs2c-api/src/app/schemas.py#L384)) exposes provider health and aggregate diagnostics.
- `freshness_sec` is a first-class field on multiple API response schemas (lines 1582, 1860, 2176) — callers already know how stale the data is.
- `ProviderHealthDailySnapshot` table stores historical health.
- [`api/admin/providers.py:577+`](cs2c-api/src/app/api/admin/providers.py#L577) computes degraded/healthy rollups with `stale_provider_count`, identifying providers that haven't produced a successful job inside their expected freshness window.
- `sales_cache.py` uses a `k_sales_history_stale` Redis key for stale-content tracking.

The only piece that may or may not be wired is "alert delivery is suppressed when triggered by stale data". Worth checking when the alert pipeline is touched, but not its own catalog item.

### Late-arriving data handling *(was Tier 9)*

**Proposed:** Allow bounded intraday recomputation of `price_bucket_5m` / `1d` when out-of-order data lands.

**Rejected because:** Conditionally moot.

- Daily and hourly rollups already exist (`daily_price_archive_service`, `daily_history_snapshot_service`) and naturally absorb late data when rerun against the source tables (which survive the parser layer untouched — see "Snapshot pipeline replayability" rejection above).
- 5-min buckets don't exist today (see Dropped above).
- If 5m buckets are ever added, this item should be reopened as a sibling.

### Per-IP / per-user / per-API-key rate limits split *(was Tier 9)*

**Proposed:** Ensure scrape-prone endpoints have their own rate-limit buckets per-IP, per-user, and per-API-key.

**Rejected because:** Done. [ratelimit.py:176-219](cs2c-api/src/app/ratelimit.py#L176) already implements all three key dimensions:

- `get_rate_limit_key` returns `user:{user_id}` for authenticated, `ip:{client_ip}` for anonymous
- `get_child_rate_limit_key` returns `api_key:{api_key_id}` for API-key callers
- `get_ip_key` for explicit IP-only limiting
- `tier_rate_limit(request)` reads `user.rate_requests_per_minute` from tier config, so each tier has its own per-minute limit
- Counters are separate per dimension; one heavy customer doesn't share quota with anonymous IPs or session users

---

## Critical files referenced

- `cs2c-api/src/app/db_base.py` (Tier 1 — new `item_attribute` / `drop_source` / `media_asset` models)
- `cs2c-api/src/app/services/inventory/steam_inventory_service.py` (Tier 2)
- `cs2c-api/src/app/services/portfolio/{portfolio,transaction,history,csv_import}_service.py` (Tier 2)
- `cs2c-api/src/app/services/auth/oauth_service.py` (Tier 2)
- `cs2c-api/src/app/services/skinscanner/deals_service.py` (Tier 4)
- `cs2c-api/alembic/versions/` (67 migrations; new ones for each Tier 1–5 entity)
- `cs2cap/src/lib/api/{server,client,hooks,types,compositions,view-models}.ts` (Tier 6)
- `cs2cap/src/app/api/cs2c/[...path]/route.ts` (Tier 6 — edge-cache policy parity)
- `cs2cap/src/lib/seo/landing-pages.ts` (Tier 6 — landing-page generation)
- `cs2cap/next.config.ts` (Tier 6 — image pipeline allowlist)

## How to use this list

This catalog is intentionally broad. **Do not implement straight through it.** For each enhancement that gets prioritized:

1. Open a focused planning session for *that single item*.
2. Confirm current implementation state (the inventory above is best-effort; verify before changing schemas).
3. Decide migration safety (the platform has 67 alembic migrations and live data — additive-then-backfill-then-cutover is the safe pattern).
4. Define success criteria (CLAUDE.md §4): a test or measurable outcome per change.

The strongest practical recommendation from the report applies here too: **prioritize data credibility over feature theatrics**. Tiers 1–2 (item-page metadata depth + user-state hardening) are the next big content and retention investments; Tiers 4–5 (trader tools + sponsored) are visible but cheap only after the foundation is solid.
