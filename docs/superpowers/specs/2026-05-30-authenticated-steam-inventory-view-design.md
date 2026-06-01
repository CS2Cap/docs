# Steam Inventory View + OAuth Account Linking — Design

**Date:** 2026-05-30
**Status:** Approved for planning
**Scope:** Combined effort across two repos — `cs2c-api` (backend OAuth linking)
and `cs2cap` (frontend linking UI + inventory view).

## Context

An audit of shipped features found the largest investment-to-surface mismatch in
the codebase: the backend exposes a complete 14-endpoint portfolio/inventory
system (`/v1/portfolio/*`, `/v1/inventory/steam*`), but a logged-in user can
reach **none** of it. The only inventory surface on the frontend is the
*stateless, anonymous* public valuation tool at `/inventory-value`.

The first user-facing slice is an authenticated, live "what I own" Steam
inventory view. During design review, two dependencies surfaced that pull this
into a combined, two-repo effort:

1. **Currency.** Inventory values must render in the user's selected currency
   (account preference, default USD), not a fixed base currency.
2. **Account linking.** The inventory view needs the user's linked Steam ID.
   Steam-native users have one; Google/Discord-native users do not and must be
   able to **connect** Steam. Today that is impossible end-to-end: the service
   layer supports linking (`link_oauth_account`) but **no HTTP endpoint wires
   it**, and the OAuth callbacks use `find_or_create_oauth_user` without
   consulting the current session (so logging in with a second provider creates
   a *separate* account rather than linking). This is roadmap **Tier 2 #1**
   (multi-provider / `auth_identity`), now promoted by a real driver.

### Decisions made during brainstorming

- **Slice:** authenticated Steam inventory view (the "what I own" half), not the
  full portfolio MVP.
- **Persistence:** live view now (no saved snapshots), structured so a
  persistence source can slot in later behind the same hook.
- **Inventory data path:** Approach A — reuse the existing valuation pipeline
  (`webApi.valueSteamInventory` → `/api/inventory-value`), fed the session's
  linked Steam ID.
- **Fetch trigger:** auto-fetch on page load for Steam-linked users + a Refresh
  button.
- **Currency:** render via `useCurrency().formatPrice()` (account-pref currency,
  default USD).
- **Sequencing:** one combined effort (linking + inventory together).
- **Linking flow:** proxy-authenticated `link/start` endpoint that binds the
  user into OAuth state; callback branches to `link_oauth_account`.

## Relevant existing pieces

### Backend (`cs2c-api`)

- `store_oauth_state(provider, *, ttl_sec, extra: dict[str,str] | None)` and
  `verify_oauth_state(state, *, expected_provider) -> payload`
  ([oauth_service.py:72,92](../../../../cs2c-api/src/app/services/auth/oauth_service.py#L72))
  — state already supports an arbitrary `extra` payload and returns it on verify.
- `link_oauth_account(db, *, user_id, provider, provider_user_id, …)`
  ([oauth_service.py:207](../../../../cs2c-api/src/app/services/auth/oauth_service.py#L207))
  — links a provider to an existing user; raises `ProviderAlreadyLinkedError`
  when the provider account belongs to a different user. **Currently unwired.**
- OAuth routes ([api/auth.py](../../../../cs2c-api/src/app/api/auth.py)):
  `GET /{provider}/login`, `GET /{provider}/callback` (→ `find_or_create`),
  `POST /token`, `GET /providers` (list), `DELETE /providers/{provider}`
  (unlink). The authenticated dependency is `require_api_key` →
  `AuthenticatedUser` (resolves web sessions too).
- `build_steam_login_url(...)`, Discord/Google authorize-URL construction, and
  `_frontend_redirect(code|error)` already exist.

### Frontend (`cs2cap`)

- `webApi.valueSteamInventory({ steam_id })`
  ([client.ts:164](../../../src/lib/api/client.ts#L164)) → `/api/inventory-value`
  (merges prices server-side) → valued `InventoryValueToolResponse`
  ([types.ts:1091](../../../src/lib/api/types.ts#L1091)); money fields are
  integer **minor units** (USD).
- `InventoryStatsStrip` (takes pre-formatted `{label,value,hint}[]`) and
  `InventoryItemsTable` (resolved items; sortable; currently formats in the
  response currency, does not use `CurrencyContext`).
- `useCurrency()` / `CurrencyContext`
  ([CurrencyContext.tsx](../../../src/lib/CurrencyContext.tsx)) — reads
  `useAccountPreferences().preferred_currency` (default USD) and `formatPrice()`
  converts **USD-cents → preferred currency** via FX.
- Session `AccountInfo.linked_providers[]` — each `{ provider, provider_user_id }`;
  Steam's `provider_user_id` is the Steam ID.
- account/settings ([settings/page.tsx](../../../src/app/(auth)/account/settings/page.tsx))
  lists linked providers and supports **unlink only** (`webApi.unlinkProvider`).
  No link-new-provider affordance exists.
- `(auth)/layout.tsx` redirects unauthenticated users to `/login`. `AuthLayout`
  nav is a `NAV_ITEMS` array. `queryKeys` registry + hooks live in `hooks.ts`.
- `getOAuthLoginUrl(provider)` ([client.ts:126](../../../src/lib/api/client.ts#L126)).

## Architecture

### Part 1 — Backend: session-aware OAuth linking (`cs2c-api`)

**Problem:** OAuth callbacks are top-level browser navigations to the API domain,
which cannot read the session cookie set on the frontend domain. So the link
target cannot be authenticated at callback time.

**Solution:** bind the user into the OAuth state at initiation, through the
authenticated proxy.

- **New endpoint** `POST /v1/web/auth/{provider}/link`, dependency
  `require_api_key` (reached through the FE `/api/cs2c` proxy, so the session
  resolves). It calls
  `store_oauth_state(provider, ttl_sec=…, extra={"link_user_id": user.user_id})`
  and returns `{ "redirect_url": <provider login URL with state> }`. Reuses
  `build_steam_login_url` / the Discord/Google authorize URL builders.
- **Modify the three callbacks** (`steam`, `discord`, `google`): after resolving
  `provider_user_id`, read `link_user_id = payload.get("link_user_id")`.
  - If present → `await link_oauth_account(db, user_id=UUID(link_user_id),
    provider=…, provider_user_id=…, display_name=…, avatar_url=…)`, then
    `_frontend_redirect` to `/account/settings?linked={provider}`. On
    `ProviderAlreadyLinkedError` → redirect to
    `/account/settings?link_error=already_linked`. Do **not** issue an auth code
    (the user stays in their current session).
  - If absent → unchanged `find_or_create_oauth_user` + `issue_auth_code` flow.
- Emit a metric label for link vs login outcomes (mirror `OAUTH_LOGIN_TOTAL`).

New surface: one endpoint + a branch in each callback. No new tables — the
`OAuthAccount` model and the link/unlink services already exist.

### Part 2 — Frontend: account-settings link UI (`cs2cap`)

- `webApi.startProviderLink(provider)` → POST `/v1/web/auth/{provider}/link`
  through the proxy → `window.location.assign(redirect_url)`.
- account/settings: for each provider **not** in `linked_providers`, render a
  "Connect {Provider}" button that calls `startProviderLink`. Keep the existing
  unlink UI.
- On settings mount, read `?linked=` / `?link_error=` query params → toast
  success/failure and refetch the session (so the newly linked provider appears).

### Part 3 — Frontend: authenticated Steam inventory view (`cs2cap`)

- **Route:** `src/app/(auth)/inventory/page.tsx` (inherits the session-gate).
- **Nav:** add `{ label: "Inventory", href: "/inventory", icon: Package }` to
  `AuthLayout`'s `NAV_ITEMS`, after Watchlist/Alerts.
- **Dashboard:** add an "Inventory" card linking to `/inventory` (no valuation on
  dashboard load).
- **Data hook:** `useSteamInventory(steamId: string | null)` in `hooks.ts`
  wrapping `webApi.valueSteamInventory`, with a new `queryKeys.inventory(steamId)`
  entry; `enabled` only when `steamId` is non-null. The page derives the steam_id
  from `linked_providers.find(p => p.provider === "steam")?.provider_user_id`.
  This hook is the seam for future persisted snapshots.
- **States:**
  - No Steam linked → empty state with a "Connect Steam" CTA calling
    `startProviderLink("steam")`.
  - Loading → skeletons consistent with other `(auth)` pages.
  - Loaded (auto-fetch) → `InventoryStatsStrip` + `InventoryItemsTable`, plus a
    Refresh button (invalidates the query).
  - Error / private / empty inventory → inline `APIError.detail` message.

### Currency

Values are USD minor units. Render them with `useCurrency().formatPrice()` so
they appear in the user's preferred currency (default USD). `InventoryStatsStrip`
receives page-formatted strings; `InventoryItemsTable` is switched to use
`useCurrency().formatPrice()` internally — safe for the anonymous public tool
(no prefs → USD) and consistent everywhere.

### Analytics

- Reuse the existing `inventory_valued` PostHog event; add a `source` property
  (`"account"` vs `"public_tool"`).
- `provider_link_started` event on the "Connect {provider}" buttons / CTA.

## Success criteria

**Linking (Parts 1–2):**
- A logged-in Google/Discord user can click "Connect Steam" in settings (or the
  inventory empty state), complete OAuth, and return to find Steam in
  `linked_providers` — without losing their session or creating a second account.
- Attempting to link a provider account already attached to another user shows a
  clear "already linked" error.
- Unlink continues to work and still enforces the last-auth-method guard.

**Inventory (Part 3):**
- A Steam-linked user visiting `/inventory` sees their valued inventory
  auto-loaded, in their preferred currency, with a working Refresh.
- A non-Steam user sees the Connect-Steam empty state wired to the real link flow.
- The fetch goes through `queryKeys` + a hook (no direct `webApi` call in the
  component body).

**Both repos:** backend tests for the link endpoint + callback branch
(link success, already-linked, no-session) pass; `pnpm build` and `pnpm lint`
clean on the frontend.

## Assumptions to confirm during implementation

- The valuation response is USD-denominated (so `formatPrice`, which assumes
  USD-cents input, is correct). Everything in the app's money convention says so;
  verify against a live response.
- The frontend redirect target domain/route for the post-link callback
  (`/account/settings?linked=…`) matches `_frontend_redirect`'s configured base.
- The Discord/Google `link/start` URLs can carry the same state mechanism as
  login (they already pass `state`); confirm no provider-specific nonce handling
  needs replicating for the link path (Google uses a nonce in state).

## Explicitly out of scope (this effort)

- Saved inventory snapshots / value history / charts over time.
- Writing inventory into a portfolio (cost basis, P/L, transactions).
- The bearer-authed `/v1/inventory/steam` own-inventory path (Approach B).
- Any new persistence tables (`session`, `consent_record`, `auth_identity`
  rename) — linking reuses the existing `OAuthAccount` model.
