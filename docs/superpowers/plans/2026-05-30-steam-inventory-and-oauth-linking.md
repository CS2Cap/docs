# Steam Inventory View + OAuth Account Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give logged-in users an authenticated Steam inventory view (live, valued), and make it possible for Google/Discord users to connect a Steam account.

**Architecture:** Three sequential phases across two repos. Phase 1 (backend, `cs2c-api`) adds a session-aware OAuth *link* flow: a proxy-authenticated `POST /v1/web/auth/{provider}/link` binds the current user into the OAuth state, and the existing web callback branches to `link_oauth_account` when that state is present. Phases 2–3 (frontend, `cs2cap`) add a "Connect provider" UI in account settings and a new `/inventory` page that reuses the existing valuation pipeline + components, fed by the session's linked Steam ID, with values rendered in the user's preferred currency.

**Tech Stack:** Backend: FastAPI, SQLAlchemy async, pytest (httpx AsyncClient, monkeypatch/patch). Frontend: Next.js 16 App Router, TanStack Query, TypeScript, Tailwind v4, shadcn/ui. The frontend has **no test runner** (per CLAUDE.md) — frontend phases verify with `pnpm lint` + `pnpm build` + manual checks.

**Spec:** `docs/superpowers/specs/2026-05-30-authenticated-steam-inventory-view-design.md`

**Repo paths:** frontend repo root = `/home/gigachad/cs2cap/cs2cap`; backend repo root = `/home/gigachad/cs2cap/cs2c-api`. Run backend commands from the backend root, frontend commands from the frontend root.

---

## File Structure

**Phase 1 — backend (`cs2c-api`)**
- Modify `src/app/api/web.py` — add `ProviderLinkStartResponse` model, `_build_provider_oauth_url` helper (DRY with `web_login`), `_web_link_redirect` helper, `POST /auth/{provider}/link` endpoint, and a link-vs-login branch in `web_callback` (extract `_resolve_provider_identity`). New imports: `link_oauth_account`, `ProviderAlreadyLinkedError`, `UUID`.
- Create `tests/integration/test_web_auth_link.py` — link-start auth gate, state binding, callback link success / already-linked / login-regression.

**Phase 2 — frontend linking UI (`cs2cap`)**
- Modify `src/lib/api/types.ts` — add `ProviderLinkStartResponse`.
- Modify `src/lib/api/client.ts` — add `startProviderLink(provider)`.
- Modify `src/app/(auth)/account/settings/page.tsx` — "Connect" buttons for not-yet-linked providers; handle `?linked=` / `?link_error=` return params.

**Phase 3 — frontend inventory view (`cs2cap`)**
- Modify `src/lib/api/hooks.ts` — `queryKeys.inventory` + `useSteamInventory`.
- Modify `src/components/inventory/InventoryItemsTable.tsx` — optional `formatPrice` prop (default = current USD formatter).
- Create `src/app/(auth)/inventory/page.tsx` — the page (states + auto-fetch + currency).
- Modify `src/components/layouts/AuthLayout.tsx` — add Inventory nav item.
- Modify `src/app/(auth)/dashboard/page.tsx` — add an Inventory quick-link card.

---

## Phase 1 — Backend: session-aware OAuth account linking

All code in this phase is in `cs2c-api`. Run tests with `uv run pytest` (or `pytest` if the project venv is active) from `/home/gigachad/cs2cap/cs2c-api`.

### Task 1: Link-start endpoint requires a session

**Files:**
- Test: `tests/integration/test_web_auth_link.py` (create)
- Modify: `src/app/api/web.py`

- [ ] **Step 1: Write the failing test**

```python
"""Integration tests for OAuth provider linking (web surface)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


async def test_link_start_unauthenticated_returns_401(client: AsyncClient) -> None:
    resp = await client.post("/v1/web/auth/steam/link")
    assert resp.status_code == 401
```

- [ ] **Step 2: Run it to verify it fails**

Run: `uv run pytest tests/integration/test_web_auth_link.py::test_link_start_unauthenticated_returns_401 -v`
Expected: FAIL — currently 404 (route does not exist) instead of 401.

- [ ] **Step 3: Add the response model, helper, and endpoint in `src/app/api/web.py`**

Add to the imports from `app.services.auth.oauth_service` (extend the existing import block at lines 29–39):

```python
from app.services.auth.oauth_service import (
    InvalidStateError,
    OAuthError,
    OAuthLoginBlockedError,
    ProviderAlreadyLinkedError,
    create_web_session,
    delete_web_session,
    find_or_create_oauth_user,
    issue_auth_code,
    link_oauth_account,
    store_oauth_state,
    verify_oauth_state,
)
```

Add `from uuid import UUID` to the top imports.

Add a response model near `WebSessionLogoutResponse` (after line 55):

```python
class ProviderLinkStartResponse(BaseModel):
    redirect_url: str = Field(
        description="Provider OAuth URL the browser should navigate to in order to link the account."
    )
```

Add a shared URL builder (DRY with `web_login`) and a link-redirect helper after `_web_oauth_callback_url` (after line 140):

```python
async def _build_provider_oauth_url(
    provider: str,
    request: Request,
    *,
    extra: dict[str, str] | None = None,
) -> str:
    """Store OAuth state (optionally with extra payload) and build the provider login URL."""
    if provider == "steam":
        state = await store_oauth_state(
            provider, ttl_sec=settings.OAUTH_AUTH_CODE_TTL_SEC, extra=extra
        )
        return build_steam_login_url(
            return_to=_web_oauth_callback_url(request, provider),
            realm=settings.STEAM_OPENID_REALM,
            state=state,
        )
    if provider == "discord":
        state = await store_oauth_state(
            provider, ttl_sec=settings.OAUTH_AUTH_CODE_TTL_SEC, extra=extra
        )
        params = {
            "client_id": settings.DISCORD_CLIENT_ID,
            "redirect_uri": _web_oauth_callback_url(request, provider),
            "response_type": "code",
            "scope": "identify",
            "state": state,
        }
        return f"https://discord.com/oauth2/authorize?{urlencode(params)}"
    nonce = secrets.token_urlsafe(32)
    state = await store_oauth_state(
        provider,
        ttl_sec=settings.OAUTH_AUTH_CODE_TTL_SEC,
        extra={**(extra or {}), "nonce": nonce},
    )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": _web_oauth_callback_url(request, provider),
        "response_type": "code",
        "scope": "openid profile",
        "state": state,
        "nonce": nonce,
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


def _web_link_redirect(provider: str, *, error: str | None = None) -> RedirectResponse:
    """Redirect back to account settings after a link attempt."""
    base = settings.ACCOUNT_SETTINGS_URL
    params = {"link_error": error} if error else {"linked": provider}
    return RedirectResponse(url=f"{base}?{urlencode(params)}", status_code=302)
```

Add the endpoint after `web_login` (after line 216):

```python
@router.post(
    "/auth/{provider}/link",
    response_model=ProviderLinkStartResponse,
    dependencies=[Depends(require_api_key), Depends(RateLimits.standard)],
    openapi_extra={"security": WEB_COOKIE_SECURITY},
)
async def web_link_start(
    provider: str,
    request: Request,
    user: AuthenticatedUser = WEB_SESSION_USER_DEPENDENCY,
) -> ProviderLinkStartResponse:
    """Begin linking an additional OAuth provider to the authenticated user."""
    normalized = _validate_oauth_provider(provider)
    _require_oauth_configured()
    url = await _build_provider_oauth_url(
        normalized, request, extra={"link_user_id": user.user_id}
    )
    return ProviderLinkStartResponse(redirect_url=url)
```

- [ ] **Step 4: Run it to verify it passes**

Run: `uv run pytest tests/integration/test_web_auth_link.py::test_link_start_unauthenticated_returns_401 -v`
Expected: PASS (now 401, route exists but auth fails).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/web.py tests/integration/test_web_auth_link.py
git commit -m "feat(auth): add web OAuth link-start endpoint"
```

### Task 2: Link-start binds the user into OAuth state

**Files:**
- Test: `tests/integration/test_web_auth_link.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.usefixtures("override_auth", "override_db_session")
async def test_link_start_binds_user_into_state(client: AsyncClient) -> None:
    store_mock = AsyncMock(return_value="state-token")
    with (
        patch("app.api.web.store_oauth_state", new=store_mock),
        patch("app.api.web.build_steam_login_url", return_value="https://steamcommunity.com/openid/login?x=1"),
    ):
        resp = await client.post("/v1/web/auth/steam/link")

    assert resp.status_code == 200
    assert resp.json()["redirect_url"].startswith("https://steamcommunity.com/openid/login")
    store_mock.assert_awaited_once()
    # The current user id must be carried in the state payload for the callback.
    _, kwargs = store_mock.call_args
    assert "link_user_id" in kwargs["extra"]
```

- [ ] **Step 2: Run it to verify it passes**

Run: `uv run pytest tests/integration/test_web_auth_link.py::test_link_start_binds_user_into_state -v`
Expected: PASS (implementation from Task 1 already satisfies this).

> If it fails because `override_auth` is unknown, confirm the fixture name used by `tests/integration/test_auth_unlink.py` (`override_auth`, `override_db_session`, `client`) and match it.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/test_web_auth_link.py
git commit -m "test(auth): assert link-start binds user into oauth state"
```

### Task 3: Callback links the provider when state carries link_user_id

**Files:**
- Modify: `src/app/api/web.py` (refactor `web_callback`)
- Test: `tests/integration/test_web_auth_link.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.usefixtures("override_db_session")
async def test_callback_link_mode_links_and_redirects_to_settings(client: AsyncClient) -> None:
    link_mock = AsyncMock()
    foc_mock = AsyncMock()
    with (
        patch(
            "app.api.web.verify_oauth_state",
            new=AsyncMock(return_value={"provider": "steam", "link_user_id": "11111111-1111-1111-1111-111111111111"}),
        ),
        patch("app.api.web.verify_steam_callback", new=AsyncMock(return_value="76561198000000000")),
        patch("app.api.web.fetch_steam_profile", new=AsyncMock(return_value={"personaname": "x", "avatarfull": "y"})),
        patch("app.api.web.link_oauth_account", new=link_mock),
        patch("app.api.web.find_or_create_oauth_user", new=foc_mock),
    ):
        resp = await client.get(
            "/v1/web/auth/steam/callback?state=abc&openid.claimed_id=z",
            follow_redirects=False,
        )

    assert resp.status_code == 302
    assert "/account/settings" in resp.headers["location"]
    assert "linked=steam" in resp.headers["location"]
    link_mock.assert_awaited_once()
    foc_mock.assert_not_awaited()
```

- [ ] **Step 2: Run it to verify it fails**

Run: `uv run pytest tests/integration/test_web_auth_link.py::test_callback_link_mode_links_and_redirects_to_settings -v`
Expected: FAIL — callback currently always calls `find_or_create_oauth_user`, so `link_mock` is not awaited and the redirect targets the dashboard.

- [ ] **Step 3: Refactor `web_callback` to branch on link mode**

Replace the body of `web_callback` (lines 225–308) with this. It extracts identity resolution, then branches: link mode calls `link_oauth_account` and redirects to settings; login mode is unchanged.

```python
async def _resolve_provider_identity(
    provider: str,
    request: Request,
    params: dict[str, str],
) -> tuple[str, str | None, str | None]:
    """Return (provider_user_id, display_name, avatar_url) for the callback's provider."""
    if provider == "steam":
        steamid64 = await verify_steam_callback(params)
        profile = await fetch_steam_profile(steamid64)
        return steamid64, profile.get("personaname"), profile.get("avatarfull")
    if provider == "discord":
        discord_user = await _discord_exchange_and_fetch(
            params.get("code", ""), redirect_uri=_web_oauth_callback_url(request, provider)
        )
        discord_id = str(discord_user["id"])
        return (
            discord_id,
            discord_user.get("username", discord_id),
            _discord_avatar_url(discord_id, discord_user.get("avatar")),
        )
    google_user = await _google_exchange_and_fetch(
        params.get("code", ""), redirect_uri=_web_oauth_callback_url(request, provider)
    )
    google_sub = str(google_user.get("sub", google_user.get("id", "")))
    return google_sub, google_user.get("name", google_sub), google_user.get("picture")


@router.get(
    "/auth/{provider}/callback",
    response_class=RedirectResponse,
    include_in_schema=False,
    dependencies=[Depends(RateLimits.standard)],
)
async def web_callback(
    provider: str,
    request: Request,
    db: AsyncSession = DB_SESSION_DEPENDENCY,
) -> RedirectResponse:
    """Complete first-party browser login, or link a provider to the current user."""
    normalized = _validate_oauth_provider(provider)
    params = dict(request.query_params)

    if normalized in {"discord", "google"} and "error" in params:
        OAUTH_LOGIN_TOTAL.labels(provider=normalized, status="error").inc()
        return _web_frontend_redirect(request, error="auth_denied")

    state = params.get("state", "")
    try:
        state_data = await verify_oauth_state(state, expected_provider=normalized)
    except InvalidStateError:
        OAUTH_LOGIN_TOTAL.labels(provider=normalized, status="error").inc()
        return _web_frontend_redirect(request, error="invalid_state")

    link_user_id = state_data.get("link_user_id")

    try:
        provider_user_id, display_name, avatar_url = await _resolve_provider_identity(
            normalized, request, params
        )
    except OAuthLoginBlockedError as exc:
        log.info("oauth.web_login_blocked", provider=normalized, reason=exc.reason)
        OAUTH_LOGIN_TOTAL.labels(provider=normalized, status="error").inc()
        return _web_frontend_redirect(request, error=_oauth_blocked_error_to_frontend(exc.reason))
    except (OAuthError, Exception) as exc:  # noqa: BLE001
        log.warning("oauth.web_callback_failed", provider=normalized, error=str(exc))
        OAUTH_LOGIN_TOTAL.labels(provider=normalized, status="error").inc()
        return _web_frontend_redirect(request, error="auth_failed")

    if link_user_id:
        try:
            await link_oauth_account(
                db,
                user_id=UUID(link_user_id),
                provider=normalized,
                provider_user_id=provider_user_id,
                display_name=display_name,
                avatar_url=avatar_url,
            )
        except ProviderAlreadyLinkedError:
            OAUTH_LOGIN_TOTAL.labels(provider=normalized, status="link_conflict").inc()
            return _web_link_redirect(normalized, error="already_linked")
        OAUTH_LOGIN_TOTAL.labels(provider=normalized, status="link").inc()
        return _web_link_redirect(normalized)

    try:
        user, tier, is_new = await find_or_create_oauth_user(
            db,
            provider=normalized,
            provider_user_id=provider_user_id,
            display_name=display_name,
            avatar_url=avatar_url,
        )
    except OAuthLoginBlockedError as exc:
        log.info("oauth.web_login_blocked", provider=normalized, reason=exc.reason)
        OAUTH_LOGIN_TOTAL.labels(provider=normalized, status="error").inc()
        return _web_frontend_redirect(request, error=_oauth_blocked_error_to_frontend(exc.reason))

    session_id = await create_web_session(user, ttl_sec=settings.OAUTH_SESSION_TTL_SEC)
    auth_code = await issue_auth_code(user, tier, ttl_sec=settings.OAUTH_AUTH_CODE_TTL_SEC)
    next_path = urlparse(settings.ACCOUNT_SETTINGS_URL).path if is_new else None
    response = _web_frontend_redirect(request, code=auth_code, next_path=next_path)
    _set_web_session_cookie(response, session_id, secure=_is_secure_request(request))
    OAUTH_LOGIN_TOTAL.labels(provider=normalized, status="new_user" if is_new else "success").inc()
    return response
```

Also refactor `web_login` to call the shared helper (replace its body lines 178–216):

```python
async def web_login(provider: str, request: Request) -> RedirectResponse:
    """Start first-party browser login for the requested OAuth provider."""
    normalized = _validate_oauth_provider(provider)
    _require_oauth_configured()
    url = await _build_provider_oauth_url(normalized, request)
    return RedirectResponse(url=url, status_code=302)
```

- [ ] **Step 4: Run it to verify it passes**

Run: `uv run pytest tests/integration/test_web_auth_link.py::test_callback_link_mode_links_and_redirects_to_settings -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/web.py tests/integration/test_web_auth_link.py
git commit -m "feat(auth): link provider on callback when state carries link_user_id"
```

### Task 4: Already-linked conflict and login regression

**Files:**
- Test: `tests/integration/test_web_auth_link.py`

- [ ] **Step 1: Write the failing tests**

```python
@pytest.mark.usefixtures("override_db_session")
async def test_callback_link_mode_already_linked_redirects_with_error(client: AsyncClient) -> None:
    from app.services.auth.oauth_service import ProviderAlreadyLinkedError

    with (
        patch(
            "app.api.web.verify_oauth_state",
            new=AsyncMock(return_value={"provider": "steam", "link_user_id": "11111111-1111-1111-1111-111111111111"}),
        ),
        patch("app.api.web.verify_steam_callback", new=AsyncMock(return_value="76561198000000000")),
        patch("app.api.web.fetch_steam_profile", new=AsyncMock(return_value={})),
        patch("app.api.web.link_oauth_account", new=AsyncMock(side_effect=ProviderAlreadyLinkedError("taken"))),
    ):
        resp = await client.get(
            "/v1/web/auth/steam/callback?state=abc&openid.claimed_id=z",
            follow_redirects=False,
        )

    assert resp.status_code == 302
    assert "link_error=already_linked" in resp.headers["location"]


@pytest.mark.usefixtures("override_db_session")
async def test_callback_login_mode_still_creates_session(client: AsyncClient) -> None:
    user = type("U", (), {"id": "22222222-2222-2222-2222-222222222222"})()
    tier = type("T", (), {"code": "free"})()
    with (
        patch("app.api.web.verify_oauth_state", new=AsyncMock(return_value={"provider": "steam"})),
        patch("app.api.web.verify_steam_callback", new=AsyncMock(return_value="76561198000000000")),
        patch("app.api.web.fetch_steam_profile", new=AsyncMock(return_value={})),
        patch("app.api.web.find_or_create_oauth_user", new=AsyncMock(return_value=(user, tier, False))),
        patch("app.api.web.create_web_session", new=AsyncMock(return_value="sess-1")),
        patch("app.api.web.issue_auth_code", new=AsyncMock(return_value="code-1")),
    ):
        resp = await client.get(
            "/v1/web/auth/steam/callback?state=abc&openid.claimed_id=z",
            follow_redirects=False,
        )

    assert resp.status_code == 302
    assert "code=code-1" in resp.headers["location"]
```

- [ ] **Step 2: Run to verify they pass**

Run: `uv run pytest tests/integration/test_web_auth_link.py -v`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/test_web_auth_link.py
git commit -m "test(auth): cover link conflict and login regression"
```

### Task 5: Full backend verification

- [ ] **Step 1: Run the auth test suites**

Run: `uv run pytest tests/integration/test_auth.py tests/integration/test_auth_unlink.py tests/integration/test_web_auth_link.py tests/unit/services/test_oauth_service.py -v`
Expected: all PASS (confirms the `web_callback` refactor didn't regress login/unlink).

- [ ] **Step 2: Lint/type-check per repo convention**

Run: `uv run ruff check src/app/api/web.py tests/integration/test_web_auth_link.py`
Expected: no errors.

- [ ] **Step 3: Commit any fixups**

```bash
git add -A && git commit -m "chore(auth): lint fixups for link flow" --allow-empty
```

---

## Phase 2 — Frontend: account-settings link UI

All code in this phase is in `cs2cap`. Phase 1's endpoint must be deployed/available for manual verification, but the FE code can be written against it regardless.

### Task 6: Add the link client method and type

**Files:**
- Modify: `src/lib/api/types.ts`
- Modify: `src/lib/api/client.ts`

- [ ] **Step 1: Add the response type** to `src/lib/api/types.ts` (near the other auth types, e.g. after `AccountLinkedProvider`):

```typescript
export interface ProviderLinkStartResponse {
  redirect_url: string;
}
```

- [ ] **Step 2: Add the client method** in `src/lib/api/client.ts`. Add `ProviderLinkStartResponse` to the type import block, then add this method next to `unlinkProvider` (after line 158):

```typescript
  startProviderLink(provider: string): Promise<ProviderLinkStartResponse> {
    return request(`/v1/web/auth/${provider}/link`, { method: "POST" });
  },
```

- [ ] **Step 3: Verify build + lint**

Run: `pnpm lint && pnpm build`
Expected: clean (no type errors).

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/types.ts src/lib/api/client.ts
git commit -m "feat(api): add startProviderLink client method"
```

### Task 7: "Connect provider" UI in account settings

**Files:**
- Modify: `src/app/(auth)/account/settings/page.tsx`

- [ ] **Step 1: Add a helper constant and the connect handler.** Near the top of the component (after the existing unlink state, around line 86), add:

```typescript
  const ALL_PROVIDERS = ["steam", "google", "discord"] as const;
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  async function handleConnect(provider: string) {
    setLinkingProvider(provider);
    try {
      const { redirect_url } = await webApi.startProviderLink(provider);
      window.location.assign(redirect_url);
    } catch {
      setLinkingProvider(null);
    }
  }
```

(Confirm `webApi` is already imported in this file; it is used for `unlinkProvider`.)

- [ ] **Step 2: Render Connect buttons** for not-yet-linked providers. Inside the "Linked providers" block, after the closing `)}` of the `linkedProviders.length === 0 ? … : (…)` ternary (after line 475), add:

```tsx
              {(() => {
                const linkedKeys = new Set(linkedProviders.map((lp) => lp.provider));
                const connectable = ALL_PROVIDERS.filter((p) => !linkedKeys.has(p));
                if (connectable.length === 0) return null;
                return (
                  <div className="space-y-2 pt-1">
                    {connectable.map((provider) => (
                      <div
                        key={provider}
                        className="flex items-center justify-between rounded-lg border border-dashed border-border/40 px-3 py-2"
                      >
                        <span className="text-sm text-muted-foreground">
                          {providerLabel(provider)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConnect(provider)}
                          disabled={linkingProvider === provider}
                        >
                          {linkingProvider === provider ? "Redirecting…" : "Connect"}
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })()}
```

- [ ] **Step 3: Surface link return params.** At the top of the component body (after the hooks that read the session), add a one-time effect that reads `?linked=` / `?link_error=` and refetches the session:

```typescript
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  useEffect(() => {
    const linked = searchParams.get("linked");
    const linkError = searchParams.get("link_error");
    if (!linked && !linkError) return;
    if (linked) {
      toast.success(`${providerLabel(linked)} connected.`);
    } else if (linkError === "already_linked") {
      toast.error("That account is already linked to another user.");
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.session });
    window.history.replaceState(null, "", window.location.pathname);
  }, [searchParams, queryClient]);
```

Add the needed imports at the top of the file:

```typescript
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/hooks";
```

(Confirm `toast` and `providerLabel` are already imported — `providerLabel` is defined locally in this file at line 48; reuse it. If `toast` is not present, import it from the project's toast utility used elsewhere, e.g. `import { toast } from "sonner";` — grep `from "sonner"` to confirm the package before adding.)

- [ ] **Step 4: Verify build + lint**

Run: `pnpm lint && pnpm build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/account/settings/page.tsx"
git commit -m "feat(account): connect additional OAuth providers from settings"
```

### Task 8: Manual verification of linking

- [ ] **Step 1:** Run `pnpm dev`. Log in with a Google or Discord account (one with no Steam link).
- [ ] **Step 2:** Go to `/account/settings` → "Sign-in methods". Confirm a "Connect Steam" button appears.
- [ ] **Step 3:** Click it → complete Steam OAuth → confirm you return to `/account/settings?linked=steam`, a success toast shows, and Steam now appears under linked providers (with an Unlink button), without being logged out.
- [ ] **Step 4:** Repeat the connect with a Steam account already attached to a different user → confirm the "already linked" error toast.

---

## Phase 3 — Frontend: authenticated Steam inventory view

All code in this phase is in `cs2cap`.

### Task 9: `useSteamInventory` hook + query key

**Files:**
- Modify: `src/lib/api/hooks.ts`

- [ ] **Step 1: Add the query key** to the `queryKeys` object (after the `usage` entry, line 33):

```typescript
  inventory: (steamId: string | null) => ["inventory", steamId] as const,
```

- [ ] **Step 2: Add the hook.** Append near the other feature hooks. It is enabled only when a Steam ID is known:

```typescript
export function useSteamInventory(steamId: string | null) {
  return useQuery<InventoryValueToolResponse>({
    queryKey: queryKeys.inventory(steamId),
    queryFn: () => webApi.valueSteamInventory({ steam_id: steamId as string }),
    enabled: steamId !== null,
    retry: false,
    staleTime: 60_000,
  });
}
```

Add `InventoryValueToolResponse` to the type imports at the top of `hooks.ts` (it lives in `@/lib/api/types`).

- [ ] **Step 3: Verify build + lint**

Run: `pnpm lint && pnpm build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/hooks.ts
git commit -m "feat(api): add useSteamInventory query hook"
```

### Task 10: Optional `formatPrice` prop on InventoryItemsTable

**Files:**
- Modify: `src/components/inventory/InventoryItemsTable.tsx`

- [ ] **Step 1: Add an optional prop** that defaults to the existing USD formatter, so the public tool is unchanged. Change the component signature (lines 67–73):

```tsx
export function InventoryItemsTable({
  items,
  providers,
  formatPrice = formatUsd,
}: {
  items: InventoryValueResolvedItem[];
  providers: ProviderInfo[];
  formatPrice?: (minor: number | null | undefined) => string;
}) {
```

- [ ] **Step 2: Use the prop** in the two render sites. Replace `formatUsd(item.best_ask)` at line 207 and line 217 with `formatPrice(item.best_ask)`.

- [ ] **Step 3: Verify build + lint**

Run: `pnpm lint && pnpm build`
Expected: clean (public tool still passes no `formatPrice`, so it uses `formatUsd`).

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory/InventoryItemsTable.tsx
git commit -m "refactor(inventory): allow custom price formatter on items table"
```

### Task 11: The inventory page

**Files:**
- Create: `src/app/(auth)/inventory/page.tsx`

- [ ] **Step 1: Create the page.** It derives the Steam ID from the session, auto-fetches when present, renders the reused components with currency-aware formatting, and shows a Connect-Steam empty state otherwise.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import posthog from "posthog-js";
import { useSession, useSteamInventory } from "@/lib/api";
import { webApi } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";
import { Button } from "@/components/ui/button";
import { InventoryStatsStrip } from "@/components/inventory/InventoryStatsStrip";
import { InventoryItemsTable } from "@/components/inventory/InventoryItemsTable";
import type { ProviderInfo } from "@/lib/api/types";

export default function InventoryPage() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { formatPrice } = useCurrency();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [linking, setLinking] = useState(false);

  const steamId = useMemo(() => {
    const steam = session?.linked_providers.find((p) => p.provider === "steam");
    return steam?.provider_user_id ?? null;
  }, [session]);

  const { data, isLoading, isError, error, refetch, isFetching } = useSteamInventory(steamId);

  // Providers power the per-item marketplace identity column.
  useMemo(() => {
    webApi.getProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  async function handleConnectSteam() {
    setLinking(true);
    posthog.capture("provider_link_started", { provider: "steam", source: "inventory" });
    try {
      const { redirect_url } = await webApi.startProviderLink("steam");
      window.location.assign(redirect_url);
    } catch {
      setLinking(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-4 h-8 w-56 animate-pulse rounded bg-secondary/50" />
        <div className="h-40 animate-pulse rounded bg-secondary/30" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs tracking-widest text-primary mb-3">// INVENTORY</div>
          <h1 className="display-heading text-3xl font-black tracking-tighter md:text-5xl">
            YOUR STEAM INVENTORY
          </h1>
        </div>
        {steamId && (
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      {!steamId ? (
        <div className="border-2 border-dashed border-border bg-card p-10 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            Connect your Steam account to value your inventory.
          </p>
          <Button className="mt-4" onClick={handleConnectSteam} disabled={linking}>
            {linking ? "Redirecting…" : "Connect Steam"}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Valuing your inventory…
        </div>
      ) : isError ? (
        <div className="border-2 border-border bg-card p-8 text-center font-mono text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Couldn't load your inventory."}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <InventoryStatsStrip
            stats={[
              { label: "Total value", value: formatPrice(data.stats.total_value) },
              { label: "Items", value: data.stats.units_total.toLocaleString() },
              { label: "Priced", value: data.stats.items_priced.toLocaleString() },
              { label: "Unpriced", value: data.stats.items_unpriced.toLocaleString() },
            ]}
          />
          <InventoryItemsTable items={data.items} providers={providers} formatPrice={formatPrice} />
        </div>
      ) : null}
    </div>
  );
}
```

> Note: `useSteamInventory` and `useSession` are re-exported from `@/lib/api` (the barrel). If they are not, import them from `@/lib/api/hooks`. Confirm by grepping `export` in `src/lib/api/index.ts`.

- [ ] **Step 2: Capture the analytics `source` on the existing public tool** so authenticated vs public usage is distinguishable. In `src/app/(public)/inventory-value/InventoryValueTool.tsx` (line 69 `posthog.capture("inventory_valued", …)`), add `source: "public_tool",` to the event properties. (The new page does not fire `inventory_valued`; it relies on the hook — if you want symmetry, fire `inventory_valued` with `source: "account"` inside an `onSuccess` you add to `useSteamInventory`, but that is optional and out of the critical path.)

- [ ] **Step 3: Verify build + lint**

Run: `pnpm lint && pnpm build`
Expected: clean; `/inventory` appears in the build route list.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/inventory/page.tsx" "src/app/(public)/inventory-value/InventoryValueTool.tsx"
git commit -m "feat(inventory): authenticated Steam inventory view"
```

### Task 12: Nav + dashboard entry points

**Files:**
- Modify: `src/components/layouts/AuthLayout.tsx`
- Modify: `src/app/(auth)/dashboard/page.tsx`

- [ ] **Step 1: Add the nav item.** In `AuthLayout.tsx`, add `Package` to the lucide import (line 6–15) and a sidebar entry after Alerts (line 20):

```tsx
  { label: "Inventory", href: "/inventory", icon: Package },
```

- [ ] **Step 2: Add a dashboard quick-link card.** In `dashboard/page.tsx`, add `Package` to the lucide import (line 4), then add this card immediately after the stats grid `</div>` (after line 108), before the `lg:grid-cols-2` section:

```tsx
      <div className="mb-10">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Inventory</CardTitle>
                <CardDescription>Value your Steam inventory live</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory">
                Open
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </div>
```

(`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `Button`, `Link`, `ArrowRight` are already imported in this file.)

- [ ] **Step 3: Verify build + lint**

Run: `pnpm lint && pnpm build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/components/layouts/AuthLayout.tsx" "src/app/(auth)/dashboard/page.tsx"
git commit -m "feat(inventory): add inventory nav item and dashboard card"
```

### Task 13: Manual end-to-end verification

- [ ] **Step 1:** With `pnpm dev`, log in as a Steam-native user. Confirm `/inventory` auto-loads stats + table.
- [ ] **Step 2:** Switch the account currency preference (Settings → Preferences). Reload `/inventory` and confirm values render in the selected currency.
- [ ] **Step 3:** As a Google/Discord-only user, confirm `/inventory` shows the Connect-Steam empty state, and the CTA starts the link flow (Phase 1/2).
- [ ] **Step 4:** Confirm the public `/inventory-value` tool still renders prices in USD (unchanged), proving the `formatPrice` default held.

---

## Notes / assumptions to confirm during implementation

- The valuation response money fields are USD minor units (so `useCurrency().formatPrice`, which converts USD-cents, is correct). Confirm against a live `/api/inventory-value` response before closing Task 11.
- `ACCOUNT_SETTINGS_URL` is the correct post-link redirect base (it is, per `settings.py`).
- Google's link path carries the nonce inside state via `_build_provider_oauth_url` — verify the Google callback path does not separately require the nonce echoed back (the existing `web_callback` discards `state_data` for Google with `del state_data`, so no extra handling is needed).
- Confirm the frontend toast library (`sonner` vs a local wrapper) before Task 7 Step 3.
