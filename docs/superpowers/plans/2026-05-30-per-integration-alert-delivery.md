# Per-Integration Alert Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make managed alert channels (Discord/Telegram/Google Sheets) available to all tiers including Free, keep the custom webhook URL gated to Pro+Quant, enforce one active destination per platform, and build a working dashboard to manage them.

**Architecture:** Split the single `webhook_access` gate into two concepts — a per-tier *allowed-platform set* (managed channels always on; `custom` requires the existing `webhook_access` flag) and per-platform uniqueness replacing the numeric destination cap. The backend delivery engine already exists; this work opens the gate, retunes limits via migration, adds `/v1/web/account/webhooks/*` proxy aliases, and replaces the decorative frontend "Delivery Integrations" card with real CRUD.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic (`cs2c-api`); Next.js 16 App Router + TanStack Query + shadcn/ui (`cs2cap`). Backend tests: pytest. Frontend: no test runner — verify via `pnpm lint` + `pnpm build`.

**Spec:** `cs2cap/docs/superpowers/specs/2026-05-30-per-integration-alert-delivery-design.md`

**Two repos:** Tasks 1–9 are in `/home/gigachad/cs2cap/cs2c-api`. Tasks 10–14 are in `/home/gigachad/cs2cap/cs2cap`. Commit within each repo.

---

## File Structure

**`cs2c-api` (backend):**
- `src/app/tier_features.py` — add `tier_allowed_webhook_platforms()`, platform constants.
- `src/app/services/account/account_domain_service.py` — re-export/derive allowed-platform helper; fix delivery prereq + fan-out.
- `src/app/services/account/account_webhook_service.py` — uniqueness enforcement; new `WebhookPlatformExistsError`.
- `src/app/error_codes.py` — add `ACCOUNT_WEBHOOK_PLATFORM_EXISTS`.
- `src/app/api/account.py` — split route gate; platform validation on create/patch.
- `src/app/schemas.py` — add `allowed_webhook_platforms` to `AccountCapabilities`.
- `alembic/versions/0067_open_managed_webhook_platforms.py` — retune tier limits.
- `src/app/main.py` — register `/v1/web/account/webhooks/*` aliases.
- `openapi.json` — regenerate.
- `tests/unit/...`, `tests/integration/test_account_endpoints.py`, `tests/unit/test_tier_migrations.py` — tests.

**`cs2cap` (frontend):**
- `src/lib/api/types.ts` — webhook types + `allowed_webhook_platforms` on capabilities.
- `src/lib/api/client.ts` — `webApi` webhook methods.
- `src/lib/api/hooks.ts` — webhook hooks + `queryKeys.webhooks`.
- `src/components/alerts/DeliveryIntegrations.tsx` — new functional component.
- `src/app/(auth)/alerts/page.tsx` — swap decorative card for the component.
- `openapi.json` — synced from backend.

---

## Pre-flight: confirm the entitlement source of truth

The current per-tier feature data lives in `api_tiers.features_json.feature_flags` and `limits_json`, seeded/edited by alembic migrations (e.g. `0049_add_starter_tier.py`, `0058_expand_webhook_and_alert_limits.py`). Tier codes in use: `free`, `starter`, `pro`, `quant` (see `src/app/enums.py`). `webhook_access` is currently `true` only for `pro` and `quant`. We do **not** change that flag — managed-channel access is derived, not flag-gated.

---

## Task 1: Allowed-platform helper in `tier_features.py`

**Files:**
- Modify: `src/app/tier_features.py`
- Test: `tests/unit/test_tier_features.py` (create if absent; otherwise append)

- [ ] **Step 1: Write the failing test**

Create/append `tests/unit/test_tier_features.py`:

```python
from app.tier_features import (
    MANAGED_WEBHOOK_PLATFORMS,
    allowed_webhook_platforms_for_flags,
)


def test_managed_platforms_available_without_webhook_flag():
    result = allowed_webhook_platforms_for_flags({"webhook_access": False})
    assert result == frozenset({"discord", "telegram", "google_sheets"})


def test_custom_added_when_webhook_flag_set():
    result = allowed_webhook_platforms_for_flags({"webhook_access": True})
    assert result == frozenset({"discord", "telegram", "google_sheets", "custom"})


def test_missing_flags_defaults_to_managed_only():
    assert allowed_webhook_platforms_for_flags({}) == MANAGED_WEBHOOK_PLATFORMS
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/unit/test_tier_features.py -v`
Expected: FAIL — `ImportError: cannot import name 'MANAGED_WEBHOOK_PLATFORMS'`.

- [ ] **Step 3: Implement the helper**

Add to `src/app/tier_features.py` (after the imports / `ACTIVE_TIER_ENDPOINTS` block):

```python
MANAGED_WEBHOOK_PLATFORMS: frozenset[str] = frozenset(
    {"discord", "telegram", "google_sheets"}
)
CUSTOM_WEBHOOK_PLATFORM = "custom"


def allowed_webhook_platforms_for_flags(feature_flags: object) -> frozenset[str]:
    """Return the webhook platforms a tier may configure.

    Managed channels are available to every tier; the custom webhook URL
    requires the ``webhook_access`` feature flag (Pro and Quant).
    """
    platforms = set(MANAGED_WEBHOOK_PLATFORMS)
    if isinstance(feature_flags, dict) and bool(feature_flags.get("webhook_access")):
        platforms.add(CUSTOM_WEBHOOK_PLATFORM)
    return frozenset(platforms)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/unit/test_tier_features.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add src/app/tier_features.py tests/unit/test_tier_features.py
git commit -m "feat(tiers): derive allowed webhook platforms per tier"
```

---

## Task 2: Tier-level wrapper in `account_domain_service.py`

The route layer has a `tier: APITier` object, not raw flags. Add a tier-aware wrapper that reuses Task 1's helper, alongside the existing `tier_has_webhooks`.

**Files:**
- Modify: `src/app/services/account/account_domain_service.py`
- Test: `tests/unit/services/test_account_domain_service.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/services/test_account_domain_service.py` (mirror how existing tests build a fake tier — check the top of that file for a tier factory/fixture; if it uses a simple object with `features_json`, replicate that):

```python
from app.services.account.account_domain_service import tier_allowed_webhook_platforms


class _FakeTier:
    def __init__(self, flags):
        self.features_json = {"feature_flags": flags}
        self.limits_json = {}
        self.code = "test"


def test_tier_allowed_webhook_platforms_managed_only():
    tier = _FakeTier({"webhook_access": False})
    assert tier_allowed_webhook_platforms(tier) == frozenset(
        {"discord", "telegram", "google_sheets"}
    )


def test_tier_allowed_webhook_platforms_includes_custom():
    tier = _FakeTier({"webhook_access": True})
    assert "custom" in tier_allowed_webhook_platforms(tier)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/unit/services/test_account_domain_service.py -k webhook_platforms -v`
Expected: FAIL — `ImportError`/`AttributeError` for `tier_allowed_webhook_platforms`.

- [ ] **Step 3: Implement the wrapper**

In `src/app/services/account/account_domain_service.py`, add an import near the other `tier_features` imports and a function near `tier_has_webhooks` (around line 172):

```python
from app.tier_features import allowed_webhook_platforms_for_flags  # add to existing imports


def tier_allowed_webhook_platforms(tier: APITier) -> frozenset[str]:
    """Webhook platforms this tier may configure (managed always; custom if flagged)."""
    return allowed_webhook_platforms_for_flags(_feature_flags(tier))
```

Note: `_feature_flags(tier)` already returns the sanitized flag dict including `webhook_access` (see lines 130–136).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/unit/services/test_account_domain_service.py -k webhook_platforms -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add src/app/services/account/account_domain_service.py tests/unit/services/test_account_domain_service.py
git commit -m "feat(account): tier-aware allowed webhook platforms wrapper"
```

---

## Task 3: New error code for platform uniqueness

**Files:**
- Modify: `src/app/error_codes.py`

- [ ] **Step 1: Add the error code**

In `src/app/error_codes.py`, after `ACCOUNT_WEBHOOK_DELIVERY_NOT_FOUND` (line 78):

```python
    ACCOUNT_WEBHOOK_PLATFORM_EXISTS = "ACCOUNT_WEBHOOK_PLATFORM_EXISTS"
```

And in the message→code mapping list (after line 187, the `webhook delivery not found` entry):

```python
    ("an active destination already exists for this platform", ErrorCode.ACCOUNT_WEBHOOK_PLATFORM_EXISTS),
```

- [ ] **Step 2: Verify it imports**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/python -c "from app.error_codes import ErrorCode; print(ErrorCode.ACCOUNT_WEBHOOK_PLATFORM_EXISTS.value)"`
Expected: `ACCOUNT_WEBHOOK_PLATFORM_EXISTS`

- [ ] **Step 3: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add src/app/error_codes.py
git commit -m "feat(errors): add ACCOUNT_WEBHOOK_PLATFORM_EXISTS"
```

---

## Task 4: Per-platform uniqueness in the webhook service

Replace the numeric-cap check in `create_webhook_endpoint` with active-per-platform uniqueness, and enforce the same on `update_webhook_endpoint` when enabling or changing platform.

**Files:**
- Modify: `src/app/services/account/account_webhook_service.py`
- Test: `tests/unit/services/test_account_webhook_service.py` (create if absent)

- [ ] **Step 1: Write the failing test**

The service functions take an `AsyncSession`. Check `tests/conftest.py` for an existing async DB session fixture (e.g. `db_session`) and a user factory; reuse them. Create `tests/unit/services/test_account_webhook_service.py`:

```python
import pytest

from app.services.account.account_webhook_service import (
    WebhookPlatformExistsError,
    create_webhook_endpoint,
)


@pytest.mark.asyncio
async def test_second_active_destination_same_platform_rejected(db_session, api_user_factory):
    user = await api_user_factory()
    await create_webhook_endpoint(
        db_session,
        user_id=user.id,
        label="DC 1",
        url="https://discord.com/api/webhooks/1/aaa",
        platform="discord",
        is_active=True,
    )
    with pytest.raises(WebhookPlatformExistsError):
        await create_webhook_endpoint(
            db_session,
            user_id=user.id,
            label="DC 2",
            url="https://discord.com/api/webhooks/2/bbb",
            platform="discord",
            is_active=True,
        )


@pytest.mark.asyncio
async def test_different_platforms_allowed(db_session, api_user_factory):
    user = await api_user_factory()
    await create_webhook_endpoint(
        db_session, user_id=user.id, label="DC", url="https://discord.com/api/webhooks/1/a",
        platform="discord", is_active=True,
    )
    # Telegram URL must carry chat_id (backend validation)
    endpoint, secret = await create_webhook_endpoint(
        db_session, user_id=user.id, label="TG",
        url="https://api.telegram.org/botX/sendMessage?chat_id=123",
        platform="telegram", is_active=True,
    )
    assert endpoint["platform"] == "telegram"
```

> If `api_user_factory` does not exist in `conftest.py`, check the integration tests (`tests/integration/test_account_endpoints.py`) for how they create a user+tier and adapt — do not invent a fixture name; use whatever the repo provides.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/unit/services/test_account_webhook_service.py -v`
Expected: FAIL — `ImportError: cannot import name 'WebhookPlatformExistsError'`.

- [ ] **Step 3: Implement uniqueness**

In `src/app/services/account/account_webhook_service.py`:

Add the exception near the other exception classes (after `WebhookLimitReachedError`, line 47):

```python
class WebhookPlatformExistsError(Exception):
    """Raised when an active destination already exists for the platform."""
```

Add a helper after `get_active_webhook_endpoint_count` (around line 225):

```python
async def has_active_platform_endpoint(
    db: AsyncSession,
    *,
    user_id: UUID,
    platform: str,
    exclude_id: UUID | None = None,
) -> bool:
    """Return whether the user already has an active destination for ``platform``."""
    stmt = select(func.count()).select_from(UserWebhookEndpoint).where(
        UserWebhookEndpoint.user_id == user_id,
        UserWebhookEndpoint.platform == platform,
        UserWebhookEndpoint.is_active.is_(True),
    )
    if exclude_id is not None:
        stmt = stmt.where(UserWebhookEndpoint.id != exclude_id)
    return int((await db.execute(stmt)).scalar_one()) > 0
```

Change `create_webhook_endpoint` — remove the `max_destinations` parameter and the count-based check (lines 263, 266–273), replacing with:

```python
async def create_webhook_endpoint(
    db: AsyncSession,
    *,
    user_id: UUID,
    label: str,
    url: str,
    platform: str,
    is_active: bool,
) -> tuple[dict[str, object], str]:
    """Create one outbound webhook destination and return its one-time secret."""
    normalized_platform = normalize_webhook_platform(platform)
    if is_active and await has_active_platform_endpoint(
        db, user_id=user_id, platform=normalized_platform
    ):
        raise WebhookPlatformExistsError(
            "an active destination already exists for this platform"
        )

    secret = generate_webhook_secret()
    endpoint = UserWebhookEndpoint(
        user_id=user_id,
        label=normalize_webhook_label(label),
        url=normalize_webhook_url(url, platform=normalized_platform),
        platform=normalized_platform,
        secret_encrypted=encrypt_webhook_secret(secret),
        secret_last4=secret[-4:],
        is_active=is_active,
    )
    db.add(endpoint)
    await db.commit()
    await db.refresh(endpoint)
    return serialize_webhook_endpoint(endpoint), secret
```

In `update_webhook_endpoint`, after computing `next_platform` and before applying `is_active` (around line 322), enforce uniqueness when the result would be a second active endpoint of a platform:

```python
    will_be_active = endpoint.is_active if is_active is None else is_active
    if will_be_active and await has_active_platform_endpoint(
        db, user_id=user_id, platform=next_platform, exclude_id=endpoint.id
    ):
        raise WebhookPlatformExistsError(
            "an active destination already exists for this platform"
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/unit/services/test_account_webhook_service.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add src/app/services/account/account_webhook_service.py tests/unit/services/test_account_webhook_service.py
git commit -m "feat(webhooks): enforce one active destination per platform"
```

---

## Task 5: Split the route gate in `api/account.py`

Management routes (list/get/update/delete/rotate/deliveries) must not 403 by tier. Create/patch must validate the requested platform against the tier's allowed set.

**Files:**
- Modify: `src/app/api/account.py`
- Test: covered by Task 8 integration tests.

- [ ] **Step 1: Replace `_require_webhook_access` with a platform validator**

In `src/app/api/account.py`, replace `_require_webhook_access` (lines 494–501) with a platform-aware check. Keep the import of `tier_allowed_webhook_platforms` and the user's tier. The routes use `AuthenticatedUser` (with `.features_json` / `.can_access_webhooks()`), not an `APITier`, so validate against the user's flags directly via the Task 1 helper:

```python
from app.tier_features import allowed_webhook_platforms_for_flags  # add to imports


def _require_webhook_platform(user: AuthenticatedUser, platform: str) -> None:
    """403 when the user's tier may not configure the requested platform."""
    allowed = allowed_webhook_platforms_for_flags(
        user.features_json.get("feature_flags")
    )
    if platform not in allowed:
        raise AppHTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=ErrorCode.ACCOUNT_WEBHOOKS_NOT_AVAILABLE,
            detail="Webhooks are not available for this tier",
        )
```

> Verify `AuthenticatedUser` exposes `features_json` (it does — `can_access_webhooks()` reads `self.features_json.get("feature_flags")` in `security/api_auth.py:137`).

- [ ] **Step 2: Remove the gate from management routes**

Delete the `_require_webhook_access(user)` calls in: `get_account_webhooks` (line 1488), `get_account_webhook_deliveries` (1547), `get_account_webhook_delivery` (1577), `patch_account_webhook` (1606), `delete_account_webhook` (1644), `rotate_account_webhook_secret` (1671). These routes now work for any authenticated account.

- [ ] **Step 3: Update create to validate platform + drop max_destinations**

Rewrite `create_account_webhook` (lines 1502–1528). Normalize the platform first so validation matches storage, validate it, and drop the `max_destinations` plumbing and `WebhookLimitReachedError` handling (now unreachable):

```python
async def create_account_webhook(
    body: WebhookCreateRequest,
    user: Annotated[AuthenticatedUser, Depends(require_api_key)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> WebhookSecretResponse:
    """Create an outbound webhook destination."""
    normalized_platform = normalize_webhook_platform(body.platform)
    _require_webhook_platform(user, normalized_platform)
    try:
        webhook, secret = await create_webhook_endpoint(
            db,
            user_id=UUID(user.user_id),
            label=body.label,
            url=body.url,
            platform=normalized_platform,
            is_active=body.is_active,
        )
    except WebhookPlatformExistsError as exc:
        raise AppHTTPException(
            status_code=status.HTTP_409_CONFLICT,
            error_code=ErrorCode.ACCOUNT_WEBHOOK_PLATFORM_EXISTS,
            detail=str(exc),
        ) from exc
    return WebhookSecretResponse(
        webhook=WebhookEndpointSummary.model_validate(webhook),
        secret=secret,
    )
```

Update imports: add `normalize_webhook_platform`, `WebhookPlatformExistsError` to the `account_webhook_service` import block (lines 114–120); remove `WebhookLimitReachedError` if now unused (grep first — Step 5).

- [ ] **Step 4: Validate platform on patch + handle uniqueness conflict**

In `patch_account_webhook` (lines 1599–1629): after the "at least one field" guard, if `body.platform is not None`, normalize + validate it; and wrap the `update_webhook_endpoint` call to translate `WebhookPlatformExistsError` → 409:

```python
    if body.platform is not None:
        _require_webhook_platform(user, normalize_webhook_platform(body.platform))
    try:
        webhook = await update_webhook_endpoint(
            db,
            user_id=UUID(user.user_id),
            webhook_id=webhook_id,
            label=body.label,
            url=body.url,
            platform=body.platform,
            is_active=body.is_active,
        )
    except WebhookNotFoundError as exc:
        raise AppHTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=ErrorCode.ACCOUNT_WEBHOOK_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except WebhookPlatformExistsError as exc:
        raise AppHTTPException(
            status_code=status.HTTP_409_CONFLICT,
            error_code=ErrorCode.ACCOUNT_WEBHOOK_PLATFORM_EXISTS,
            detail=str(exc),
        ) from exc
```

- [ ] **Step 5: Verify no dangling references**

Run: `cd /home/gigachad/cs2cap/cs2c-api && grep -rn "_require_webhook_access\|WebhookLimitReachedError\|max_destinations" src/app`
Expected: no results in `src/app` except possibly the `WebhookLimitReachedError`/`ACCOUNT_WEBHOOK_LIMIT_REACHED` *definitions* (leave the error code defined; remove the now-unused exception import in `account.py` only). If `WebhookLimitReachedError` is no longer used anywhere, leave the class in the service (harmless) but ensure it is not imported where unused.

- [ ] **Step 6: Lint/typecheck**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/ruff check src/app/api/account.py && .venv/bin/mypy src/app/api/account.py`
Expected: clean (or only pre-existing unrelated warnings).

- [ ] **Step 7: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add src/app/api/account.py
git commit -m "feat(api): per-platform webhook gating; open management routes to all tiers"
```

---

## Task 6: Fix alert delivery prereq + fan-out for managed channels

Today both `_ensure_enabled_alert_prereqs` (line 779) and the fan-out loop (line 1284) suppress webhook delivery unless `tier_has_webhooks(tier)` — which is Pro+Quant only. Managed channels must deliver for every tier. Delivery readiness should depend on having an active destination, not the custom-webhook flag.

**Files:**
- Modify: `src/app/services/account/account_domain_service.py`
- Test: covered by Task 8 integration test (Free + Discord delivers).

- [ ] **Step 1: Update the enabled-alert prereq**

In `_ensure_enabled_alert_prereqs` (lines 778–780), remove the `tier_has_webhooks(tier)` precondition so any active destination counts as a delivery channel:

```python
    webhook_ready = await has_active_webhook_endpoint(db, user_id=user.id)
```

(Delete the `if tier_has_webhooks(tier):` wrapper and the `webhook_ready = False` default.)

- [ ] **Step 2: Update the fan-out loop**

In the trigger loop (lines 1283–1285), drop the tier gate so endpoints are fetched for everyone:

```python
        webhook_endpoints = webhook_endpoints_map.get(alert.user_id, [])
```

- [ ] **Step 3: Verify `tier` is still used (avoid unused-var lint)**

Run: `cd /home/gigachad/cs2cap/cs2c-api && grep -n "for alert, user, tier in rows" src/app/services/account/account_domain_service.py`
If `tier` is now unused in that loop body, rename to `_tier` in the unpack to satisfy ruff. Check with: `.venv/bin/ruff check src/app/services/account/account_domain_service.py`

- [ ] **Step 4: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add src/app/services/account/account_domain_service.py
git commit -m "fix(alerts): deliver managed-channel webhooks for all tiers"
```

---

## Task 7: Expose `allowed_webhook_platforms` in the account API

**Files:**
- Modify: `src/app/schemas.py`, `src/app/services/account/account_domain_service.py`, `src/app/api/account.py` (wherever `AccountCapabilities` is built)
- Test: Task 8 integration asserts the field is present.

- [ ] **Step 1: Add field to schema**

In `src/app/schemas.py`, `AccountCapabilities` (after line 885):

```python
    allowed_webhook_platforms: list[str] = Field(
        default_factory=list,
        description="Webhook platforms this tier may configure.",
    )
```

- [ ] **Step 2: Populate it**

`account_capabilities()` in `account_domain_service.py` (lines 194–206) returns a dict. Add:

```python
        "allowed_webhook_platforms": sorted(tier_allowed_webhook_platforms(tier)),
```

> Verify the call site that builds `AccountCapabilities` from this dict accepts the new key. If `AccountCapabilities(**capabilities_dict)` is used, the new key flows through automatically. If keys are passed explicitly, add `allowed_webhook_platforms=...` there. Grep: `grep -rn "AccountCapabilities(" src/app`.

- [ ] **Step 3: Typecheck**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/mypy src/app/schemas.py src/app/services/account/account_domain_service.py`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add src/app/schemas.py src/app/services/account/account_domain_service.py src/app/api/account.py
git commit -m "feat(account): expose allowed_webhook_platforms in capabilities"
```

---

## Task 8: Web-surface aliases + integration tests

**Files:**
- Modify: `src/app/main.py`
- Test: `tests/integration/test_account_endpoints.py`

- [ ] **Step 1: Register the web aliases**

In `src/app/main.py`, after the alert alias block (ends ~line 828), add `clone_api_route` calls mirroring the alert pattern (source router is `account_router`, web session deps + cookie security):

```python
    clone_api_route(
        web_alias_router,
        source_router=account_router,
        source_path="/v1/account/webhooks",
        target_path="/v1/web/account/webhooks",
        methods=["GET"],
        dependencies=web_session_dependencies,
        openapi_security=[{WEB_COOKIE_SECURITY_SCHEME: []}],
    )
    clone_api_route(
        web_alias_router,
        source_router=account_router,
        source_path="/v1/account/webhooks",
        target_path="/v1/web/account/webhooks",
        methods=["POST"],
        dependencies=web_session_dependencies,
        openapi_security=[{WEB_COOKIE_SECURITY_SCHEME: []}],
    )
    clone_api_route(
        web_alias_router,
        source_router=account_router,
        source_path="/v1/account/webhooks/{webhook_id}",
        target_path="/v1/web/account/webhooks/{webhook_id}",
        methods=["PATCH"],
        dependencies=web_session_dependencies,
        openapi_security=[{WEB_COOKIE_SECURITY_SCHEME: []}],
    )
    clone_api_route(
        web_alias_router,
        source_router=account_router,
        source_path="/v1/account/webhooks/{webhook_id}",
        target_path="/v1/web/account/webhooks/{webhook_id}",
        methods=["DELETE"],
        dependencies=web_session_dependencies,
        openapi_security=[{WEB_COOKIE_SECURITY_SCHEME: []}],
    )
    clone_api_route(
        web_alias_router,
        source_router=account_router,
        source_path="/v1/account/webhooks/{webhook_id}/rotate-secret",
        target_path="/v1/web/account/webhooks/{webhook_id}/rotate-secret",
        methods=["POST"],
        dependencies=web_session_dependencies,
        openapi_security=[{WEB_COOKIE_SECURITY_SCHEME: []}],
    )
```

> The `_register_web_proxy`/allowlist check at `main.py:1011` keys on `path.startswith("/v1/web/account")`, which already covers these paths — no allowlist edit needed. Confirm the exact helper name used in the alert block (`clone_api_route` above is from the read of lines 784–828; match it exactly).

- [ ] **Step 2: Write the integration tests**

Append to `tests/integration/test_account_endpoints.py` (reuse the file's existing client + per-tier user fixtures — inspect the top of the file for the auth helper that issues a web session or API key for a given tier code):

```python
@pytest.mark.asyncio
async def test_free_can_create_discord_but_not_custom(client, free_user_auth):
    ok = await client.post(
        "/v1/account/webhooks",
        json={"label": "DC", "url": "https://discord.com/api/webhooks/1/a", "platform": "discord"},
        headers=free_user_auth,
    )
    assert ok.status_code == 201

    denied = await client.post(
        "/v1/account/webhooks",
        json={"label": "C", "url": "https://example.com/hook", "platform": "custom"},
        headers=free_user_auth,
    )
    assert denied.status_code == 403
    assert denied.json()["error_code"] == "ACCOUNT_WEBHOOKS_NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_pro_can_create_custom(client, pro_user_auth):
    res = await client.post(
        "/v1/account/webhooks",
        json={"label": "C", "url": "https://example.com/hook", "platform": "custom"},
        headers=pro_user_auth,
    )
    assert res.status_code == 201


@pytest.mark.asyncio
async def test_second_active_discord_conflicts(client, free_user_auth):
    base = {"url": "https://discord.com/api/webhooks/1/a", "platform": "discord"}
    first = await client.post("/v1/account/webhooks", json={"label": "A", **base}, headers=free_user_auth)
    assert first.status_code == 201
    second = await client.post("/v1/account/webhooks", json={"label": "B", **base}, headers=free_user_auth)
    assert second.status_code == 409
    assert second.json()["error_code"] == "ACCOUNT_WEBHOOK_PLATFORM_EXISTS"


@pytest.mark.asyncio
async def test_capabilities_expose_allowed_platforms(client, free_user_auth, pro_user_auth):
    free = (await client.get("/v1/account", headers=free_user_auth)).json()
    assert "custom" not in free["capabilities"]["allowed_webhook_platforms"]
    assert "discord" in free["capabilities"]["allowed_webhook_platforms"]
    pro = (await client.get("/v1/account", headers=pro_user_auth)).json()
    assert "custom" in pro["capabilities"]["allowed_webhook_platforms"]


@pytest.mark.asyncio
async def test_web_alias_lists_webhooks(client, free_user_web_session):
    res = await client.get("/v1/web/account/webhooks", headers=free_user_web_session)
    assert res.status_code == 200
    assert "webhooks" in res.json()
```

> Fixture names (`client`, `free_user_auth`, `pro_user_auth`, `free_user_web_session`) are placeholders — replace with the actual fixtures in `tests/integration/conftest.py` / `tests/conftest.py`. If only an API-key auth fixture exists, the `/v1/web/...` test may need a web-session fixture; if none exists, assert the alias route is registered instead via `client.get` returning non-404.

- [ ] **Step 3: Run the integration tests**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/integration/test_account_endpoints.py -k "webhook or allowed_platforms or alias" -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add src/app/main.py tests/integration/test_account_endpoints.py
git commit -m "feat(api): web aliases for webhooks; integration coverage"
```

---

## Task 9: Migration to retune tier limits + regenerate OpenAPI

**Files:**
- Create: `alembic/versions/0067_open_managed_webhook_platforms.py`
- Modify: `openapi.json`
- Test: `tests/unit/test_tier_migrations.py`

- [ ] **Step 1: Write the migration**

Create `alembic/versions/0067_open_managed_webhook_platforms.py` (mirror `0058`'s idempotent JSON update; `down_revision = "0066"`):

```python
"""Open managed webhook platforms to all tiers.

Revision ID: 0067
Revises: 0066
Create Date: 2026-05-30 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision = "0067"
down_revision = "0066"
branch_labels = None
depends_on = None

# Allowed-platform count drives the (now informational) destination limit.
MANAGED_COUNT = 3   # discord, telegram, google_sheets
CUSTOM_INCLUDED = 4  # + custom


def _tier_table() -> sa.Table:
    return sa.table(
        "api_tiers",
        sa.column("id", UUID(as_uuid=True)),
        sa.column("code", sa.String(length=32)),
        sa.column("features_json", sa.JSON()),
        sa.column("limits_json", sa.JSON()),
    )


def upgrade() -> None:
    bind = op.get_bind()
    t = _tier_table()
    rows = bind.execute(sa.select(t.c.id, t.c.code, t.c.features_json, t.c.limits_json)).mappings()
    for row in rows:
        code = str(row["code"])
        flags = dict((row["features_json"] or {}).get("feature_flags") or {})
        limits = dict(row["limits_json"] or {})
        limits["max_webhook_destinations"] = (
            CUSTOM_INCLUDED if bool(flags.get("webhook_access")) else MANAGED_COUNT
        )
        bind.execute(t.update().where(t.c.id == row["id"]).values(limits_json=limits))


def downgrade() -> None:
    bind = op.get_bind()
    t = _tier_table()
    rows = bind.execute(sa.select(t.c.id, t.c.code, t.c.limits_json)).mappings()
    for row in rows:
        code = str(row["code"])
        limits = dict(row["limits_json"] or {})
        if code in ("free", "starter"):
            limits["max_webhook_destinations"] = 0
        elif code in ("pro", "quant"):
            limits["max_webhook_destinations"] = 6
        else:
            continue
        bind.execute(t.update().where(t.c.id == row["id"]).values(limits_json=limits))
```

- [ ] **Step 2: Run the migration up/down against a test DB**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/alembic upgrade head && .venv/bin/alembic downgrade -1 && .venv/bin/alembic upgrade head`
Expected: no errors; head is `0067`.

- [ ] **Step 3: Add a migration round-trip test**

Append to `tests/unit/test_tier_migrations.py` following the existing test style in that file (it already tests migration revisions — match its harness). Assert that after upgrade, a `free` tier has `max_webhook_destinations == 3` and a `pro` tier has `4`.

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/unit/test_tier_migrations.py -v`
Expected: PASS.

- [ ] **Step 4: Regenerate OpenAPI**

Find the generation command (check `Makefile`/`openapitools.json`/`scripts`): commonly `.venv/bin/python -m app.openapi_spec` or a make target. Run it to refresh `openapi.json`, then diff to confirm only webhook web-alias paths + `allowed_webhook_platforms` changed.

Run: `cd /home/gigachad/cs2cap/cs2c-api && git diff --stat openapi.json`
Expected: `openapi.json` shows the new `/v1/web/account/webhooks*` paths and the capabilities field.

- [ ] **Step 5: Commit**

```bash
cd /home/gigachad/cs2cap/cs2c-api
git add alembic/versions/0067_open_managed_webhook_platforms.py tests/unit/test_tier_migrations.py openapi.json
git commit -m "feat(tiers): migration opening managed webhook platforms + openapi"
```

---

## Task 10: Frontend types

**Files:**
- Modify: `src/lib/api/types.ts`

- [ ] **Step 1: Add webhook types + capabilities field**

In `src/lib/api/types.ts`, add (place near the alert types):

```typescript
export type WebhookPlatform = "discord" | "telegram" | "google_sheets" | "custom";

export interface WebhookEndpointSummary {
  id: string;
  label: string;
  url: string;
  platform: WebhookPlatform;
  secret_last4: string;
  is_active: boolean;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  last_failure_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpointsResponse {
  webhooks: WebhookEndpointSummary[];
}

export interface WebhookCreateRequest {
  label: string;
  url: string;
  platform: WebhookPlatform;
  is_active?: boolean;
}

export interface WebhookUpdateRequest {
  label?: string;
  url?: string;
  platform?: WebhookPlatform;
  is_active?: boolean;
}

export interface WebhookSecretResponse {
  webhook: WebhookEndpointSummary;
  secret: string;
}
```

Add to `AccountCapabilities` (line 604–610):

```typescript
  allowed_webhook_platforms: WebhookPlatform[];
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/gigachad/cs2cap/cs2cap && pnpm exec tsc --noEmit`
Expected: clean (the field is required; if any mock/test object constructs `AccountCapabilities` literally it must add the field — grep `allowed_webhook_platforms` first; if none, no further change).

- [ ] **Step 3: Commit**

```bash
cd /home/gigachad/cs2cap/cs2cap
git add src/lib/api/types.ts
git commit -m "feat(types): webhook endpoint types + allowed_webhook_platforms"
```

---

## Task 11: Frontend API client methods

**Files:**
- Modify: `src/lib/api/client.ts`

- [ ] **Step 1: Add webApi webhook methods**

In `src/lib/api/client.ts`, after `getAlertEvents` (line 378), add (mirror the alert methods; import the new types at the top):

```typescript
  getWebhooks(): Promise<WebhookEndpointsResponse> {
    return request("/v1/web/account/webhooks");
  },

  createWebhook(data: WebhookCreateRequest): Promise<WebhookSecretResponse> {
    return request("/v1/web/account/webhooks", { method: "POST", body: data });
  },

  updateWebhook(webhookId: string, data: WebhookUpdateRequest): Promise<WebhookEndpointSummary> {
    return request(`/v1/web/account/webhooks/${webhookId}`, { method: "PATCH", body: data });
  },

  deleteWebhook(webhookId: string): Promise<unknown> {
    return request(`/v1/web/account/webhooks/${webhookId}`, { method: "DELETE" });
  },

  rotateWebhookSecret(webhookId: string): Promise<WebhookSecretResponse> {
    return request(`/v1/web/account/webhooks/${webhookId}/rotate-secret`, { method: "POST" });
  },
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/gigachad/cs2cap/cs2cap && pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /home/gigachad/cs2cap/cs2cap
git add src/lib/api/client.ts
git commit -m "feat(api-client): webApi webhook CRUD methods"
```

---

## Task 12: Frontend hooks + query key

**Files:**
- Modify: `src/lib/api/hooks.ts`

- [ ] **Step 1: Add the query key**

In `queryKeys` (line 20–33), add:

```typescript
  webhooks: ["webhooks"] as const,
```

- [ ] **Step 2: Add the hooks**

After the alert mutation hooks (after line 224), add (mirror their invalidation; the create/delete also invalidate `account` because alert delivery readiness depends on having a destination):

```typescript
export function useWebhooks() {
  return useQuery<WebhookEndpointsResponse>({
    queryKey: queryKeys.webhooks,
    queryFn: () => webApi.getWebhooks(),
    retry: false,
    staleTime: 30_000,
  });
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WebhookCreateRequest) => webApi.createWebhook(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
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
```

Add the imported type names (`WebhookEndpointsResponse`, `WebhookCreateRequest`, `WebhookUpdateRequest`) to the existing type import block at the top of `hooks.ts`.

- [ ] **Step 3: Typecheck**

Run: `cd /home/gigachad/cs2cap/cs2cap && pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /home/gigachad/cs2cap/cs2cap
git add src/lib/api/hooks.ts
git commit -m "feat(hooks): webhook query + mutation hooks"
```

---

## Task 13: DeliveryIntegrations component

**Files:**
- Create: `src/components/alerts/DeliveryIntegrations.tsx`

- [ ] **Step 1: Build the component**

Create `src/components/alerts/DeliveryIntegrations.tsx`. It receives the account's `allowed_webhook_platforms` and renders one row per platform. Use existing shadcn primitives already imported in `alerts/page.tsx` (`Card`, `Button`, `Input`, `Label`, `Switch`, `Badge`, `DropdownMenu`, icons from `lucide-react`). Mirror the existing alert-card markup style.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, Table2, Webhook, Lock, Copy, MoreHorizontal, Trash2, RefreshCw } from "lucide-react";
import posthog from "posthog-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  useWebhooks,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useRotateWebhookSecretMutation,
} from "@/lib/api";
import type { WebhookEndpointSummary, WebhookPlatform } from "@/lib/api/types";

const PLATFORMS: { id: WebhookPlatform; label: string; icon: typeof Webhook; hint: string }[] = [
  { id: "discord", label: "Discord", icon: MessageCircle, hint: "Paste your Discord channel webhook URL." },
  { id: "telegram", label: "Telegram", icon: Send, hint: "Bot sendMessage URL including ?chat_id=..." },
  { id: "google_sheets", label: "Google Sheets", icon: Table2, hint: "Apps Script web app URL." },
  { id: "custom", label: "Custom webhook", icon: Webhook, hint: "Your own signed HTTPS receiver." },
];

export function DeliveryIntegrations({ allowedPlatforms }: { allowedPlatforms: WebhookPlatform[] }) {
  const { data, isLoading } = useWebhooks();
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const rotateMutation = useRotateWebhookSecretMutation();
  const [revealedSecret, setRevealedSecret] = useState<{ platform: WebhookPlatform; secret: string } | null>(null);

  const byPlatform = new Map<WebhookPlatform, WebhookEndpointSummary>();
  for (const wh of data?.webhooks ?? []) byPlatform.set(wh.platform, wh);

  return (
    <Card className="mb-8 border-border/50 bg-card/50">
      <CardContent className="pt-6">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Delivery Integrations</h2>
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Configure one destination per channel. Fired alerts fan out to every active destination.
        </p>
        <div className="space-y-3">
          {PLATFORMS.map((p) => {
            const allowed = allowedPlatforms.includes(p.id);
            const existing = byPlatform.get(p.id);
            return (
              <PlatformRow
                key={p.id}
                platform={p}
                allowed={allowed}
                existing={existing}
                isLoading={isLoading}
                onCreate={async (label, url) => {
                  const res = await createMutation.mutateAsync({ label, url, platform: p.id, is_active: true });
                  posthog.capture("webhook_created", { platform: p.id });
                  if (p.id === "custom") setRevealedSecret({ platform: p.id, secret: res.secret });
                }}
                onToggle={(checked) => {
                  if (!existing) return;
                  updateMutation.mutate({ webhookId: existing.id, data: { is_active: checked } });
                  posthog.capture("webhook_toggled", { platform: p.id, enabled: checked });
                }}
                onDelete={() => {
                  if (!existing) return;
                  deleteMutation.mutate(existing.id);
                  posthog.capture("webhook_deleted", { platform: p.id });
                }}
                onRotate={async () => {
                  if (!existing) return;
                  const res = await rotateMutation.mutateAsync(existing.id);
                  posthog.capture("webhook_secret_rotated", { platform: p.id });
                  setRevealedSecret({ platform: p.id, secret: res.secret });
                }}
                createError={createMutation.error?.message}
              />
            );
          })}
        </div>
        {revealedSecret && (
          <div className="mt-4 border border-primary/30 bg-primary/5 p-3 font-mono text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span>Signing secret ({revealedSecret.platform}) — shown once. Store it now.</span>
              <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(revealedSecret.secret)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <code className="break-all">{revealedSecret.secret}</code>
            <Button className="mt-2" size="sm" variant="outline" onClick={() => setRevealedSecret(null)}>
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformRow({
  platform,
  allowed,
  existing,
  isLoading,
  onCreate,
  onToggle,
  onDelete,
  onRotate,
  createError,
}: {
  platform: { id: WebhookPlatform; label: string; icon: typeof Webhook; hint: string };
  allowed: boolean;
  existing?: WebhookEndpointSummary;
  isLoading: boolean;
  onCreate: (label: string, url: string) => void;
  onToggle: (checked: boolean) => void;
  onDelete: () => void;
  onRotate: () => void;
  createError?: string;
}) {
  const Icon = platform.icon;
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(platform.label);
  const [url, setUrl] = useState("");

  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{platform.label}</span>
            {existing ? (
              <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-400">Configured</Badge>
            ) : !allowed ? (
              <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Upgrade</Badge>
            ) : null}
          </div>
          {existing ? (
            <p className="truncate text-xs text-muted-foreground">{existing.url} · ••••{existing.secret_last4}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{platform.hint}</p>
          )}
        </div>
        {existing ? (
          <div className="flex items-center gap-3">
            <Switch checked={existing.is_active} onCheckedChange={onToggle} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {platform.id === "custom" && (
                  <DropdownMenuItem onClick={onRotate}>
                    <RefreshCw className="mr-2 h-4 w-4" />Rotate secret
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : allowed ? (
          <Button variant="outline" size="sm" disabled={isLoading} onClick={() => setOpen((v) => !v)}>
            {open ? "Cancel" : "Add"}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/pricing" onClick={() => posthog.capture("webhook_upgrade_clicked", { platform: platform.id })}>
              Upgrade
            </Link>
          </Button>
        )}
      </div>
      {open && allowed && !existing && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <Button
            disabled={!label.trim() || !url.trim()}
            onClick={() => { onCreate(label.trim(), url.trim()); setOpen(false); setUrl(""); }}
          >
            Save
          </Button>
          {createError && <p className="text-xs text-destructive sm:col-span-3">{createError}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the hooks are exported from `@/lib/api`**

Run: `cd /home/gigachad/cs2cap/cs2cap && grep -n "useWebhooks\|useCreateWebhookMutation" src/lib/api/index.ts 2>/dev/null || grep -rn "export.*hooks" src/lib/api/index.ts`
If `src/lib/api` re-exports via an `index.ts`, ensure the new hooks are exported (they are if it does `export * from "./hooks"`). If components import directly from `@/lib/api/hooks`, adjust the import in the component accordingly.

- [ ] **Step 3: Typecheck**

Run: `cd /home/gigachad/cs2cap/cs2cap && pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /home/gigachad/cs2cap/cs2cap
git add src/components/alerts/DeliveryIntegrations.tsx
git commit -m "feat(alerts): DeliveryIntegrations management component"
```

---

## Task 14: Wire the component into the alerts page

**Files:**
- Modify: `src/app/(auth)/alerts/page.tsx`

- [ ] **Step 1: Get the account capabilities**

The page is a client component. Add the account query to read `allowed_webhook_platforms`. Near the other hooks (line 95), add:

```tsx
import { useAccount } from "@/lib/api";
// ...
  const { data: account } = useAccount();
  const allowedPlatforms = account?.capabilities.allowed_webhook_platforms ?? [];
```

> Confirm a `useAccount` hook exists (it should mirror `getAccount`); if the hook is named differently (e.g. `useViewer` returning `ViewerResponse.user.capabilities`), use that instead. Grep: `grep -n "getAccount\|useAccount\|useViewer" src/lib/api/hooks.ts`.

- [ ] **Step 2: Replace the decorative card**

Remove the static "Delivery Integrations" `Card` block (lines 235–258) and the now-unused `alertIntegrations` array (lines 85–90), the `ExternalLink` import if unused. Insert:

```tsx
<DeliveryIntegrations allowedPlatforms={allowedPlatforms} />
```

Add the import:

```tsx
import { DeliveryIntegrations } from "@/components/alerts/DeliveryIntegrations";
```

- [ ] **Step 3: Remove orphaned imports**

Run: `cd /home/gigachad/cs2cap/cs2cap && pnpm lint`
Fix any unused-import errors my changes created (e.g. `MessageCircle`, `Send`, `Table2`, `Webhook`, `ExternalLink` if they were only used by the removed card).

- [ ] **Step 4: Build**

Run: `cd /home/gigachad/cs2cap/cs2cap && pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /home/gigachad/cs2cap/cs2cap
git add "src/app/(auth)/alerts/page.tsx"
git commit -m "feat(alerts): replace decorative integrations card with live management"
```

---

## Task 15: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run backend tests**

Run: `cd /home/gigachad/cs2cap/cs2c-api && .venv/bin/pytest tests/unit/test_tier_features.py tests/unit/services/test_account_webhook_service.py tests/unit/services/test_account_domain_service.py tests/integration/test_account_endpoints.py tests/unit/test_tier_migrations.py -v`
Expected: all PASS.

- [ ] **Step 2: Frontend lint + build**

Run: `cd /home/gigachad/cs2cap/cs2cap && pnpm lint && pnpm build`
Expected: clean.

- [ ] **Step 3: Manual dashboard walk-through**

Per the local-auth notes (cookie `cs2c_access_token` from a prod session), run `pnpm dev` and at `/alerts`:
- As a **Free** session: Discord/Telegram/Sheets show "Add"; Custom shows "Upgrade". Add a Discord destination → row flips to "Configured" with a toggle. Adding a second Discord is impossible (only one row per platform).
- As a **Pro** session: Custom shows "Add"; creating it reveals the one-time secret callout; Rotate secret works.
- Create an alert with only a managed destination on Free → confirm it can be enabled (no "no delivery channel" error).

- [ ] **Step 4: Final review commit (if any fixups)**

```bash
cd /home/gigachad/cs2cap/cs2cap && git add -A && git commit -m "chore: verification fixups" || true
cd /home/gigachad/cs2cap/cs2c-api && git add -A && git commit -m "chore: verification fixups" || true
```

---

## Self-Review Notes

- **Spec §1 (entitlement)** → Tasks 1, 2. **§2 (route gate)** → Task 5. **§3 (uniqueness)** → Tasks 3, 4. **§4 (migration)** → Task 9. **§5 (contract + web aliases)** → Tasks 7, 8, 9 (openapi). **§6 (delivery prereq)** → Task 6. **§7 (backend tests)** → Tasks 1,2,4,8,9. **§8 (FE API)** → Tasks 10–12. **§9 (dashboard)** → Tasks 13, 14. **§10 (FE verify)** → Task 15.
- **Type consistency:** `WebhookPlatform`, `WebhookEndpointSummary`, `WebhookCreateRequest`, `WebhookUpdateRequest`, `WebhookSecretResponse`, `WebhookEndpointsResponse` defined in Task 10 and reused verbatim in Tasks 11–13. `tier_allowed_webhook_platforms` (Task 2) reused in Tasks 5, 7. `WebhookPlatformExistsError` (Task 4) reused in Task 5. `allowed_webhook_platforms_for_flags` (Task 1) reused in Tasks 2, 5.
- **Assumptions to verify during execution** (flagged inline): exact pytest fixture names in `cs2c-api` tests; the `clone_api_route` helper name; the OpenAPI generation command; whether `@/lib/api` re-exports hooks via `index.ts`; the account hook name (`useAccount` vs `useViewer`).
