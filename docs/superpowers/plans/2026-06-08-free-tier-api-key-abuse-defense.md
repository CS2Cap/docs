# Free-tier API-key Abuse Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop free-tier users from multiplying their 1,000 req/mo API quota by creating many throwaway accounts, by blocking disposable-email verification (L1) and capping API-key issuance velocity per device/IP (L2).

**Architecture:** L1 adds an `assert_deliverable_email_domain` gate at the email add/verify endpoints in `cs2c-api`, backed by a vendored disposable-domain list plus an admin-editable override table. L2 adds a Redis sliding-window velocity check at the key-issuance endpoints, fingerprinting on a first-party `cs2c_device_id` cookie (set + forwarded by the `cs2cap` proxy) with client IP as fallback. Layer 3 (quota-pooling) is out of scope.

**Tech Stack:** FastAPI + SQLAlchemy (async) + Alembic + Redis (`redis.asyncio`) + Prometheus client (backend, `cs2c-api`); Next.js 16 App Router proxy route (frontend, `cs2cap`). Tests: pytest (backend); `pnpm lint`/`pnpm build` only (frontend has no test runner).

**Repos & paths:**
- Backend: `/home/gigachad/cs2cap/cs2c-api`
- Frontend: `/home/gigachad/cs2cap/cs2cap`

**CI gates (backend, must pass before each backend commit):** `mypy` strict, and every new Pydantic schema property must carry `Field(description=...)`. There are no new response schemas in this plan, but run `mypy src/app` regardless.

**Spec:** `docs/superpowers/specs/2026-06-08-free-tier-api-key-abuse-defense-design.md`

---

## File Structure

**Phase 1 — L1 disposable-email blocking (backend, standalone shippable):**
- Create `cs2c-api/src/app/data/disposable_email_domains.txt` — vendored denylist asset.
- Create `cs2c-api/src/app/services/account/email_domain_policy.py` — domain extraction, static list loader, override cache, MX check, `assert_deliverable_email_domain`.
- Modify `cs2c-api/src/app/db_base.py` — add `EmailDomainRule` model.
- Create `cs2c-api/alembic/versions/0072_add_email_domain_rules.py` — migration.
- Modify `cs2c-api/src/app/error_codes.py` — add `EMAIL_DOMAIN_NOT_ALLOWED`.
- Modify `cs2c-api/src/app/metrics.py` — add `EMAIL_DOMAIN_BLOCKED_TOTAL`.
- Modify `cs2c-api/src/app/settings.py` — add `EMAIL_MX_CHECK_ENABLED`.
- Modify `cs2c-api/src/app/api/account.py` — wire validator into `set_missing_email` + `change_email`.
- Modify `cs2c-api/src/app/services/email/email_verification_service.py` — defensive validator call in `send_email_change`.

**Phase 2 — L2 velocity cap (backend, standalone shippable, IP-only until Phase 3):**
- Create `cs2c-api/src/app/services/account/key_issuance_velocity.py` — Redis velocity check.
- Modify `cs2c-api/src/app/error_codes.py` — add `RATE_LIMIT_KEY_ISSUANCE_VELOCITY`.
- Modify `cs2c-api/src/app/metrics.py` — add `KEY_ISSUANCE_VELOCITY_BLOCKED_TOTAL`.
- Modify `cs2c-api/src/app/settings.py` — add `KEY_ISSUANCE_MAX_ACCOUNTS_PER_DAY` / `_PER_MONTH`.
- Modify `cs2c-api/src/app/api/account.py` — wire velocity check into `reissue_key` + `create_sub_key`.

**Phase 3 — L2 device signal (frontend):**
- Modify `cs2cap/src/lib/api/config.ts` — add `WEB_DEVICE_ID_COOKIE_NAME`.
- Modify `cs2cap/src/app/api/cs2c/[...path]/route.ts` — forward + set device cookie.

---

## Phase 1 — Layer 1: Disposable-email blocking

### Task 1: Vendor disposable-domain list + static loader

**Files:**
- Create: `cs2c-api/src/app/data/disposable_email_domains.txt`
- Create: `cs2c-api/src/app/services/account/email_domain_policy.py`
- Test: `cs2c-api/tests/unit/test_email_domain_policy.py`

- [ ] **Step 1: Download the vendored denylist**

Run from `cs2c-api/`:
```bash
mkdir -p src/app/data
curl -fsSL https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt \
  -o src/app/data/disposable_email_domains.txt
wc -l src/app/data/disposable_email_domains.txt
```
Expected: a file with tens of thousands of lines (one lowercase domain per line).

- [ ] **Step 2: Write the failing test**

Create `cs2c-api/tests/unit/test_email_domain_policy.py`:
```python
from app.services.account.email_domain_policy import (
    STATIC_DISPOSABLE_DOMAINS,
    extract_domain,
)


def test_extract_domain_lowercases_and_strips() -> None:
    assert extract_domain("  USER@Mailinator.COM ") == "mailinator.com"


def test_extract_domain_handles_plus_addressing() -> None:
    assert extract_domain("alice+tag@gmail.com") == "gmail.com"


def test_extract_domain_empty_when_no_at() -> None:
    assert extract_domain("not-an-email") == ""


def test_static_denylist_loaded_and_contains_known_disposable() -> None:
    assert len(STATIC_DISPOSABLE_DOMAINS) > 1000
    assert "mailinator.com" in STATIC_DISPOSABLE_DOMAINS
    assert "gmail.com" not in STATIC_DISPOSABLE_DOMAINS
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd cs2c-api && pytest tests/unit/test_email_domain_policy.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.account.email_domain_policy'`.

- [ ] **Step 4: Write the module (static portion)**

Create `cs2c-api/src/app/services/account/email_domain_policy.py`:
```python
"""Email-domain deliverability policy for API-key issuance gating.

Blocks disposable / temp-mail domains at the point a user submits an email to be
verified, defeating free-tier quota multiplication via throwaway accounts.
"""

from __future__ import annotations

from pathlib import Path

_DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "disposable_email_domains.txt"


def _load_static_denylist() -> frozenset[str]:
    try:
        text = _DATA_FILE.read_text(encoding="utf-8")
    except FileNotFoundError:
        return frozenset()
    return frozenset(
        line.strip().lower()
        for line in text.splitlines()
        if line.strip() and not line.startswith("#")
    )


STATIC_DISPOSABLE_DOMAINS: frozenset[str] = _load_static_denylist()


def extract_domain(email: str) -> str:
    """Return the lowercased domain part of an email, or '' if absent."""
    _, sep, domain = email.strip().rpartition("@")
    if not sep:
        return ""
    return domain.strip().lower()
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd cs2c-api && pytest tests/unit/test_email_domain_policy.py -v`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd cs2c-api
git add src/app/data/disposable_email_domains.txt src/app/services/account/email_domain_policy.py tests/unit/test_email_domain_policy.py
git commit -m "feat(account): vendor disposable-email denylist + domain extractor"
```

---

### Task 2: `EmailDomainRule` model + migration

**Files:**
- Modify: `cs2c-api/src/app/db_base.py` (add model near other small tables)
- Create: `cs2c-api/alembic/versions/0072_add_email_domain_rules.py`
- Test: `cs2c-api/tests/unit/test_email_domain_rule_model.py`

- [ ] **Step 1: Write the failing test**

Create `cs2c-api/tests/unit/test_email_domain_rule_model.py`:
```python
from app.db_base import EmailDomainRule


def test_email_domain_rule_table_shape() -> None:
    cols = EmailDomainRule.__table__.columns
    assert EmailDomainRule.__tablename__ == "email_domain_rules"
    assert "domain" in cols
    assert cols["domain"].primary_key is True
    assert "action" in cols
    assert "note" in cols
    assert "created_at" in cols
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cs2c-api && pytest tests/unit/test_email_domain_rule_model.py -v`
Expected: FAIL with `ImportError: cannot import name 'EmailDomainRule'`.

- [ ] **Step 3: Add the model**

In `cs2c-api/src/app/db_base.py`, add (place it just before `class APIKey(Base)` at line ~1124; confirm `String`, `Text`, `DateTime`, `Mapped`, `mapped_column`, `sa`, `datetime` are already imported in this file — they are):
```python
class EmailDomainRule(Base):
    """Admin-editable allow/deny overrides for email-domain deliverability checks."""

    __tablename__ = "email_domain_rules"

    domain: Mapped[str] = mapped_column(String(255), primary_key=True)
    action: Mapped[str] = mapped_column(String(8), nullable=False)  # 'deny' | 'allow'
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )
```

- [ ] **Step 4: Run model test to verify it passes**

Run: `cd cs2c-api && pytest tests/unit/test_email_domain_rule_model.py -v`
Expected: PASS.

- [ ] **Step 5: Write the migration**

Create `cs2c-api/alembic/versions/0072_add_email_domain_rules.py` (match the existing numbered style; `down_revision` chains from the current head `0071`):
```python
"""add email_domain_rules

Revision ID: 0072
Revises: 0071
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0072"
down_revision = "0071"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_domain_rules",
        sa.Column("domain", sa.String(length=255), primary_key=True),
        sa.Column("action", sa.String(length=8), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("email_domain_rules")
```

NOTE: confirm `0071` is still the head before committing: `cd cs2c-api && grep -rl "down_revision" alembic/versions | xargs grep -l "revision = \"0071\"" ` and that no file already has `down_revision = "0071"`. If the head moved, update `down_revision` accordingly.

- [ ] **Step 6: Run the migration test suite to verify chain integrity**

Run: `cd cs2c-api && pytest tests/unit/test_alembic_migrations.py -v`
Expected: PASS (this suite validates the revision chain has a single head).

- [ ] **Step 7: Commit**

```bash
cd cs2c-api
git add src/app/db_base.py alembic/versions/0072_add_email_domain_rules.py tests/unit/test_email_domain_rule_model.py
git commit -m "feat(account): add email_domain_rules override table + migration"
```

---

### Task 3: `assert_deliverable_email_domain` validator (overrides + static + optional MX)

**Files:**
- Modify: `cs2c-api/src/app/metrics.py`
- Modify: `cs2c-api/src/app/settings.py`
- Modify: `cs2c-api/src/app/services/account/email_domain_policy.py`
- Test: `cs2c-api/tests/unit/test_email_domain_policy.py` (extend)

- [ ] **Step 1: Add the metric**

In `cs2c-api/src/app/metrics.py`, after an existing `Counter(...)` block, add:
```python
EMAIL_DOMAIN_BLOCKED_TOTAL = Counter(
    "email_domain_blocked_total",
    "Email submissions blocked as disposable or non-deliverable",
    labelnames=("source",),
)
```

- [ ] **Step 2: Add the setting**

In `cs2c-api/src/app/settings.py`, inside `class Settings(BaseSettings)`, add alongside the other flags:
```python
    EMAIL_MX_CHECK_ENABLED: bool = False
```

- [ ] **Step 3: Write the failing tests**

Append to `cs2c-api/tests/unit/test_email_domain_policy.py`:
```python
import pytest

from app.services.account.email_domain_policy import (
    DisposableEmailDomainError,
    assert_deliverable_email_domain,
    reset_override_cache,
)


class _FakeResult:
    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    def scalars(self) -> "_FakeResult":
        return self

    def all(self) -> list[object]:
        return self._rows


class _Rule:
    def __init__(self, domain: str, action: str) -> None:
        self.domain = domain
        self.action = action


class _FakeDB:
    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    async def execute(self, _stmt: object) -> _FakeResult:
        return _FakeResult(self._rows)


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    reset_override_cache()


async def test_allows_normal_domain() -> None:
    await assert_deliverable_email_domain(_FakeDB([]), email="a@gmail.com")


async def test_blocks_static_disposable() -> None:
    with pytest.raises(DisposableEmailDomainError):
        await assert_deliverable_email_domain(_FakeDB([]), email="a@mailinator.com")


async def test_blocks_override_deny() -> None:
    db = _FakeDB([_Rule("evil.example", "deny")])
    with pytest.raises(DisposableEmailDomainError):
        await assert_deliverable_email_domain(db, email="a@evil.example")


async def test_allow_override_beats_static_deny() -> None:
    db = _FakeDB([_Rule("mailinator.com", "allow")])
    await assert_deliverable_email_domain(db, email="a@mailinator.com")


async def test_missing_domain_rejected() -> None:
    with pytest.raises(DisposableEmailDomainError):
        await assert_deliverable_email_domain(_FakeDB([]), email="garbage")
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd cs2c-api && pytest tests/unit/test_email_domain_policy.py -v`
Expected: FAIL with `ImportError: cannot import name 'assert_deliverable_email_domain'`.

- [ ] **Step 5: Implement the validator**

Append to `cs2c-api/src/app/services/account/email_domain_policy.py`:
```python
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_base import EmailDomainRule
from app.metrics import EMAIL_DOMAIN_BLOCKED_TOTAL
from app.redis_client import client
from app.settings import settings

_OVERRIDE_CACHE_TTL_SEC = 60.0
_override_cache: tuple[float, frozenset[str], frozenset[str]] | None = None


class DisposableEmailDomainError(Exception):
    """Raised when an email domain is disposable or not allowed for key issuance."""


def reset_override_cache() -> None:
    """Test hook: clear the in-process override cache."""
    global _override_cache
    _override_cache = None


async def _load_overrides(db: AsyncSession) -> tuple[frozenset[str], frozenset[str]]:
    global _override_cache
    now = time.monotonic()
    if _override_cache is not None and now - _override_cache[0] < _OVERRIDE_CACHE_TTL_SEC:
        return _override_cache[1], _override_cache[2]
    rows = (await db.execute(select(EmailDomainRule))).scalars().all()
    deny = frozenset(r.domain.lower() for r in rows if r.action == "deny")
    allow = frozenset(r.domain.lower() for r in rows if r.action == "allow")
    _override_cache = (now, deny, allow)
    return deny, allow


async def _has_mx_record(domain: str) -> bool:
    redis = client()
    cache_key = f"emailmx:{domain}"
    cached = await redis.get(cache_key)
    if cached is not None:
        return cached == "1"
    try:
        import dns.asyncresolver  # lazy import; dependency only needed when enabled
        import dns.resolver

        answers = await dns.asyncresolver.resolve(domain, "MX")
        has_mx = len(answers) > 0
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
        has_mx = False
    except Exception:
        return True  # fail open on resolver/timeout errors
    await redis.set(cache_key, "1" if has_mx else "0", ex=86_400)
    return has_mx


async def assert_deliverable_email_domain(db: AsyncSession, *, email: str) -> None:
    """Raise DisposableEmailDomainError if the email's domain may not mint a key."""
    domain = extract_domain(email)
    if not domain:
        raise DisposableEmailDomainError("missing_domain")

    deny_overrides, allow_overrides = await _load_overrides(db)
    if domain in allow_overrides:
        return
    if domain in deny_overrides:
        EMAIL_DOMAIN_BLOCKED_TOTAL.labels(source="override").inc()
        raise DisposableEmailDomainError(domain)
    if domain in STATIC_DISPOSABLE_DOMAINS:
        EMAIL_DOMAIN_BLOCKED_TOTAL.labels(source="static").inc()
        raise DisposableEmailDomainError(domain)
    if settings.EMAIL_MX_CHECK_ENABLED and not await _has_mx_record(domain):
        EMAIL_DOMAIN_BLOCKED_TOTAL.labels(source="mx").inc()
        raise DisposableEmailDomainError(domain)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd cs2c-api && pytest tests/unit/test_email_domain_policy.py -v`
Expected: PASS (all 9 tests). MX path is not exercised here because `EMAIL_MX_CHECK_ENABLED` defaults False.

- [ ] **Step 7: Typecheck**

Run: `cd cs2c-api && mypy src/app/services/account/email_domain_policy.py`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd cs2c-api
git add src/app/services/account/email_domain_policy.py src/app/metrics.py src/app/settings.py tests/unit/test_email_domain_policy.py
git commit -m "feat(account): disposable-email validator with override + optional MX"
```

---

### Task 4: Wire validator into email endpoints + error code

**Files:**
- Modify: `cs2c-api/src/app/error_codes.py`
- Modify: `cs2c-api/src/app/api/account.py` (`set_missing_email` ~1821, `change_email` ~1907)
- Modify: `cs2c-api/src/app/services/email/email_verification_service.py` (`send_email_change` ~128)
- Test: `cs2c-api/tests/integration/test_email_domain_block.py`

- [ ] **Step 1: Add the error code**

In `cs2c-api/src/app/error_codes.py`, inside `class ErrorCode(StrEnum)`, add near `EMAIL_ALREADY_SET`:
```python
    EMAIL_DOMAIN_NOT_ALLOWED = "EMAIL_DOMAIN_NOT_ALLOWED"
```

- [ ] **Step 2: Write the failing integration test**

Create `cs2c-api/tests/integration/test_email_domain_block.py`:
```python
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def test_set_missing_email_rejects_disposable(
    client: AsyncClient,
    override_auth: object,
    override_db_session: object,
) -> None:
    resp = await client.post("/v1/account/email", json={"email": "x@mailinator.com"})
    assert resp.status_code == 422
    assert resp.json()["code"] == "EMAIL_DOMAIN_NOT_ALLOWED"
```

NOTE: `override_auth` and `override_db_session` are existing conftest fixtures. `override_db_session` returns an `AsyncMock`; ensure `_load_overrides`'s `db.execute(...).scalars().all()` returns an empty list under the mock. If the mock returns a non-iterable by default, add to the test body before the request:
```python
    from unittest.mock import MagicMock
    scalars = MagicMock()
    scalars.all.return_value = []
    result = MagicMock()
    result.scalars.return_value = scalars
    override_db_session.execute.return_value = result
    from app.services.account.email_domain_policy import reset_override_cache
    reset_override_cache()
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd cs2c-api && pytest tests/integration/test_email_domain_block.py -v`
Expected: FAIL — currently returns 200/409 path, not 422.

- [ ] **Step 4: Wire the validator into `set_missing_email`**

In `cs2c-api/src/app/api/account.py`, add the import near the other `app.services.account` imports:
```python
from app.services.account.email_domain_policy import (
    DisposableEmailDomainError,
    assert_deliverable_email_domain,
)
```
In `set_missing_email`, immediately after `normalized = normalize_email(str(body.email))`, insert:
```python
    try:
        await assert_deliverable_email_domain(db, email=normalized)
    except DisposableEmailDomainError:
        EMAIL_VERIFICATION_TOTAL.labels(action="set_email", status="disposable_blocked").inc()
        raise AppHTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=ErrorCode.EMAIL_DOMAIN_NOT_ALLOWED,
            detail="Please use a permanent email address to generate an API key.",
        ) from None
```

- [ ] **Step 5: Wire the validator into `change_email`**

In `change_email`, immediately after `normalized = normalize_email(str(body.new_email))`, insert the same block but with the metric label `action="change_email"`:
```python
    try:
        await assert_deliverable_email_domain(db, email=normalized)
    except DisposableEmailDomainError:
        EMAIL_VERIFICATION_TOTAL.labels(action="change_email", status="disposable_blocked").inc()
        raise AppHTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=ErrorCode.EMAIL_DOMAIN_NOT_ALLOWED,
            detail="Please use a permanent email address to generate an API key.",
        ) from None
```

- [ ] **Step 6: Defensive call in the service layer**

In `cs2c-api/src/app/services/email/email_verification_service.py`, in `send_email_change`, after `normalized = normalize_email(new_email)`, insert:
```python
    from app.services.account.email_domain_policy import (
        DisposableEmailDomainError,
        assert_deliverable_email_domain,
    )

    try:
        await assert_deliverable_email_domain(db, email=normalized)
    except DisposableEmailDomainError as exc:
        raise EmailConflictError("Email domain is not allowed") from exc
```
(`EmailConflictError` is already defined in this module; the import is local to avoid a circular import at module load.)

- [ ] **Step 7: Run test to verify it passes**

Run: `cd cs2c-api && pytest tests/integration/test_email_domain_block.py -v`
Expected: PASS.

- [ ] **Step 8: Typecheck + full relevant suite**

Run:
```bash
cd cs2c-api
mypy src/app
pytest tests/unit/test_email_domain_policy.py tests/integration/test_email_domain_block.py -v
```
Expected: no mypy errors; tests PASS.

- [ ] **Step 9: Commit**

```bash
cd cs2c-api
git add src/app/error_codes.py src/app/api/account.py src/app/services/email/email_verification_service.py tests/integration/test_email_domain_block.py
git commit -m "feat(account): block disposable email domains at email add/verify (L1)"
```

**Phase 1 is independently shippable here — L1 stops the current abuse method.**

---

## Phase 2 — Layer 2: Key-issuance velocity cap (IP + device)

### Task 5: Velocity service

**Files:**
- Modify: `cs2c-api/src/app/metrics.py`
- Modify: `cs2c-api/src/app/settings.py`
- Create: `cs2c-api/src/app/services/account/key_issuance_velocity.py`
- Test: `cs2c-api/tests/unit/test_key_issuance_velocity.py`

- [ ] **Step 1: Add the metric**

In `cs2c-api/src/app/metrics.py`, add:
```python
KEY_ISSUANCE_VELOCITY_BLOCKED_TOTAL = Counter(
    "key_issuance_velocity_blocked_total",
    "API-key issuances blocked by per-fingerprint velocity cap",
    labelnames=("signal", "window"),
)
```

- [ ] **Step 2: Add the settings**

In `cs2c-api/src/app/settings.py`, inside `class Settings(BaseSettings)`:
```python
    KEY_ISSUANCE_MAX_ACCOUNTS_PER_DAY: int = 2
    KEY_ISSUANCE_MAX_ACCOUNTS_PER_MONTH: int = 4
```

- [ ] **Step 3: Write the failing tests**

Create `cs2c-api/tests/unit/test_key_issuance_velocity.py`:
```python
from uuid import uuid4

import pytest

from app.services.account.key_issuance_velocity import (
    KeyIssuanceVelocityError,
    enforce_key_issuance_velocity,
)


@pytest.fixture(autouse=True)
def _redis(mock_redis_client: object) -> object:
    # mock_redis_client points app.redis_client.client() at an in-memory fake.
    return mock_redis_client


async def test_no_signal_is_allowed() -> None:
    await enforce_key_issuance_velocity(user_id=uuid4(), device_id=None, ip=None)


async def test_third_distinct_account_same_device_blocked_in_24h() -> None:
    dev = "device-abc"
    await enforce_key_issuance_velocity(user_id=uuid4(), device_id=dev, ip="1.1.1.1")
    await enforce_key_issuance_velocity(user_id=uuid4(), device_id=dev, ip="1.1.1.1")
    with pytest.raises(KeyIssuanceVelocityError):
        await enforce_key_issuance_velocity(user_id=uuid4(), device_id=dev, ip="1.1.1.1")


async def test_same_user_reissue_not_penalized() -> None:
    dev = "device-xyz"
    uid = uuid4()
    for _ in range(5):
        await enforce_key_issuance_velocity(user_id=uid, device_id=dev, ip="2.2.2.2")
    # Same single account re-minting many times never trips the cap.


async def test_ip_fallback_used_when_no_device() -> None:
    ip = "9.9.9.9"
    await enforce_key_issuance_velocity(user_id=uuid4(), device_id=None, ip=ip)
    await enforce_key_issuance_velocity(user_id=uuid4(), device_id=None, ip=ip)
    with pytest.raises(KeyIssuanceVelocityError):
        await enforce_key_issuance_velocity(user_id=uuid4(), device_id=None, ip=ip)
```

NOTE: `mock_redis_client` is the existing conftest fixture that backs `app.redis_client.client()` with an in-memory fake supporting `zadd/zcount/zscore/zremrangebyscore/expire`. If a needed command is missing from the fake, use the `fake_redis` fixture instead and `monkeypatch` `app.services.account.key_issuance_velocity.client` to return it.

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd cs2c-api && pytest tests/unit/test_key_issuance_velocity.py -v`
Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 5: Implement the service**

Create `cs2c-api/src/app/services/account/key_issuance_velocity.py`:
```python
"""Per-device/IP velocity cap on API-key issuance (Sybil resistance).

Counts distinct accounts that have minted a key from the same device fingerprint
(or IP fallback) within rolling 24h / 30d windows, using a Redis sorted set whose
members are user ids and scores are the last-mint timestamp (ms). Re-minting by an
already-counted account refreshes its score and never inflates the distinct count.
"""

from __future__ import annotations

from time import time_ns
from uuid import UUID

from app.metrics import KEY_ISSUANCE_VELOCITY_BLOCKED_TOTAL
from app.redis_client import client
from app.settings import settings

_DAY_MS = 86_400_000
_RETENTION_SEC = 30 * 24 * 60 * 60


class KeyIssuanceVelocityError(Exception):
    """Raised when key issuance exceeds the per-fingerprint velocity cap."""

    def __init__(self, signal: str) -> None:
        self.signal = signal
        super().__init__(signal)


def _fingerprint(device_id: str | None, ip: str | None) -> tuple[str, str] | None:
    if device_id:
        return "device", f"dev:{device_id}"
    if ip:
        return "ip", f"ip:{ip}"
    return None


async def enforce_key_issuance_velocity(
    *,
    user_id: UUID,
    device_id: str | None,
    ip: str | None,
) -> None:
    fp = _fingerprint(device_id, ip)
    if fp is None:
        return  # no usable signal — allow

    signal, fp_key = fp
    redis = client()
    key = f"keyvelocity:{fp_key}"
    now_ms = time_ns() // 1_000_000
    win24 = now_ms - _DAY_MS
    win30 = now_ms - 30 * _DAY_MS

    await redis.zremrangebyscore(key, 0, win30)

    existing = await redis.zscore(key, str(user_id))
    known_recent = existing is not None and float(existing) >= win30
    if not known_recent:
        count24 = await redis.zcount(key, win24, now_ms)
        if count24 >= settings.KEY_ISSUANCE_MAX_ACCOUNTS_PER_DAY:
            KEY_ISSUANCE_VELOCITY_BLOCKED_TOTAL.labels(signal=signal, window="24h").inc()
            raise KeyIssuanceVelocityError(signal)
        count30 = await redis.zcount(key, win30, now_ms)
        if count30 >= settings.KEY_ISSUANCE_MAX_ACCOUNTS_PER_MONTH:
            KEY_ISSUANCE_VELOCITY_BLOCKED_TOTAL.labels(signal=signal, window="30d").inc()
            raise KeyIssuanceVelocityError(signal)

    await redis.zadd(key, {str(user_id): now_ms})
    await redis.expire(key, _RETENTION_SEC)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd cs2c-api && pytest tests/unit/test_key_issuance_velocity.py -v`
Expected: PASS (4 tests).

- [ ] **Step 7: Typecheck**

Run: `cd cs2c-api && mypy src/app/services/account/key_issuance_velocity.py`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd cs2c-api
git add src/app/services/account/key_issuance_velocity.py src/app/metrics.py src/app/settings.py tests/unit/test_key_issuance_velocity.py
git commit -m "feat(account): per-device/IP API-key issuance velocity service (L2)"
```

---

### Task 6: Wire velocity check into key-issuance endpoints

**Files:**
- Modify: `cs2c-api/src/app/error_codes.py`
- Modify: `cs2c-api/src/app/api/account.py` (`reissue_key` ~651, `create_sub_key` ~734)
- Test: `cs2c-api/tests/integration/test_key_issuance_velocity_http.py`

- [ ] **Step 1: Add the error code**

In `cs2c-api/src/app/error_codes.py`, inside `class ErrorCode(StrEnum)`, near the other `RATE_LIMIT_*` entries:
```python
    RATE_LIMIT_KEY_ISSUANCE_VELOCITY = "RATE_LIMIT_KEY_ISSUANCE_VELOCITY"
```

- [ ] **Step 2: Write the failing integration test**

Create `cs2c-api/tests/integration/test_key_issuance_velocity_http.py`:
```python
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def test_reissue_blocked_after_velocity_cap(
    client: AsyncClient,
    override_auth: object,
    override_db_session: object,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _boom(**_: object) -> None:
        from app.services.account.key_issuance_velocity import KeyIssuanceVelocityError

        raise KeyIssuanceVelocityError("device")

    monkeypatch.setattr(
        "app.api.account.enforce_key_issuance_velocity", _boom, raising=True
    )

    resp = await client.post(
        "/v1/account/key/reissue", headers={"x-cs2c-device-id": "dev-1"}
    )
    assert resp.status_code == 429
    assert resp.json()["code"] == "RATE_LIMIT_KEY_ISSUANCE_VELOCITY"
```

NOTE: this test stubs the velocity function so it does not depend on Redis or the email-verification gate passing. If `_require_verified_email_for_key_generation` rejects first (because the mock user lacks `email_verified_at`), also stub it:
```python
    async def _ok(*_: object, **__: object) -> None:
        return None

    monkeypatch.setattr(
        "app.api.account._require_verified_email_for_key_generation", _ok, raising=True
    )
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd cs2c-api && pytest tests/integration/test_key_issuance_velocity_http.py -v`
Expected: FAIL — endpoint does not yet call the velocity check (no 429).

- [ ] **Step 4: Add imports to account.py**

In `cs2c-api/src/app/api/account.py`, add:
```python
from app.request_ip import extract_client_ip
from app.services.account.key_issuance_velocity import (
    KeyIssuanceVelocityError,
    enforce_key_issuance_velocity,
)
```
Confirm `Request` is imported from `fastapi` at the top of the file; if not, add it to the existing `from fastapi import ...` line.

- [ ] **Step 5: Define a shared helper near the other key guards (~line 344)**

In `cs2c-api/src/app/api/account.py`, after `_require_verified_email_for_key_generation`, add:
```python
async def _enforce_key_issuance_velocity_or_429(
    *, request: Request, user: AuthenticatedUser
) -> None:
    device_id = request.headers.get("x-cs2c-device-id")
    client_ip = extract_client_ip(request)
    try:
        await enforce_key_issuance_velocity(
            user_id=UUID(user.user_id), device_id=device_id, ip=client_ip
        )
    except KeyIssuanceVelocityError:
        raise AppHTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code=ErrorCode.RATE_LIMIT_KEY_ISSUANCE_VELOCITY,
            detail=(
                "An account from this device already has an API key. "
                "Contact support if you need another."
            ),
        ) from None
```

- [ ] **Step 6: Call it in `reissue_key`**

Add `request: Request` to the `reissue_key` signature (place it first, before `user`):
```python
async def reissue_key(
    request: Request,
    user: Annotated[AuthenticatedUser, Depends(require_api_key)],
    db: Annotated[AsyncSession, Depends(get_session)],
    response: Response,
) -> APIKeyReissueResponse:
```
Then, immediately after `await _require_verified_email_for_key_generation(db, user=user)`:
```python
    await _enforce_key_issuance_velocity_or_429(request=request, user=user)
```

- [ ] **Step 7: Call it in `create_sub_key`**

Add `request: Request` to the `create_sub_key` signature (place it after `body`):
```python
async def create_sub_key(
    body: ChildAPIKeyCreateRequest,
    request: Request,
    user: Annotated[AuthenticatedUser, Depends(require_api_key)],
    db: Annotated[AsyncSession, Depends(get_session)],
    response: Response,
) -> ChildAPIKeyCreateResponse:
```
Then, immediately after `await _require_verified_email_for_key_generation(db, user=user)`:
```python
    await _enforce_key_issuance_velocity_or_429(request=request, user=user)
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd cs2c-api && pytest tests/integration/test_key_issuance_velocity_http.py -v`
Expected: PASS.

- [ ] **Step 9: Typecheck + regression on existing key tests**

Run:
```bash
cd cs2c-api
mypy src/app
pytest tests/integration/test_key_issuance_velocity_http.py tests/integration/test_auth.py -v
```
Expected: no mypy errors; tests PASS. (Adding `request: Request` is a non-breaking FastAPI signature change.)

- [ ] **Step 10: Commit**

```bash
cd cs2c-api
git add src/app/error_codes.py src/app/api/account.py tests/integration/test_key_issuance_velocity_http.py
git commit -m "feat(account): enforce key-issuance velocity cap on reissue + sub-key (L2)"
```

**Phase 2 is shippable here — velocity capping works on IP immediately; the device cookie (Phase 3) sharpens it.**

---

## Phase 3 — Device signal (frontend, `cs2cap`)

### Task 7: Set + forward `cs2c_device_id` through the proxy

**Files:**
- Modify: `cs2cap/src/lib/api/config.ts`
- Modify: `cs2cap/src/app/api/cs2c/[...path]/route.ts`

(No JS test runner in this repo — verify with lint + build.)

- [ ] **Step 1: Add the cookie-name constant**

In `cs2cap/src/lib/api/config.ts`, after `WEB_AUTH_TOKEN_COOKIE_NAME`:
```typescript
export const WEB_DEVICE_ID_COOKIE_NAME = "cs2c_device_id";
```

- [ ] **Step 2: Import it in the proxy route**

In `cs2cap/src/app/api/cs2c/[...path]/route.ts`, extend the config import:
```typescript
import {
  API_BASE_URL,
  WEB_AUTH_TOKEN_COOKIE_NAME,
  WEB_DEVICE_ID_COOKIE_NAME,
  WEB_SESSION_COOKIE_NAME,
} from "@/lib/api/config";
```

- [ ] **Step 3: Forward the device id upstream**

In `proxyRequest`, after the `sessionCookie` block that sets the `cookie` header, add:
```typescript
  const deviceId = request.cookies.get(WEB_DEVICE_ID_COOKIE_NAME)?.value;
  if (deviceId) {
    headers.set("x-cs2c-device-id", deviceId);
  }
```

- [ ] **Step 4: Set the device cookie on the response when missing**

Just before `return response;` at the end of `proxyRequest` (after the existing logout-cookie block), add:
```typescript
  if (!deviceId) {
    response.cookies.set({
      name: WEB_DEVICE_ID_COOKIE_NAME,
      value: crypto.randomUUID(),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
```

- [ ] **Step 5: Lint + build to verify**

Run:
```bash
cd cs2cap
pnpm lint
pnpm build
```
Expected: lint clean; build succeeds.

- [ ] **Step 6: Commit**

```bash
cd cs2cap
git add src/lib/api/config.ts "src/app/api/cs2c/[...path]/route.ts"
git commit -m "feat(proxy): set + forward cs2c_device_id for key-issuance velocity (L2)"
```

---

## Manual verification (after all phases)

- [ ] **L1:** With the API running, call `POST /v1/account/email` with `{"email":"x@mailinator.com"}` on a fresh OAuth account → expect `422` + `code: EMAIL_DOMAIN_NOT_ALLOWED`. Repeat with a real Gmail address → expect the normal verification-email flow.
- [ ] **L1 override:** Insert `('mailinator.com','allow',null,now())` into `email_domain_rules`, wait ~60s (cache TTL), retry the disposable address → now allowed. Remove the row afterward.
- [ ] **L2:** From one browser (same `cs2c_device_id` cookie), create 3 separate accounts and try to mint a key on each within 24h → the 3rd `POST /v1/account/key/reissue` returns `429` + `code: RATE_LIMIT_KEY_ISSUANCE_VELOCITY`. Re-minting on an already-counted account never trips it.
- [ ] **Metrics:** `email_domain_blocked_total` and `key_issuance_velocity_blocked_total` increment on the `/metrics` endpoint.

## Spec coverage check

- L1 disposable blocking at email add/verify → Tasks 1–4. ✓
- Static list + DB override table with allow-precedence → Tasks 1, 2, 3. ✓
- Optional MX check, default off, fail-open → Task 3. ✓
- 422 friendly error → Task 4. ✓
- L2 device cookie + proxy forward + IP fallback → Tasks 5, 6, 7. ✓
- Velocity thresholds (>2/24h, >4/30d), env-configurable → Task 5 (defaults 2 / 4). ✓
- Distinct-account counting; re-mint not penalized → Task 5. ✓
- 429 friendly error → Task 6. ✓
- Prometheus counters + structured signal → Tasks 3, 5. ✓
- CI gates (mypy) → run in Tasks 3, 4, 6. ✓
- Layer 3 quota-pooling → intentionally out of scope. ✓
