# Consent Record Foundation (SP1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add versioned policy-acceptance tracking — a `user_consent_records` audit log written at signup and via a session-authenticated consent surface — plus export/deletion integration and a rewired marketing-consent toggle.

**Architecture:** A backend constant (`policy_versions.py`) is the source of truth for current ToS/Privacy versions, exposed via a public endpoint. An append-only `user_consent_records` table records every acceptance/marketing event; the latest row per `(user_id, consent_type)` is the current state. A `consent_service` writes signup/explicit rows and computes per-type staleness. Endpoints on the API-key account router are `clone_api_route`'d onto the `/v1/web` session surface (the existing account/export precedent). No blocking — staleness is exposed for SP2.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, pytest/pytest-asyncio; FE is Next.js 16 / React (cs2cap).

## Global Constraints

- mypy `--strict` must pass; `ruff` must pass (cs2c-api CI gates).
- Every new Pydantic schema field MUST have `Field(..., description="...")` (CI gate).
- Latest migration is `0084`; the new migration is `0085`, `down_revision = "0084"`.
- Consent types are plain strings, not a DB enum, so SP2 can add `'analytics'` with no migration. SP1 uses `'tos'`, `'privacy'`, `'marketing'`.
- Policy version string == the policy's `lastUpdated` date; current value is `"2026-04-18"` for both `tos` and `privacy`.
- Reuse the existing `UserAccountPreferences.product_update_emails_enabled` toggle as the marketing preference; do NOT add a duplicate column.
- Model conventions (match `AccountExportJob`): `id` is `PG_UUID(as_uuid=True)` PK with `server_default=sa.text("gen_random_uuid()")`; indexes declared in `__table_args__` via `sa.Index`; FK `ForeignKey("api_users.id", ondelete="CASCADE")`.
- Web-surface clone pattern (match account/export): source endpoints on `account_router` (`prefix="/v1/account"`, included with `v1_session_or_key_dependencies`); clones use `dependencies=web_session_dependencies` and `openapi_security=[{WEB_COOKIE_SECURITY_SCHEME: []}]`.

---

## File Structure

**Create (cs2c-api):**
- `src/app/services/account/policy_versions.py` — current-version registry + helpers.
- `src/app/services/account/consent_service.py` — record/read/serialize consent.
- `tests/unit/services/test_policy_versions.py`
- `tests/unit/services/test_consent_service.py`
- `tests/integration/test_consent_endpoints.py`
- `alembic/versions/0085_add_user_consent_records.py`

**Modify (cs2c-api):**
- `src/app/db_base.py` — add `UserConsentRecord` model.
- `src/app/schemas.py` — add consent + policy-version schemas.
- `src/app/api/account.py` — add `GET`/`POST /v1/account/consent`.
- `src/app/api/account_public.py` — add public `GET /v1/policy-versions`.
- `src/app/main.py` — clone the two consent routes to `/v1/web`; include the public route.
- `src/app/services/auth/oauth_service.py` — thread `user_agent`, record signup consent.
- `src/app/api/web.py` (or wherever `find_or_create_oauth_user` is called) — pass `user_agent`.
- `src/app/services/account/account_export_service.py` — add consent to export payload.
- `src/app/services/account/account_deletion_service.py` — delete consent rows.

**Modify (cs2cap):**
- `src/app/(auth)/.../account` settings component holding the product-update-emails toggle — point it at `POST /v1/web/account/consent`.

---

### Task 1: Policy version registry

**Files:**
- Create: `src/app/services/account/policy_versions.py`
- Test: `tests/unit/services/test_policy_versions.py`

**Interfaces:**
- Produces: `PolicyVersion(version: str, effective_at: date)` (frozen dataclass); `CURRENT_POLICY_VERSIONS: dict[str, PolicyVersion]`; `VERSIONED_CONSENT_TYPES: tuple[str, ...] = ("tos", "privacy")`; `current_version(policy: str) -> str`.

- [ ] **Step 1: Write the failing test**

```python
# tests/unit/services/test_policy_versions.py
from __future__ import annotations

from datetime import date

from app.services.account import policy_versions as pv


def test_current_versions_present_for_tos_and_privacy() -> None:
    assert set(pv.VERSIONED_CONSENT_TYPES) == {"tos", "privacy"}
    for policy in pv.VERSIONED_CONSENT_TYPES:
        entry = pv.CURRENT_POLICY_VERSIONS[policy]
        assert entry.version == "2026-04-18"
        assert entry.effective_at == date(2026, 4, 18)


def test_current_version_helper_returns_version_string() -> None:
    assert pv.current_version("tos") == "2026-04-18"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/unit/services/test_policy_versions.py -v`
Expected: FAIL with `ModuleNotFoundError: app.services.account.policy_versions`.

- [ ] **Step 3: Write minimal implementation**

```python
# src/app/services/account/policy_versions.py
"""Source of truth for current legal-policy versions."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class PolicyVersion:
    version: str  # == the policy's lastUpdated date, e.g. "2026-04-18"
    effective_at: date


CURRENT_POLICY_VERSIONS: dict[str, PolicyVersion] = {
    "tos": PolicyVersion(version="2026-04-18", effective_at=date(2026, 4, 18)),
    "privacy": PolicyVersion(version="2026-04-18", effective_at=date(2026, 4, 18)),
}

VERSIONED_CONSENT_TYPES: tuple[str, ...] = ("tos", "privacy")


def current_version(policy: str) -> str:
    return CURRENT_POLICY_VERSIONS[policy].version
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/unit/services/test_policy_versions.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add src/app/services/account/policy_versions.py tests/unit/services/test_policy_versions.py
git commit -m "feat(consent): add policy version registry"
```

---

### Task 2: `UserConsentRecord` model + migration `0085`

**Files:**
- Modify: `src/app/db_base.py` (add model near other account models)
- Create: `alembic/versions/0085_add_user_consent_records.py`

**Interfaces:**
- Produces: `UserConsentRecord` ORM model with columns `id, user_id, consent_type, version, granted, method, source_ip, user_agent, created_at`; table `user_consent_records`; index `ix_user_consent_user_type_created` on `(user_id, consent_type, created_at DESC)`.

- [ ] **Step 1: Add the model to `db_base.py`**

Place after `UserAccountPreferences`. Uses already-imported `PG_UUID`, `String`, `Boolean`, `DateTime`, `ForeignKey`, `Mapped`, `mapped_column`, `sa`, `datetime`, `UUID`.

```python
class UserConsentRecord(Base):
    """Append-only audit log of policy acceptance and marketing-consent events."""

    __tablename__ = "user_consent_records"

    __table_args__ = (
        sa.Index(
            "ix_user_consent_user_type_created",
            "user_id",
            "consent_type",
            sa.text("created_at DESC"),
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("api_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    consent_type: Mapped[str] = mapped_column(String(16), nullable=False)
    version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    method: Mapped[str] = mapped_column(String(16), nullable=False)
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )
```

- [ ] **Step 2: Create the migration**

```python
# alembic/versions/0085_add_user_consent_records.py
"""Add user_consent_records table + backfill tos/privacy for existing users.

Revision ID: 0085
Revises: 0084
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0085"
down_revision = "0084"
branch_labels = None
depends_on = None

_TABLE = "user_consent_records"
_CURRENT_VERSION = "2026-04-18"  # keep in sync with policy_versions.CURRENT_POLICY_VERSIONS


def upgrade() -> None:
    op.create_table(
        _TABLE,
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("consent_type", sa.String(length=16), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=True),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("method", sa.String(length=16), nullable=False),
        sa.Column("source_ip", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["api_users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_user_consent_user_type_created",
        _TABLE,
        ["user_id", "consent_type", sa.text("created_at DESC")],
    )

    # Backfill: assert every existing user accepted the current tos + privacy.
    op.execute(
        sa.text(
            """
            INSERT INTO user_consent_records
                (id, user_id, consent_type, version, granted, method, created_at)
            SELECT gen_random_uuid(), u.id, ct.consent_type, :version, true, 'backfill', now()
            FROM api_users u
            CROSS JOIN (VALUES ('tos'), ('privacy')) AS ct(consent_type)
            """
        ).bindparams(version=_CURRENT_VERSION)
    )


def downgrade() -> None:
    op.drop_index("ix_user_consent_user_type_created", table_name=_TABLE)
    op.drop_table(_TABLE)
```

- [ ] **Step 3: Apply the migration and verify**

Run: `alembic upgrade head`
Expected: applies `0085`; `\d user_consent_records` shows the table; a backfill row count equals `2 * (number of api_users)`.

Then verify downgrade is clean:
Run: `alembic downgrade -1 && alembic upgrade head`
Expected: both succeed with no error.

- [ ] **Step 4: Run mypy on the model**

Run: `mypy --strict src/app/db_base.py`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/db_base.py alembic/versions/0085_add_user_consent_records.py
git commit -m "feat(consent): add user_consent_records table + backfill migration"
```

---

### Task 3: `consent_service` — signup recording + state read

**Files:**
- Create: `src/app/services/account/consent_service.py`
- Test: `tests/unit/services/test_consent_service.py`

**Interfaces:**
- Consumes: `policy_versions.CURRENT_POLICY_VERSIONS`, `VERSIONED_CONSENT_TYPES`, `current_version`; `UserConsentRecord`, `APIUser`.
- Produces:
  - `record_signup_consent(db: AsyncSession, user: APIUser, *, ip: str | None, user_agent: str | None) -> None`
  - `ConsentTypeState` dataclass: `consent_type: str`, `version: str | None`, `granted: bool`, `outstanding: bool`, `recorded_at: datetime | None`
  - `get_consent_state(db: AsyncSession, user_id: UUID) -> list[ConsentTypeState]` (one entry per `tos`, `privacy`, `marketing`).

- [ ] **Step 1: Write the failing tests**

```python
# tests/unit/services/test_consent_service.py
from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_base import APITier, APIUser
from app.services.account import consent_service


async def _make_user(db: AsyncSession) -> APIUser:
    tier = APITier(code="free", display_name="Free", quota_requests_per_month=1000,
                   rate_requests_per_minute=60, limit_param_cap=100, currency="USD",
                   monthly_price_cents=0)
    db.add(tier)
    await db.flush()
    user = APIUser(email="u@example.com", display_name="U", tier_id=tier.id)
    db.add(user)
    await db.flush()
    return user


@pytest.mark.asyncio
async def test_record_signup_consent_writes_tos_and_privacy(sqlite_session: AsyncSession) -> None:
    user = await _make_user(sqlite_session)
    await consent_service.record_signup_consent(
        sqlite_session, user, ip="1.2.3.4", user_agent="UA"
    )
    state = {s.consent_type: s for s in await consent_service.get_consent_state(
        sqlite_session, user.id)}
    assert state["tos"].version == "2026-04-18"
    assert state["tos"].granted is True
    assert state["tos"].outstanding is False
    assert state["privacy"].outstanding is False


@pytest.mark.asyncio
async def test_get_consent_state_marks_missing_versioned_as_outstanding(
    sqlite_session: AsyncSession,
) -> None:
    user = await _make_user(sqlite_session)
    # No rows written at all.
    state = {s.consent_type: s for s in await consent_service.get_consent_state(
        sqlite_session, user.id)}
    assert state["tos"].outstanding is True
    assert state["tos"].version is None
    assert state["marketing"].granted is False
    assert state["marketing"].outstanding is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/unit/services/test_consent_service.py -v`
Expected: FAIL with `ModuleNotFoundError: app.services.account.consent_service`.

- [ ] **Step 3: Write minimal implementation**

```python
# src/app/services/account/consent_service.py
"""Record and read user consent (policy acceptance + marketing opt-in)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_base import APIUser, UserConsentRecord
from app.services.account.policy_versions import (
    VERSIONED_CONSENT_TYPES,
    current_version,
)

MARKETING_CONSENT_TYPE = "marketing"
_STATE_TYPES = (*VERSIONED_CONSENT_TYPES, MARKETING_CONSENT_TYPE)


@dataclass(frozen=True)
class ConsentTypeState:
    consent_type: str
    version: str | None
    granted: bool
    outstanding: bool
    recorded_at: datetime | None


async def record_signup_consent(
    db: AsyncSession,
    user: APIUser,
    *,
    ip: str | None,
    user_agent: str | None,
) -> None:
    for policy in VERSIONED_CONSENT_TYPES:
        db.add(
            UserConsentRecord(
                user_id=user.id,
                consent_type=policy,
                version=current_version(policy),
                granted=True,
                method="signup",
                source_ip=ip,
                user_agent=user_agent,
            )
        )
    await db.commit()


async def _latest_records(
    db: AsyncSession, user_id: UUID
) -> dict[str, UserConsentRecord]:
    stmt = (
        select(UserConsentRecord)
        .where(UserConsentRecord.user_id == user_id)
        .order_by(UserConsentRecord.created_at.desc(), UserConsentRecord.id.desc())
    )
    latest: dict[str, UserConsentRecord] = {}
    for row in (await db.execute(stmt)).scalars().all():
        latest.setdefault(row.consent_type, row)
    return latest


async def get_consent_state(db: AsyncSession, user_id: UUID) -> list[ConsentTypeState]:
    latest = await _latest_records(db, user_id)
    states: list[ConsentTypeState] = []
    for consent_type in _STATE_TYPES:
        record = latest.get(consent_type)
        if consent_type in VERSIONED_CONSENT_TYPES:
            accepted = record.version if record else None
            outstanding = accepted != current_version(consent_type)
            states.append(
                ConsentTypeState(
                    consent_type=consent_type,
                    version=accepted,
                    granted=bool(record and record.granted),
                    outstanding=outstanding,
                    recorded_at=record.created_at if record else None,
                )
            )
        else:  # marketing: reflects latest event, never outstanding
            states.append(
                ConsentTypeState(
                    consent_type=consent_type,
                    version=None,
                    granted=bool(record and record.granted),
                    outstanding=False,
                    recorded_at=record.created_at if record else None,
                )
            )
    return states
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/unit/services/test_consent_service.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add src/app/services/account/consent_service.py tests/unit/services/test_consent_service.py
git commit -m "feat(consent): add signup recording + consent state read"
```

---

### Task 4: `consent_service` — explicit recording + export serialization

**Files:**
- Modify: `src/app/services/account/consent_service.py`
- Test: `tests/unit/services/test_consent_service.py` (add cases)

**Interfaces:**
- Consumes: `UserAccountPreferences` (to flip `product_update_emails_enabled`).
- Produces:
  - `record_explicit_consent(db, user_id: UUID, *, accept_policies: list[str], marketing: bool | None, ip: str | None, user_agent: str | None) -> None`
  - `serialize_consent_for_export(db, user_id: UUID) -> list[dict[str, object]]`

- [ ] **Step 1: Write the failing tests**

```python
# add to tests/unit/services/test_consent_service.py
from app.db_base import UserAccountPreferences


@pytest.mark.asyncio
async def test_record_explicit_consent_clears_outstanding(
    sqlite_session: AsyncSession,
) -> None:
    user = await _make_user(sqlite_session)
    await consent_service.record_explicit_consent(
        sqlite_session, user.id, accept_policies=["tos", "privacy"],
        marketing=None, ip=None, user_agent=None,
    )
    state = {s.consent_type: s for s in await consent_service.get_consent_state(
        sqlite_session, user.id)}
    assert state["tos"].outstanding is False


@pytest.mark.asyncio
async def test_marketing_toggle_writes_row_and_flips_pref(
    sqlite_session: AsyncSession,
) -> None:
    user = await _make_user(sqlite_session)
    sqlite_session.add(UserAccountPreferences(user_id=user.id))
    await sqlite_session.flush()

    await consent_service.record_explicit_consent(
        sqlite_session, user.id, accept_policies=[], marketing=True,
        ip=None, user_agent=None,
    )
    state = {s.consent_type: s for s in await consent_service.get_consent_state(
        sqlite_session, user.id)}
    assert state["marketing"].granted is True

    prefs = await sqlite_session.get(UserAccountPreferences, user.id)
    assert prefs is not None and prefs.product_update_emails_enabled is True


@pytest.mark.asyncio
async def test_serialize_consent_for_export_returns_history(
    sqlite_session: AsyncSession,
) -> None:
    user = await _make_user(sqlite_session)
    await consent_service.record_signup_consent(
        sqlite_session, user, ip=None, user_agent=None
    )
    rows = await consent_service.serialize_consent_for_export(sqlite_session, user.id)
    assert {r["consent_type"] for r in rows} == {"tos", "privacy"}
    assert all("created_at" in r for r in rows)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/unit/services/test_consent_service.py -v`
Expected: FAIL with `AttributeError: module ... has no attribute 'record_explicit_consent'`.

- [ ] **Step 3: Write minimal implementation (append to consent_service.py)**

Add the import at the top with the others:

```python
from app.db_base import APIUser, UserAccountPreferences, UserConsentRecord
```

Add functions:

```python
async def record_explicit_consent(
    db: AsyncSession,
    user_id: UUID,
    *,
    accept_policies: list[str],
    marketing: bool | None,
    ip: str | None,
    user_agent: str | None,
) -> None:
    for policy in accept_policies:
        if policy not in VERSIONED_CONSENT_TYPES:
            continue
        db.add(
            UserConsentRecord(
                user_id=user_id,
                consent_type=policy,
                version=current_version(policy),
                granted=True,
                method="explicit",
                source_ip=ip,
                user_agent=user_agent,
            )
        )

    if marketing is not None:
        db.add(
            UserConsentRecord(
                user_id=user_id,
                consent_type=MARKETING_CONSENT_TYPE,
                version=None,
                granted=marketing,
                method="explicit",
                source_ip=ip,
                user_agent=user_agent,
            )
        )
        prefs = await db.get(UserAccountPreferences, user_id)
        if prefs is None:
            prefs = UserAccountPreferences(user_id=user_id)
            db.add(prefs)
        prefs.product_update_emails_enabled = marketing

    await db.commit()


async def serialize_consent_for_export(
    db: AsyncSession, user_id: UUID
) -> list[dict[str, object]]:
    stmt = (
        select(UserConsentRecord)
        .where(UserConsentRecord.user_id == user_id)
        .order_by(UserConsentRecord.created_at.asc())
    )
    return [
        {
            "consent_type": row.consent_type,
            "version": row.version,
            "granted": row.granted,
            "method": row.method,
            "source_ip": row.source_ip,
            "user_agent": row.user_agent,
            "created_at": row.created_at,
        }
        for row in (await db.execute(stmt)).scalars().all()
    ]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/unit/services/test_consent_service.py -v`
Expected: PASS (5 passed total).

- [ ] **Step 5: Typecheck + commit**

Run: `mypy --strict src/app/services/account/consent_service.py`
Expected: no errors.

```bash
git add src/app/services/account/consent_service.py tests/unit/services/test_consent_service.py
git commit -m "feat(consent): add explicit recording + export serialization"
```

---

### Task 5: Schemas + account/public endpoints

**Files:**
- Modify: `src/app/schemas.py`
- Modify: `src/app/api/account.py`
- Modify: `src/app/api/account_public.py`
- Test: `tests/integration/test_consent_endpoints.py`

**Interfaces:**
- Consumes: `consent_service.get_consent_state / record_explicit_consent / ConsentTypeState`; `policy_versions.CURRENT_POLICY_VERSIONS`; existing `AuthenticatedUser` dependency + DB session dependency used by other `account.py` endpoints.
- Produces (schemas): `ConsentTypeStateSchema`, `ConsentStateResponse`, `ConsentUpdateRequest`, `PolicyVersionSchema`, `PolicyVersionsResponse`. Endpoints: `GET /v1/account/consent`, `POST /v1/account/consent` (both on `account_router`), `GET /v1/policy-versions` (on `account_public` router).

- [ ] **Step 1: Add schemas to `schemas.py`** (match the existing account-schema neighborhood; every field has `Field(description=...)`)

```python
class ConsentTypeStateSchema(BaseModel):
    consent_type: str = Field(description="Consent category: 'tos', 'privacy', or 'marketing'.")
    version: str | None = Field(description="Accepted policy version, or null for marketing/none.")
    granted: bool = Field(description="Whether consent is currently granted.")
    outstanding: bool = Field(description="True when a newer policy version needs re-acceptance.")
    recorded_at: datetime | None = Field(description="When the latest consent event was recorded.")


class ConsentStateResponse(BaseModel):
    consents: list[ConsentTypeStateSchema] = Field(description="Per-type current consent state.")


class ConsentUpdateRequest(BaseModel):
    accept_policies: list[str] = Field(
        default_factory=list,
        description="Policy types to accept at their current version (e.g. ['tos','privacy']).",
    )
    marketing: bool | None = Field(
        default=None,
        description="Set marketing/product-update opt-in; null leaves it unchanged.",
    )


class PolicyVersionSchema(BaseModel):
    version: str = Field(description="Current policy version identifier (its lastUpdated date).")
    effective_at: date = Field(description="Date this policy version took effect.")


class PolicyVersionsResponse(BaseModel):
    policies: dict[str, PolicyVersionSchema] = Field(
        description="Current version per policy keyed by type ('tos', 'privacy')."
    )
```

(Ensure `date` and `datetime` are imported in `schemas.py`; add to the existing `from datetime import ...` line if missing.)

- [ ] **Step 2: Add the authenticated endpoints to `account.py`**

Find an existing `account.py` endpoint (e.g. the export `GET`) to copy the exact auth + DB dependency injection it uses (`AuthenticatedUser` dependency + session dependency). Then add:

```python
@_acct.get("/consent", response_model=ConsentStateResponse)
async def get_consent(
    request: Request,
    user: AuthenticatedUser = ...,   # copy the exact dependency used by sibling endpoints
    db: AsyncSession = ...,          # copy the exact session dependency used by siblings
) -> ConsentStateResponse:
    states = await get_consent_state(db, user.id)
    return ConsentStateResponse(
        consents=[
            ConsentTypeStateSchema(
                consent_type=s.consent_type,
                version=s.version,
                granted=s.granted,
                outstanding=s.outstanding,
                recorded_at=s.recorded_at,
            )
            for s in states
        ]
    )


@_acct.post("/consent", response_model=ConsentStateResponse)
async def update_consent(
    request: Request,
    payload: ConsentUpdateRequest,
    user: AuthenticatedUser = ...,
    db: AsyncSession = ...,
) -> ConsentStateResponse:
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    await record_explicit_consent(
        db,
        user.id,
        accept_policies=payload.accept_policies,
        marketing=payload.marketing,
        ip=ip,
        user_agent=user_agent,
    )
    return await get_consent(request, user=user, db=db)
```

Add imports at the top of `account.py`:
```python
from app.services.account.consent_service import get_consent_state, record_explicit_consent
from app.schemas import (
    ConsentStateResponse,
    ConsentTypeStateSchema,
    ConsentUpdateRequest,
)
```
Note: `_acct` is the sub-router mounted under the `/v1/account` prefix (see `account.py:168`); register on the same sub-router the export/sessions endpoints use.

- [ ] **Step 3: Add the public endpoint to `account_public.py`**

```python
from app.schemas import PolicyVersionSchema, PolicyVersionsResponse
from app.services.account.policy_versions import CURRENT_POLICY_VERSIONS


@router.get("/policy-versions", response_model=PolicyVersionsResponse)
async def get_policy_versions() -> PolicyVersionsResponse:
    return PolicyVersionsResponse(
        policies={
            name: PolicyVersionSchema(version=pv.version, effective_at=pv.effective_at)
            for name, pv in CURRENT_POLICY_VERSIONS.items()
        }
    )
```

Note: `account_public.router` has `prefix="/v1/account"` (`account_public.py:30`), so this registers at `/v1/account/policy-versions`. The spec names it `/v1/policy-versions`; register it at the prefix-free path by using the app-level path in `main.py` if a top-level path is required. **Decision for this plan:** keep it under the existing public router → final path `/v1/account/policy-versions` (no new router wiring needed). Update the FE consumer accordingly.

- [ ] **Step 4: Write integration tests**

Mirror `tests/integration/test_account_endpoints.py` setup (uses `client`, `override_auth`, `override_db_session`, and patches service functions). Patch the consent service at its import site in `account.py`.

```python
# tests/integration/test_consent_endpoints.py
from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.services.account.consent_service import ConsentTypeState


@pytest.mark.asyncio
async def test_get_consent_returns_state(
    client: AsyncClient, override_auth: None, override_db_session: object
) -> None:
    fake = [
        ConsentTypeState("tos", "2026-04-18", True, False, datetime.now(UTC)),
        ConsentTypeState("privacy", "2026-04-18", True, False, datetime.now(UTC)),
        ConsentTypeState("marketing", None, False, False, None),
    ]
    with patch("app.api.account.get_consent_state", AsyncMock(return_value=fake)):
        resp = await client.get("/v1/account/consent")
    assert resp.status_code == 200
    body = resp.json()
    assert {c["consent_type"] for c in body["consents"]} == {"tos", "privacy", "marketing"}


@pytest.mark.asyncio
async def test_post_consent_records_and_returns_state(
    client: AsyncClient, override_auth: None, override_db_session: object
) -> None:
    fake = [ConsentTypeState("tos", "2026-04-18", True, False, datetime.now(UTC))]
    with patch("app.api.account.record_explicit_consent", AsyncMock()) as rec, patch(
        "app.api.account.get_consent_state", AsyncMock(return_value=fake)
    ):
        resp = await client.post("/v1/account/consent", json={"accept_policies": ["tos"]})
    assert resp.status_code == 200
    rec.assert_awaited_once()


@pytest.mark.asyncio
async def test_policy_versions_public(client: AsyncClient) -> None:
    resp = await client.get("/v1/account/policy-versions")
    assert resp.status_code == 200
    assert resp.json()["policies"]["tos"]["version"] == "2026-04-18"
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pytest tests/integration/test_consent_endpoints.py -v`
Expected: PASS (3 passed). Adjust the patch target / dependency wiring if a test fails because the auth or session dependency differs from the copied sibling.

Run: `mypy --strict src/app/api/account.py src/app/api/account_public.py src/app/schemas.py`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/schemas.py src/app/api/account.py src/app/api/account_public.py tests/integration/test_consent_endpoints.py
git commit -m "feat(consent): add consent + policy-version endpoints"
```

---

### Task 6: Clone consent routes to the `/v1/web` surface

**Files:**
- Modify: `src/app/main.py`

**Interfaces:**
- Consumes: `clone_api_route`, `account_router`, `web_session_dependencies`, `WEB_COOKIE_SECURITY_SCHEME` (all already imported/defined in `main.py`).
- Produces: `GET`/`POST /v1/web/account/consent`.

- [ ] **Step 1: Add the clones**

In the web-surface block where account routes are cloned (near `source_path="/v1/account/key"`), add:

```python
    clone_api_route(
        web_alias_router,
        source_router=account_router,
        source_path="/v1/account/consent",
        target_path="/v1/web/account/consent",
        methods=["GET"],
        dependencies=web_session_dependencies,
        openapi_security=[{WEB_COOKIE_SECURITY_SCHEME: []}],
    )
    clone_api_route(
        web_alias_router,
        source_router=account_router,
        source_path="/v1/account/consent",
        target_path="/v1/web/account/consent",
        methods=["POST"],
        dependencies=web_session_dependencies,
        openapi_security=[{WEB_COOKIE_SECURITY_SCHEME: []}],
    )
```

- [ ] **Step 2: Add a web-surface integration test**

```python
# add to tests/integration/test_consent_endpoints.py
@pytest.mark.asyncio
async def test_web_consent_get_is_routed(
    client: AsyncClient, override_auth: None, override_db_session: object
) -> None:
    from datetime import UTC, datetime
    from app.services.account.consent_service import ConsentTypeState
    fake = [ConsentTypeState("tos", "2026-04-18", True, False, datetime.now(UTC))]
    with patch("app.api.account.get_consent_state", AsyncMock(return_value=fake)):
        resp = await client.get("/v1/web/account/consent")
    assert resp.status_code == 200
```

- [ ] **Step 3: Run tests + start app to verify routing**

Run: `pytest tests/integration/test_consent_endpoints.py -v`
Expected: PASS (4 passed).

Run: `python -c "from app.main import create_app; create_app()"` (or the project's app factory) — Expected: no route-registration error (e.g. `clone_api_route` failing to find the source route would raise here).

- [ ] **Step 4: Commit**

```bash
git add src/app/main.py tests/integration/test_consent_endpoints.py
git commit -m "feat(consent): expose consent endpoints on /v1/web surface"
```

---

### Task 7: Record consent at signup

**Files:**
- Modify: `src/app/services/auth/oauth_service.py`
- Modify: the caller of `find_or_create_oauth_user` (search: `grep -rn "find_or_create_oauth_user" src/app`) to pass `user_agent`.
- Test: `tests/unit/services/test_consent_service.py` (add a signup-path test) or a focused oauth test.

**Interfaces:**
- Consumes: `consent_service.record_signup_consent`.
- Produces: `find_or_create_oauth_user(..., user_agent: str | None = None)` records signup consent for new users.

- [ ] **Step 1: Write the failing test**

```python
# add to tests/unit/services/test_consent_service.py
@pytest.mark.asyncio
async def test_signup_records_consent_for_new_user(sqlite_session: AsyncSession) -> None:
    user = await _make_user(sqlite_session)
    await consent_service.record_signup_consent(
        sqlite_session, user, ip="9.9.9.9", user_agent="agent"
    )
    rows = await consent_service.serialize_consent_for_export(sqlite_session, user.id)
    assert [r["method"] for r in rows] == ["signup", "signup"]
    assert all(r["source_ip"] == "9.9.9.9" for r in rows)
```

(This locks the signup-recording contract; the oauth wiring below calls exactly this.)

- [ ] **Step 2: Run test to verify it fails / passes**

Run: `pytest tests/unit/services/test_consent_service.py -k signup_records -v`
Expected: PASS already (record_signup_consent exists) — this test guards the contract the oauth call depends on. If it fails, fix before wiring.

- [ ] **Step 3: Thread `user_agent` + record consent in `oauth_service.py`**

Add the parameter to the signature (after `ip`):
```python
    user_agent: str | None = None,
```
Import at top: `from app.services.account.consent_service import record_signup_consent`.
In the new-user branch, after `await db.refresh(new_user)` (~line 243) and before the `log.info("oauth.new_user", ...)`:
```python
    try:
        await record_signup_consent(db, new_user, ip=ip, user_agent=user_agent)
    except Exception as exc:  # consent must never block signup
        log.warning("oauth.signup_consent_failed", user_id=str(new_user.id), err=str(exc))
```

- [ ] **Step 4: Pass `user_agent` from the caller**

In the OAuth callback handler that calls `find_or_create_oauth_user`, extract the header and pass it:
```python
    user_agent = request.headers.get("user-agent")
    user, tier, is_new = await find_or_create_oauth_user(
        db, ..., ip=ip, user_agent=user_agent,
    )
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pytest tests/unit/services/test_consent_service.py -v && mypy --strict src/app/services/auth/oauth_service.py`
Expected: PASS; no mypy errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/services/auth/oauth_service.py tests/unit/services/test_consent_service.py
git add -A  # include the modified caller file
git commit -m "feat(consent): record policy acceptance at signup"
```

---

### Task 8: Export + deletion integration

**Files:**
- Modify: `src/app/services/account/account_export_service.py`
- Modify: `src/app/services/account/account_deletion_service.py`
- Test: `tests/unit/services/test_consent_service.py` (deletion) — or extend an existing deletion test if present.

**Interfaces:**
- Consumes: `consent_service.serialize_consent_for_export`; `UserConsentRecord`.

- [ ] **Step 1: Add consent to the export payload**

In `_build_export_payload`, add an import at top of file:
```python
from app.services.account.consent_service import serialize_consent_for_export
```
Add to the returned dict (alongside `"preferences"`):
```python
        "consent_records": await serialize_consent_for_export(db, user.id),
```

- [ ] **Step 2: Delete consent rows on account deletion**

In `account_deletion_service.py`, add `UserConsentRecord` to the `db_base` import block, and add alongside the other `delete(...)` calls in `delete_user_account`:
```python
    await db.execute(delete(UserConsentRecord).where(UserConsentRecord.user_id == user_id))
```

- [ ] **Step 3: Write the failing deletion test**

```python
# add to tests/unit/services/test_consent_service.py
from app.db_base import UserConsentRecord
from app.services.account.account_deletion_service import delete_user_account
from sqlalchemy import select


@pytest.mark.asyncio
async def test_account_deletion_removes_consent_rows(sqlite_session: AsyncSession) -> None:
    user = await _make_user(sqlite_session)
    await consent_service.record_signup_consent(
        sqlite_session, user, ip=None, user_agent=None
    )
    await delete_user_account(sqlite_session, user_id=user.id)
    remaining = (
        await sqlite_session.execute(
            select(UserConsentRecord).where(UserConsentRecord.user_id == user.id)
        )
    ).scalars().all()
    assert remaining == []
```

Note: `delete_user_account` touches many tables and Redis; if it errors on missing related tables under sqlite, instead assert the explicit `delete(UserConsentRecord)` statement is issued by patching `db.execute`, mirroring how existing deletion tests are structured. Inspect `tests/` for an existing `delete_user_account` test first and follow that idiom.

- [ ] **Step 4: Run tests + typecheck**

Run: `pytest tests/unit/services/test_consent_service.py -v`
Expected: PASS.

Run: `mypy --strict src/app/services/account/account_export_service.py src/app/services/account/account_deletion_service.py`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/account/account_export_service.py src/app/services/account/account_deletion_service.py tests/unit/services/test_consent_service.py
git commit -m "feat(consent): include consent in export and scrub on deletion"
```

---

### Task 9: Full backend gate run

**Files:** none (verification task).

- [ ] **Step 1: Run the full backend gates**

Run: `mypy --strict src/app && ruff check src/app tests && pytest tests/unit/services/test_consent_service.py tests/unit/services/test_policy_versions.py tests/integration/test_consent_endpoints.py -v`
Expected: mypy clean, ruff clean, all consent tests pass.

- [ ] **Step 2: Run the broader account suite for regressions**

Run: `pytest tests/integration/test_account_endpoints.py tests/integration/test_account_sessions.py -v`
Expected: PASS (no regressions from the new routes/imports).

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -A && git commit -m "chore(consent): satisfy mypy/ruff gates" || echo "nothing to commit"
```

---

### Task 10: Frontend — rewire marketing toggle (cs2cap)

**Files:**
- Modify: the cs2cap account-settings component that renders the product-update-emails toggle. Find it: `cd /home/gigachad/cs2cap/cs2cap && grep -rn "product_update_emails_enabled\|product-update\|Product update" src/`.
- Modify (if a typed API client exists): `src/lib/api/types.ts` / `src/lib/api/hooks.ts` for the consent endpoint.

**Interfaces:**
- Consumes (backend): `POST /v1/web/account/consent` body `{ marketing: boolean }` → returns consent state; `GET /v1/web/account/consent`.

- [ ] **Step 1: Locate the current toggle + its update path**

Run: `cd /home/gigachad/cs2cap/cs2cap && grep -rn "product_update_emails_enabled" src/`
Read the component and the mutation it currently calls (likely a preferences PATCH via `webApi`/a TanStack hook).

- [ ] **Step 2: Point the toggle at the consent endpoint**

Change the toggle's onChange to call `webApi.post("/account/consent", { marketing: nextValue })` (through the existing client + a TanStack mutation, matching how sibling account mutations are written). Keep the displayed value sourced from the existing preferences/consent state. Do not add a second control.

- [ ] **Step 3: Verify lint + build**

Run: `pnpm lint && pnpm build`
Expected: both clean. (Do NOT start `pnpm dev` — per cs2cap CLAUDE.md, the WSL dev server is avoided.)

- [ ] **Step 4: Commit (cs2cap repo)**

```bash
cd /home/gigachad/cs2cap/cs2cap
git add -A
git commit -m "feat(consent): record marketing opt-in via consent endpoint"
```

---

### Task 11 (OPTIONAL — explicitly skippable): FE reads policy versions

> Spec marks this "optional polish, not required for SP1." Skip unless desired.

**Files:**
- Modify: `cs2cap/src/app/(public)/terms/page.tsx`, `.../privacy/page.tsx`

- [ ] **Step 1:** Fetch `GET /v1/web/account/policy-versions` (public) in the server component and render `lastUpdated` from the returned `effective_at` instead of the hardcoded `"April 18, 2026"` string, falling back to the hardcoded value if the fetch fails. Verify with `pnpm lint && pnpm build`.

---

## Self-Review

**Spec coverage:**
- Policy version registry + public endpoint → Task 1, Task 5 (public endpoint), Task 11 (FE consume).
- `user_consent_records` table + backfill → Task 2.
- `consent_service` (signup / explicit / state / export) → Tasks 3, 4.
- Endpoints + `/v1/web` clones → Tasks 5, 6.
- Signup recording → Task 7.
- Export + deletion integration → Task 8.
- Marketing-toggle rewiring → Task 10.
- Gates (mypy/ruff/Field description/tests) → embedded per task + Task 9.

One spec/plan deviation, called out for the reviewer: the spec names the public route `/v1/policy-versions`, but the existing `account_public` router carries a `/v1/account` prefix, so the plan registers it at **`/v1/account/policy-versions`** to avoid new router wiring. The FE (Tasks 10/11) targets the actual path. If a top-level `/v1/policy-versions` is required, add a dedicated public router in `main.py` instead — note for execution.

**Placeholder scan:** Endpoint dependency injection in Task 5 is intentionally shown as `...` because the exact `AuthenticatedUser`/session `Depends(...)` must be copied verbatim from a sibling `account.py` endpoint (project-specific symbols not safe to invent); the step says exactly that. No other placeholders.

**Type consistency:** `ConsentTypeState` fields (`consent_type, version, granted, outstanding, recorded_at`) are consistent across Tasks 3–6; `record_explicit_consent` / `record_signup_consent` / `get_consent_state` / `serialize_consent_for_export` signatures match between definition (Tasks 3–4) and callers (Tasks 5, 7, 8). `current_version` / `VERSIONED_CONSENT_TYPES` / `MARKETING_CONSENT_TYPE` are consistent.
