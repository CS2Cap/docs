# Per-integration alert delivery with progressive tier access

**Date:** 2026-05-30
**Status:** Approved design — ready for implementation planning
**Scope:** Backend (`cs2c-api`) + frontend (`cs2cap`)

## Problem

The alerts dashboard webhook UI is decorative: [`cs2cap/src/app/(auth)/alerts/page.tsx`](../../../src/app/(auth)/alerts/page.tsx) renders static "Delivery Integrations" badges (Discord / Telegram / Google Sheets / Custom webhook) plus a docs link. There is no UI to actually configure a destination.

Underneath, the backend delivery engine is already complete (`account_webhook_service.py`): it builds Discord embeds, Telegram messages, Google Sheets posts, and signed custom POSTs, with delivery jobs, retries, and attempt logs. The `platform` column already exists on `user_webhook_endpoints` / `user_webhook_delivery_jobs` (migration `0066_add_alert_delivery_platforms`).

Two things block users from using it:

1. **One coarse gate.** Every `/v1/account/webhooks` route calls `_require_webhook_access()` (`account.py:494`), which 403s anyone lacking the `webhook_access` feature flag (Pro + Quant only). It gates *all* platforms equally — so a Free user can't even add a Discord destination.
2. **Zero budget for lower tiers.** `max_webhook_destinations` is `0` for Free/Starter, `6` for Pro/Quant.

## Goals

- Managed channels (Discord, Telegram, Google Sheets) available to **all tiers including Free**.
- Custom webhook URL remains gated to **Pro + Quant** (the existing `webhook_access` flag — unchanged tier set).
- **Model A — one active destination per platform.** Per-platform uniqueness replaces the numeric destination cap.
- A real dashboard: list / create / edit / enable-disable / delete / rotate-secret per integration, with the custom integration shown as upgrade-locked for Free/Starter.

Non-goals: alert-rule caps (already progressive per tier), new delivery platforms, multiple destinations of the same platform, billing changes.

## Decisions (locked)

| Question | Decision |
|---|---|
| Who gets managed channels | All tiers incl. Free |
| Who gets custom webhook URL | Pro + Quant (existing `webhook_access` flag) |
| Cap model | A — one active destination per platform; uniqueness replaces numeric cap |
| Entitlement shape | Allowed-**platform set** per tier, not a numeric count |
| Spec scope | Backend + frontend in one spec |

---

## Backend design (`cs2c-api`)

### 1. Entitlement model: two concepts, not one

Introduce an explicit **allowed-platform set** per tier, derived in the tier-features layer:

- All tiers: `{discord, telegram, google_sheets}` (managed channels).
- Tiers with `webhook_access` (Pro, Quant): additionally `{custom}`.

Add helpers in `src/app/tier_features.py` / `account_domain_service.py`:

- `tier_allowed_webhook_platforms(tier) -> frozenset[str]` — managed set always; add `custom` when `webhook_access` flag is set.
- Keep `tier_has_webhooks(tier)` meaning "can use **custom** webhooks" (unchanged semantics, used by the alert delivery prereq below).

### 2. Route access: split the gate

In `src/app/api/account.py`:

- Replace the blanket `_require_webhook_access()` on **list / get-deliveries / get-delivery / update / delete / rotate-secret** with a softer check: these are available to any authenticated account (they operate on the user's own destinations; an empty list is a valid response). Rationale: once managed channels are universal, every tier can own destinations, so management routes must not 403 by tier.
- **Create** (`POST /v1/account/webhooks`) and **Update-that-changes-platform** (`PATCH`) must validate the requested `platform` against `tier_allowed_webhook_platforms`. If `platform == "custom"` and the tier lacks `webhook_access` → `403 ACCOUNT_WEBHOOKS_NOT_AVAILABLE` (reuse existing code). If platform is otherwise unsupported → existing `400 BAD_REQUEST` from `normalize_webhook_platform`.

### 3. Cap → per-platform uniqueness

In `account_webhook_service.py`:

- `create_webhook_endpoint`: replace the `existing >= max_destinations` check with a uniqueness check — reject if the user already has an **active** destination of the same `platform`. New error: `WebhookPlatformExistsError` → mapped to `409 ACCOUNT_WEBHOOK_PLATFORM_EXISTS` (new code in `error_codes.py`).
  - "Active" uses the existing `is_active` column so a disabled destination doesn't block re-adding. (Open nuance: decide whether uniqueness is over *all* destinations or only active ones — default to **active only**, matching how delivery fan-out already filters on `is_active`.)
- `update_webhook_endpoint`: when toggling `is_active` true or changing `platform`, enforce the same uniqueness so you can't end up with two active destinations of one platform.
- Drop `max_destinations` plumbing from `create_account_webhook` / `_require_webhook_access` (the function currently returns the numeric limit). `WebhookLimitReachedError` / `ACCOUNT_WEBHOOK_LIMIT_REACHED` become dead once uniqueness replaces it — leave the error code defined but unused, or remove if no other caller (verify before deleting).

### 4. Migration: open the gate + retune limits

New alembic migration `0067_*` (down_revision `0066`):

- For `free` and `starter` tiers: ensure they can own managed destinations. Since access is now driven by the allowed-platform set (managed = always on) rather than `max_webhook_destinations`, the numeric column is no longer the access lever. Set `max_webhook_destinations` to the count of allowed platforms for clarity (3 for free/starter, 4 for pro/quant) **or** deprecate the field — see Data-model note. Do **not** flip `webhook_access` on for free/starter (custom stays Pro+Quant).
- Idempotent upsert over `api_tiers.limits_json`, mirroring the pattern in `0058_expand_webhook_and_alert_limits.py`. Include a `downgrade()` restoring prior values (free/starter → 0; pro/quant → 6).

**Data-model note:** `max_webhook_destinations` surfaces in `AccountLimits` (API response) and the admin surface. Under Model A it's redundant with the platform set. Recommendation: keep the field populated (= allowed-platform count) for backward compatibility, but treat the **allowed-platform set** as the source of truth for enforcement. The API response should additionally expose the allowed platforms (see §5).

### 5. API contract additions

- `AccountCapabilities` / `AccountLimits` (`schemas.py`): add `allowed_webhook_platforms: list[str]` (or expose under capabilities) so the frontend can render which integrations are available vs upgrade-locked without hardcoding tier logic. `can_manage_webhooks` keeps meaning "can use custom webhooks".
- `WebhookCreateRequest.platform` already exists. No new business endpoints — reuse the full existing CRUD surface on `_webhooks` (`/v1/account/webhooks`, `/{id}`, `/{id}/rotate-secret`, `/deliveries`, `/deliveries/{id}`).
- **Web-surface aliases (required).** The browser client only calls `/v1/web/account/*` (cookie/JWT auth via the `_register_web_proxy` helper in `main.py`); webhooks currently have **no** `/v1/web/...` alias, so the frontend cannot reach them today. Register `_register_web_proxy` entries mirroring the alert aliases (`main.py:786-825`) for each webhook route:
  - `GET /v1/web/account/webhooks` → `_webhooks` `/webhooks`
  - `POST /v1/web/account/webhooks` → `/webhooks`
  - `PATCH /v1/web/account/webhooks/{webhook_id}` → `/webhooks/{webhook_id}`
  - `DELETE /v1/web/account/webhooks/{webhook_id}` → `/webhooks/{webhook_id}`
  - `POST /v1/web/account/webhooks/{webhook_id}/rotate-secret` → `/webhooks/{webhook_id}/rotate-secret`
  - (deliveries aliases optional — only if the dashboard surfaces delivery history; defer otherwise.)
  - Confirm the `_register_web_proxy` path-allowlist check (`main.py:1011`, `path.startswith("/v1/web/account")`) already covers these.
- Regenerate `openapi.json` (committed in both `cs2c-api` and synced into `cs2cap`).

### 6. Alert delivery prereq (no functional change, verify)

`_ensure_enabled_alert_prereqs` and the fan-out loop already gate webhook delivery on `tier_has_webhooks(tier)` (`account_domain_service.py:779` and `:1284`). Since managed channels are now available to all tiers, this check must change: webhook delivery readiness should be "has an active destination" regardless of tier — `tier_has_webhooks` should no longer suppress managed-channel delivery for Free/Starter. Update both call sites to drop the `tier_has_webhooks` precondition on *delivery* (it still governs *custom* creation). This is the one behavioral correctness item to get right; otherwise Free users could create a Discord destination but never receive deliveries.

### 7. Tests (`cs2c-api`)

- Unit: `tier_allowed_webhook_platforms` for each tier code.
- Unit: uniqueness enforcement in create/update (same active platform → 409; disabled + re-add → ok).
- Integration (`tests/integration/test_account_endpoints.py`): Free account can create Discord, cannot create custom (403); Pro can create custom; second active Discord → 409.
- Integration: alert with only a Discord destination on a Free account fans out a webhook delivery job.
- Migration test (`tests/unit/test_tier_migrations.py`): upgrade/downgrade round-trip of `0067`.

---

## Frontend design (`cs2cap`)

### 8. API layer

- `src/lib/api/types.ts`: add `WebhookEndpointSummary`, `WebhookEndpointsResponse`, `WebhookCreateRequest`, `WebhookUpdateRequest`, `WebhookSecretResponse` (mirror backend schemas). Add `allowed_webhook_platforms` to the account capabilities/limits types.
- `src/lib/api/client.ts` (`webApi`): add `getWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook`, `rotateWebhookSecret` mirroring the existing `getAlerts/createAlert/...` methods against the new **`/v1/web/account/webhooks`** aliases (§5), not the raw `/v1/account/webhooks` routes.
- `src/lib/api/hooks.ts`: add `useWebhooks`, `useCreateWebhookMutation`, `useUpdateWebhookMutation`, `useDeleteWebhookMutation`, `useRotateWebhookSecretMutation`, plus a `queryKeys.webhooks` entry; invalidate on mutation like the alert hooks do.

### 9. Dashboard: real integration management

Replace the decorative "Delivery Integrations" card in `alerts/page.tsx` with a functional component. Extract a `src/components/alerts/DeliveryIntegrations.tsx` (keep `alerts/page.tsx` focused — it's already large).

Behavior:

- Render one row per platform (Discord, Telegram, Google Sheets, Custom webhook), driven by `allowed_webhook_platforms` from the account.
- For an allowed platform with no destination: "Add" → form (label + URL; Telegram requires `chat_id` in URL — surface the existing backend validation message). On create, show the one-time signing secret (custom platform) in a copyable, dismissable callout.
- For a configured platform: show label, URL (masked), `secret_last4`, active toggle (`is_active` via `useUpdateWebhookMutation`), last success/failure, and a menu with Rotate Secret / Delete.
- For a platform **not** in the allowed set (custom on Free/Starter): show it locked with an upgrade CTA to the pricing page.
- PostHog events mirroring existing alert events: `webhook_created`, `webhook_deleted`, `webhook_toggled`, `webhook_secret_rotated`, `webhook_upgrade_clicked`.

### 10. Frontend verification

No test runner exists in `cs2cap`. Verify via `pnpm lint` + `pnpm build` and manual dashboard walkthrough (cookie-auth a Free and a Pro session against the API per the local-auth notes).

---

## Risks & open nuances

1. **Uniqueness scope** (all vs active destinations). Default: active-only. Confirm during implementation.
2. **`max_webhook_destinations` deprecation.** Keep populated for back-compat; enforcement moves to platform set. Avoid removing the public field in this pass.
3. **Delivery prereq change (§6)** is the highest-correctness item — without it, Free managed channels silently never deliver. Cover with an integration test.
4. **OpenAPI sync** between `cs2c-api` and `cs2cap` must land in the same change set or the frontend types drift.
5. **Web aliases are a hard dependency** for the frontend (§5). Without the `/v1/web/account/webhooks/*` proxies the dashboard has nothing to call. Land them with the backend, before frontend §8.

## Rollout order

1. Backend §1–§3, §6 (entitlement + uniqueness + delivery prereq) with tests.
2. Migration §4.
3. API contract §5 (incl. web-surface aliases) + openapi regen.
4. Frontend §8–§9.
5. Verify §7 + §10.
