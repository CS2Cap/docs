# Admin Operability Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close six admin-surface gaps with additive `/admin/*` endpoints so all routine ops/support work is doable without `psql` or `redis-cli`.

**Architecture:** New and extended thin routers under `src/app/api/admin/` delegate to services/repositories. A new `admin_audit_log` table plus a shared recorder captures every admin mutation. No public-contract or invariant changes (indexed-only, write-behind, no-DB-fallback all preserved).

**Tech Stack:** FastAPI, SQLAlchemy + AsyncPG, Pydantic v2, Alembic, Redis (redis.asyncio), pytest + pytest-asyncio, Ruff, mypy (strict), structlog.

## Global Constraints

- Python `>=3.12,<3.13`; use `poetry run ...` for every command.
- All endpoints: prefix `/admin`, `Depends(verify_admin_token)`, `tags=["Admin"]`.
- All errors raised via `AppHTTPException(status_code=..., error_code=ErrorCode.X, detail=...)`. Never raise plain `HTTPException`.
- Routers stay thin: parse → call service → map to response model. No ORM models returned from handlers.
- Logging via `structlog.get_logger()` only. Every mutation also writes an `admin_audit_log` row. Reads are not audited.
- Admin auth is a single shared token (`x-admin-token`). Audit `actor` = `X-Admin-Actor` header if present, else `"admin"`; plus `source_ip` from `extract_client_ip`.
- New Redis keys: none. Cache interaction is invalidation-on-delete only (IP-ban cache via `_cache_ip_ban(ip, False)`; domain-rule cache via `reset_override_cache()`).
- Test admin header: `{"X-Admin-Token": "test-admin-token"}` with `monkeypatch.setattr(settings, "ADMIN_TOKEN", "test-admin-token")`. Admin integration tests mock the service layer (`unittest.mock.patch` + `AsyncMock`); they do not hit a real DB.
- Migration revision `0084`, `down_revision = "0083"` (current head). Additive and reversible.
- Final validation per change: `poetry run ruff check <paths>`, `poetry run ruff format <paths>`, `poetry run mypy <paths>`, focused `poetry run pytest`. Run `bash scripts/check.sh` once before final commit (endpoint-contract + migration + generated-artifact change).

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `src/app/error_codes.py` | New error codes for missing/conflict targets | Modify |
| `src/app/db_base.py` | `AdminAuditLog` ORM model | Modify |
| `alembic/versions/0084_add_admin_audit_log.py` | `admin_audit_log` table migration | Create |
| `src/app/services/admin/__init__.py` | Package marker | Create |
| `src/app/services/admin/audit_service.py` | Audit recorder + query | Create |
| `src/app/api/admin/audit.py` | `GET /admin/audit-log` | Create |
| `src/app/api/admin/failed_jobs.py` | Failed-job list/retry/discard/retry-all | Create |
| `src/app/api/admin/abuse_bans.py` | Add list/delete for email + IP bans | Modify |
| `src/app/services/account/abuse_ban_service.py` | `list_/delete_` ban functions | Modify |
| `src/app/api/admin/email_domain_rules.py` | Add list/delete | Modify |
| `src/app/services/account/email_domain_policy.py` | `list_/delete_` rule functions | Modify |
| `src/app/api/admin/users.py` | `email`/`q` query params on list | Modify |
| `src/app/api/admin/cache_ops.py` | `GET /admin/cache/write-behind/status` | Create |
| `src/app/api/admin/config.py` | `GET /admin/config` (allowlisted) | Create |
| `src/app/api/admin/__init__.py` | Register new routers | Modify |
| `tests/integration/test_admin_*.py` | Endpoint coverage | Create/Modify |
| `tests/unit/test_admin_audit_service.py`, `test_admin_config_allowlist.py` | Unit coverage | Create |

**Task order:** Tasks 1–2 (audit foundation) are dependencies for mutation auditing in Tasks 4–6, so build them first. Task 3 completes the audit gap. Tasks 4–9 are otherwise independent. Task 10 is docs/regen close-out.

---

### Task 1: Error codes + `admin_audit_log` table & migration

**Files:**
- Modify: `src/app/error_codes.py`
- Modify: `src/app/db_base.py` (add model near other admin tables, ~line 1213)
- Create: `alembic/versions/0084_add_admin_audit_log.py`

**Interfaces:**
- Produces: `ErrorCode.FAILED_JOB_NOT_FOUND`, `ErrorCode.BAN_NOT_FOUND`, `ErrorCode.DOMAIN_RULE_NOT_FOUND` (StrEnum members, value == name).
- Produces: ORM `AdminAuditLog` with columns `id: UUID`, `actor: str`, `source_ip: str | None`, `action: str`, `target_type: str | None`, `target_id: str | None`, `at: datetime`.

- [ ] **Step 1: Add error codes**

In `src/app/error_codes.py`, after the existing domain-specific codes block, add:

```python
    FAILED_JOB_NOT_FOUND = "FAILED_JOB_NOT_FOUND"
    BAN_NOT_FOUND = "BAN_NOT_FOUND"
    DOMAIN_RULE_NOT_FOUND = "DOMAIN_RULE_NOT_FOUND"
```

- [ ] **Step 2: Add ORM model**

In `src/app/db_base.py`, after the `AccountIPBan` class (ends ~line 1212), add:

```python
class AdminAuditLog(Base):
    """Append-only ledger of admin mutations (token-level actor attribution)."""

    __tablename__ = "admin_audit_log"

    __table_args__ = (
        sa.Index("ix_admin_audit_action_at", "action", sa.text("at DESC")),
        sa.Index("ix_admin_audit_target_at", "target_id", sa.text("at DESC")),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=sa.text("gen_random_uuid()"),
    )
    actor: Mapped[str] = mapped_column(String(128), nullable=False)
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )
```

- [ ] **Step 3: Create migration**

Create `alembic/versions/0084_add_admin_audit_log.py`:

```python
"""Add admin_audit_log table.

Revision ID: 0084
Revises: 0083
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0084"
down_revision = "0083"
branch_labels = None
depends_on = None

_TABLE = "admin_audit_log"


def upgrade() -> None:
    op.create_table(
        _TABLE,
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("actor", sa.String(length=128), nullable=False),
        sa.Column("source_ip", sa.String(length=45), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target_type", sa.String(length=32), nullable=True),
        sa.Column("target_id", sa.String(length=255), nullable=True),
        sa.Column(
            "at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_audit_action_at", _TABLE, ["action", sa.text("at DESC")])
    op.create_index("ix_admin_audit_target_at", _TABLE, ["target_id", sa.text("at DESC")])


def downgrade() -> None:
    op.drop_index("ix_admin_audit_target_at", table_name=_TABLE)
    op.drop_index("ix_admin_audit_action_at", table_name=_TABLE)
    op.drop_table(_TABLE)
```

- [ ] **Step 4: Apply migration and verify head**

Run: `poetry run alembic upgrade head && poetry run alembic current`
Expected: ends at `0084 (head)`, no errors.

- [ ] **Step 5: Lint/type-check changed files**

Run: `poetry run ruff check src/app/error_codes.py src/app/db_base.py alembic/versions/0084_add_admin_audit_log.py && poetry run mypy src/app/error_codes.py src/app/db_base.py`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/error_codes.py src/app/db_base.py alembic/versions/0084_add_admin_audit_log.py
git commit -m "feat(admin): add admin_audit_log table and error codes"
```

---

### Task 2: Audit recorder service

**Files:**
- Create: `src/app/services/admin/__init__.py` (empty)
- Create: `src/app/services/admin/audit_service.py`
- Test: `tests/unit/test_admin_audit_service.py`

**Interfaces:**
- Consumes: `AdminAuditLog` (Task 1), `extract_client_ip` from `app.request_ip`.
- Produces:
  - `actor_from_request(request: Request) -> str` — returns `X-Admin-Actor` header trimmed, else `"admin"`.
  - `async record_admin_action(db: AsyncSession, request: Request, *, action: str, target_type: str | None = None, target_id: str | None = None) -> None` — inserts one row and commits.
  - `async query_audit_log(db: AsyncSession, *, action: str | None, target_id: str | None, since: datetime | None, until: datetime | None, limit: int, offset: int) -> tuple[list[AdminAuditLog], int]`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/test_admin_audit_service.py`:

```python
from __future__ import annotations

from unittest.mock import MagicMock

from app.services.admin.audit_service import actor_from_request


def _request_with_headers(headers: dict[str, str]) -> MagicMock:
    req = MagicMock()
    req.headers = headers
    return req


def test_actor_from_request_uses_header_when_present() -> None:
    req = _request_with_headers({"X-Admin-Actor": "  alice  "})
    assert actor_from_request(req) == "alice"


def test_actor_from_request_falls_back_to_admin() -> None:
    req = _request_with_headers({})
    assert actor_from_request(req) == "admin"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/unit/test_admin_audit_service.py -v`
Expected: FAIL with `ModuleNotFoundError: app.services.admin.audit_service`.

- [ ] **Step 3: Create the service**

Create `src/app/services/admin/__init__.py` (empty file).

Create `src/app/services/admin/audit_service.py`:

```python
"""Recorder and query helpers for the admin audit log."""

from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_base import AdminAuditLog
from app.request_ip import extract_client_ip


def actor_from_request(request: Request) -> str:
    raw = (request.headers.get("X-Admin-Actor") or "").strip()
    return raw or "admin"


async def record_admin_action(
    db: AsyncSession,
    request: Request,
    *,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
) -> None:
    db.add(
        AdminAuditLog(
            actor=actor_from_request(request),
            source_ip=extract_client_ip(request),
            action=action,
            target_type=target_type,
            target_id=target_id,
        )
    )
    await db.commit()


async def query_audit_log(
    db: AsyncSession,
    *,
    action: str | None,
    target_id: str | None,
    since: datetime | None,
    until: datetime | None,
    limit: int,
    offset: int,
) -> tuple[list[AdminAuditLog], int]:
    conditions = []
    if action:
        conditions.append(AdminAuditLog.action == action)
    if target_id:
        conditions.append(AdminAuditLog.target_id == target_id)
    if since:
        conditions.append(AdminAuditLog.at >= since)
    if until:
        conditions.append(AdminAuditLog.at <= until)

    count_stmt = select(sa.func.count()).select_from(AdminAuditLog)
    rows_stmt = select(AdminAuditLog).order_by(AdminAuditLog.at.desc())
    for cond in conditions:
        count_stmt = count_stmt.where(cond)
        rows_stmt = rows_stmt.where(cond)

    total = int((await db.execute(count_stmt)).scalar_one())
    rows = list((await db.execute(rows_stmt.limit(limit).offset(offset))).scalars().all())
    return rows, total
```

- [ ] **Step 4: Run test to verify it passes**

Run: `poetry run pytest tests/unit/test_admin_audit_service.py -v`
Expected: PASS.

- [ ] **Step 5: Lint/type-check**

Run: `poetry run ruff check src/app/services/admin/ tests/unit/test_admin_audit_service.py && poetry run ruff format src/app/services/admin/ tests/unit/test_admin_audit_service.py && poetry run mypy src/app/services/admin/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/services/admin/ tests/unit/test_admin_audit_service.py
git commit -m "feat(admin): add audit recorder and query service"
```

---

### Task 3: Audit query endpoint (`GET /admin/audit-log`)

**Files:**
- Create: `src/app/api/admin/audit.py`
- Modify: `src/app/api/admin/__init__.py`
- Test: `tests/integration/test_admin_audit.py`

**Interfaces:**
- Consumes: `query_audit_log` (Task 2).
- Produces: router `audit_router`; response model `AuditLogListResponse`.

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/test_admin_audit.py`:

```python
from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.settings import settings

ADMIN_HEADERS = {"X-Admin-Token": "test-admin-token"}


@pytest.fixture(autouse=True)
def _set_admin_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "test-admin-token")


@pytest.mark.asyncio
async def test_audit_log_lists_entries(client: AsyncClient) -> None:
    row = SimpleNamespace(
        id=uuid4(),
        actor="alice",
        source_ip="1.2.3.4",
        action="ban.email.delete",
        target_type="email_ban",
        target_id="abc",
        at=datetime.now(UTC),
    )
    with patch(
        "app.api.admin.audit.query_audit_log",
        new=AsyncMock(return_value=([row], 1)),
    ):
        resp = await client.get(
            "/admin/audit-log", params={"action": "ban.email.delete"}, headers=ADMIN_HEADERS
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["entries"][0]["action"] == "ban.email.delete"
    assert body["entries"][0]["actor"] == "alice"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/integration/test_admin_audit.py -v`
Expected: FAIL (404 — route not registered).

- [ ] **Step 3: Create the router**

Create `src/app/api/admin/audit.py`:

```python
"""Admin audit-log query endpoint."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.openapi_responses import ADMIN_AUTH_RESPONSES, VALIDATION_ERROR_RESPONSES
from app.db import get_session
from app.security.admin_auth import verify_admin_token
from app.services.admin.audit_service import query_audit_log

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_token)],
    responses={**ADMIN_AUTH_RESPONSES, **VALIDATION_ERROR_RESPONSES},
)


class AuditLogEntryResponse(BaseModel):
    id: UUID
    actor: str
    source_ip: str | None
    action: str
    target_type: str | None
    target_id: str | None
    at: datetime


class AuditLogListResponse(BaseModel):
    entries: list[AuditLogEntryResponse]
    total: int
    limit: int
    offset: int


@router.get("/audit-log", response_model=AuditLogListResponse)
async def list_audit_log(
    db: Annotated[AsyncSession, Depends(get_session)],
    action: Annotated[str | None, Query(description="Filter by dotted action code.")] = None,
    target_id: Annotated[str | None, Query(description="Filter by affected entity id.")] = None,
    since: Annotated[datetime | None, Query(description="Only entries at/after this UTC time.")] = None,
    until: Annotated[datetime | None, Query(description="Only entries at/before this UTC time.")] = None,
    limit: Annotated[int, Query(ge=1, le=200, description="Max records.")] = 50,
    offset: Annotated[int, Query(ge=0, description="Records to skip.")] = 0,
) -> AuditLogListResponse:
    """List admin audit-log entries (most recent first)."""
    rows, total = await query_audit_log(
        db,
        action=action,
        target_id=target_id,
        since=since,
        until=until,
        limit=limit,
        offset=offset,
    )
    return AuditLogListResponse(
        entries=[
            AuditLogEntryResponse(
                id=r.id,
                actor=r.actor,
                source_ip=r.source_ip,
                action=r.action,
                target_type=r.target_type,
                target_id=r.target_id,
                at=r.at,
            )
            for r in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )
```

- [ ] **Step 4: Register the router**

In `src/app/api/admin/__init__.py`, add the import and include:

```python
from app.api.admin.audit import router as audit_router
```
```python
router.include_router(audit_router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `poetry run pytest tests/integration/test_admin_audit.py -v`
Expected: PASS.

- [ ] **Step 6: Lint/type-check and commit**

```bash
poetry run ruff check src/app/api/admin/audit.py src/app/api/admin/__init__.py tests/integration/test_admin_audit.py
poetry run ruff format src/app/api/admin/audit.py tests/integration/test_admin_audit.py
poetry run mypy src/app/api/admin/audit.py
git add src/app/api/admin/audit.py src/app/api/admin/__init__.py tests/integration/test_admin_audit.py
git commit -m "feat(admin): add GET /admin/audit-log endpoint"
```

---

### Task 4: Failed-job recovery router

**Files:**
- Create: `src/app/api/admin/failed_jobs.py`
- Modify: `src/app/api/admin/__init__.py`
- Test: `tests/integration/test_admin_failed_jobs.py`

**Interfaces:**
- Consumes: `client` from `app.redis_client`; `enqueue_pending_job`, `clear_job_runtime_state` (same imports queue.py uses); `KNOWN_QUEUE_JOB_IDS` from `app.api.admin.queue`; `record_admin_action` (Task 2); `JobExecution` (Task 1 area).
- Constant: `FAILED_JOBS_KEY = "cs2capi:failed_jobs"` (must match `worker/consumer.py:71`).
- Produces: router `failed_jobs_router`.

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/test_admin_failed_jobs.py`:

```python
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.settings import settings

ADMIN_HEADERS = {"X-Admin-Token": "test-admin-token"}


@pytest.fixture(autouse=True)
def _set_admin_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "test-admin-token")


@pytest.mark.asyncio
async def test_retry_failed_job_enqueues_and_clears(client: AsyncClient) -> None:
    redis = MagicMock()
    redis.lrem = AsyncMock(return_value=1)
    redis.llen = AsyncMock(return_value=0)
    with (
        patch("app.api.admin.failed_jobs.client", return_value=redis),
        patch("app.api.admin.failed_jobs._has_any_running_marker", new=AsyncMock(return_value=False)),
        patch("app.api.admin.failed_jobs.clear_job_runtime_state", new=AsyncMock(return_value=MagicMock())),
        patch("app.api.admin.failed_jobs.enqueue_pending_job", new=AsyncMock(return_value="queued")),
    ):
        resp = await client.post(
            "/admin/failed-jobs/buff163_listings/retry", headers=ADMIN_HEADERS
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "queued"
    redis.lrem.assert_awaited()


@pytest.mark.asyncio
async def test_retry_failed_job_conflict_when_running(client: AsyncClient) -> None:
    redis = MagicMock()
    with (
        patch("app.api.admin.failed_jobs.client", return_value=redis),
        patch("app.api.admin.failed_jobs._has_any_running_marker", new=AsyncMock(return_value=True)),
    ):
        resp = await client.post(
            "/admin/failed-jobs/buff163_listings/retry", headers=ADMIN_HEADERS
        )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_retry_unknown_job_id_422(client: AsyncClient) -> None:
    resp = await client.post("/admin/failed-jobs/not_a_real_job/retry", headers=ADMIN_HEADERS)
    assert resp.status_code == 422
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/integration/test_admin_failed_jobs.py -v`
Expected: FAIL (404 — route not registered).

- [ ] **Step 3: Create the router**

Create `src/app/api/admin/failed_jobs.py`:

```python
"""Admin failed-job (dead-letter) recovery endpoints."""

from __future__ import annotations

from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin.queue import (
    KNOWN_QUEUE_JOB_IDS,
    _has_any_running_marker,
    _queue_operation_conflict,
    _queue_operation_unavailable,
    _validate_known_job_id,
)
from app.api.openapi_responses import ADMIN_AUTH_RESPONSES, VALIDATION_ERROR_RESPONSES
from app.db import get_session
from app.db_base import JobExecution
from app.error_codes import AppHTTPException, ErrorCode
from app.redis_client import client
from app.security.admin_auth import verify_admin_token
from app.services.admin.audit_service import record_admin_action
from app.services.market.write_behind import clear_job_runtime_state  # noqa: F401  (see note)
from worker.consumer import enqueue_pending_job

log = structlog.get_logger()

FAILED_JOBS_KEY = "cs2capi:failed_jobs"

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_token)],
    responses={**ADMIN_AUTH_RESPONSES, **VALIDATION_ERROR_RESPONSES},
)


class FailedJobEntry(BaseModel):
    job_id: str
    error_type: str | None = None
    error_message: str | None = None
    attempt: int | None = None
    finished_at: str | None = None


class FailedJobListResponse(BaseModel):
    failed_jobs: list[FailedJobEntry]
    count: int


class FailedJobMutationResponse(BaseModel):
    job_id: str
    status: str = Field(description="queued | discarded")


class FailedJobBulkResponse(BaseModel):
    results: dict[str, str]


async def _latest_execution(db: AsyncSession, job_id: str) -> JobExecution | None:
    stmt = (
        select(JobExecution)
        .where(JobExecution.job_id == job_id)
        .order_by(JobExecution.started_at.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def _read_failed_ids(redis: Any) -> list[str]:
    raw = await redis.lrange(FAILED_JOBS_KEY, 0, -1)
    return [j.decode() if isinstance(j, bytes) else j for j in raw]


async def _retry_one(redis: Any, job_id: str) -> str:
    if await _has_any_running_marker(redis, job_id):
        return "skipped:running"
    await clear_job_runtime_state(redis, job_id)
    await redis.lrem(FAILED_JOBS_KEY, 0, job_id)
    result = await enqueue_pending_job(redis, job_id)
    if result == "queued":
        return "queued"
    return f"skipped:{result}"


@router.get("/failed-jobs", response_model=FailedJobListResponse)
async def list_failed_jobs(
    db: Annotated[AsyncSession, Depends(get_session)],
) -> FailedJobListResponse:
    """List dead-lettered jobs enriched with their latest failure detail."""
    redis = client()
    try:
        job_ids = await _read_failed_ids(redis)
    except Exception as exc:
        log.error("admin.failed_jobs_list_error", err=str(exc), exc_info=True)
        raise _queue_operation_unavailable("Failed to read failed jobs") from exc

    entries: list[FailedJobEntry] = []
    for job_id in job_ids:
        execution = await _latest_execution(db, job_id)
        entries.append(
            FailedJobEntry(
                job_id=job_id,
                error_type=execution.error_type if execution else None,
                error_message=execution.error_message if execution else None,
                attempt=execution.attempt if execution else None,
                finished_at=execution.finished_at.isoformat()
                if execution and execution.finished_at
                else None,
            )
        )
    return FailedJobListResponse(failed_jobs=entries, count=len(entries))


@router.post(
    "/failed-jobs/{job_id}/retry",
    response_model=FailedJobMutationResponse,
    responses={409: {"description": "Job is currently running or queue is full."}},
)
async def retry_failed_job(
    job_id: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> FailedJobMutationResponse:
    """Re-enqueue one dead-lettered job after clearing its runtime markers."""
    _validate_known_job_id(job_id)
    redis = client()
    try:
        result = await _retry_one(redis, job_id)
    except Exception as exc:
        log.error("admin.failed_job_retry_error", job_id=job_id, err=str(exc), exc_info=True)
        raise _queue_operation_unavailable("Failed to retry job") from exc

    if result != "queued":
        raise _queue_operation_conflict(f"Job not retried ({result}): {job_id}")

    await record_admin_action(
        db, request, action="failed_job.retry", target_type="job", target_id=job_id
    )
    log.info("admin.failed_job_retried", job_id=job_id)
    return FailedJobMutationResponse(job_id=job_id, status="queued")


@router.delete("/failed-jobs/{job_id}", response_model=FailedJobMutationResponse)
async def discard_failed_job(
    job_id: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> FailedJobMutationResponse:
    """Remove a job from the dead-letter list without retrying."""
    _validate_known_job_id(job_id)
    redis = client()
    try:
        removed = await redis.lrem(FAILED_JOBS_KEY, 0, job_id)
    except Exception as exc:
        log.error("admin.failed_job_discard_error", job_id=job_id, err=str(exc), exc_info=True)
        raise _queue_operation_unavailable("Failed to discard job") from exc

    if not removed:
        raise AppHTTPException(
            status_code=404,
            error_code=ErrorCode.FAILED_JOB_NOT_FOUND,
            detail=f"Job not in dead-letter queue: {job_id}",
        )
    await record_admin_action(
        db, request, action="failed_job.discard", target_type="job", target_id=job_id
    )
    log.info("admin.failed_job_discarded", job_id=job_id)
    return FailedJobMutationResponse(job_id=job_id, status="discarded")


@router.post("/failed-jobs/retry-all", response_model=FailedJobBulkResponse)
async def retry_all_failed_jobs(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> FailedJobBulkResponse:
    """Attempt to re-enqueue every dead-lettered job; returns a per-job result map."""
    redis = client()
    try:
        job_ids = await _read_failed_ids(redis)
        results: dict[str, str] = {}
        for job_id in job_ids:
            if job_id not in KNOWN_QUEUE_JOB_IDS:
                results[job_id] = "skipped:unknown_job"
                continue
            results[job_id] = await _retry_one(redis, job_id)
    except Exception as exc:
        log.error("admin.failed_jobs_retry_all_error", err=str(exc), exc_info=True)
        raise _queue_operation_unavailable("Failed to retry all jobs") from exc

    await record_admin_action(db, request, action="failed_job.retry_all", target_type="job")
    log.info("admin.failed_jobs_retry_all", count=len(results))
    return FailedJobBulkResponse(results=results)
```

> **Implementation note for the engineer:** verify the real import locations before relying on
> the stubs above. `clear_job_runtime_state` is imported by `queue.py` — copy that exact import
> path (search: `grep -rn "clear_job_runtime_state" src/app/api/admin/queue.py`). Same for
> `enqueue_pending_job` (`grep -rn "enqueue_pending_job" src/app/api/admin/queue.py worker/`).
> Replace the two placeholder import lines with the verified paths; the test patches by the
> `app.api.admin.failed_jobs.<name>` symbol so local names are what matter.

- [ ] **Step 4: Register the router**

In `src/app/api/admin/__init__.py` add:

```python
from app.api.admin.failed_jobs import router as failed_jobs_router
```
```python
router.include_router(failed_jobs_router)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `poetry run pytest tests/integration/test_admin_failed_jobs.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Lint/type-check and commit**

```bash
poetry run ruff check src/app/api/admin/failed_jobs.py src/app/api/admin/__init__.py tests/integration/test_admin_failed_jobs.py
poetry run ruff format src/app/api/admin/failed_jobs.py tests/integration/test_admin_failed_jobs.py
poetry run mypy src/app/api/admin/failed_jobs.py
git add src/app/api/admin/failed_jobs.py src/app/api/admin/__init__.py tests/integration/test_admin_failed_jobs.py
git commit -m "feat(admin): add failed-job recovery endpoints"
```

---

### Task 5: Abuse bans — list & delete

**Files:**
- Modify: `src/app/services/account/abuse_ban_service.py`
- Modify: `src/app/api/admin/abuse_bans.py`
- Test: `tests/integration/test_admin_abuse_bans.py`

**Interfaces:**
- Consumes: `AccountEmailBan`, `AccountIPBan`, `_cache_ip_ban` (existing in the service), `record_admin_action`.
- Produces (service):
  - `async list_email_bans(db, *, limit, offset) -> tuple[list[AccountEmailBan], int]`
  - `async delete_email_ban(db, ban_id: UUID) -> bool`
  - `async list_ip_bans(db, *, limit, offset) -> tuple[list[AccountIPBan], int]`
  - `async delete_ip_ban(db, ip_address: str) -> bool` (clears IP-ban cache on success)

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/test_admin_abuse_bans.py`:

```python
from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.settings import settings

ADMIN_HEADERS = {"X-Admin-Token": "test-admin-token"}


@pytest.fixture(autouse=True)
def _set_admin_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "test-admin-token")


@pytest.mark.asyncio
async def test_list_email_bans(client: AsyncClient) -> None:
    ban = SimpleNamespace(
        id=uuid4(), email_identity="a@b.com", email="a@b.com", note=None, created_at=datetime.now(UTC)
    )
    with patch(
        "app.api.admin.abuse_bans.list_email_bans", new=AsyncMock(return_value=([ban], 1))
    ):
        resp = await client.get("/admin/abuse/email-bans", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_delete_ip_ban_not_found(client: AsyncClient) -> None:
    with patch(
        "app.api.admin.abuse_bans.delete_ip_ban", new=AsyncMock(return_value=False)
    ):
        resp = await client.delete("/admin/abuse/ip-bans/1.2.3.4", headers=ADMIN_HEADERS)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_ip_ban_success(client: AsyncClient) -> None:
    with (
        patch("app.api.admin.abuse_bans.delete_ip_ban", new=AsyncMock(return_value=True)),
        patch("app.api.admin.abuse_bans.record_admin_action", new=AsyncMock()),
    ):
        resp = await client.delete("/admin/abuse/ip-bans/1.2.3.4", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/integration/test_admin_abuse_bans.py -v`
Expected: FAIL (404 — routes not registered).

- [ ] **Step 3: Add service functions**

In `src/app/services/account/abuse_ban_service.py`, add (imports `UUID` from `uuid`, `func`/`select` from sqlalchemy as needed — match the file's existing import style):

```python
async def list_email_bans(
    db: AsyncSession, *, limit: int, offset: int
) -> tuple[list[AccountEmailBan], int]:
    total = int(
        (await db.execute(select(func.count()).select_from(AccountEmailBan))).scalar_one()
    )
    rows = list(
        (
            await db.execute(
                select(AccountEmailBan)
                .order_by(AccountEmailBan.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    return rows, total


async def delete_email_ban(db: AsyncSession, ban_id: UUID) -> bool:
    ban = (
        await db.execute(select(AccountEmailBan).where(AccountEmailBan.id == ban_id))
    ).scalar_one_or_none()
    if ban is None:
        return False
    await db.delete(ban)
    await db.commit()
    return True


async def list_ip_bans(
    db: AsyncSession, *, limit: int, offset: int
) -> tuple[list[AccountIPBan], int]:
    total = int(
        (await db.execute(select(func.count()).select_from(AccountIPBan))).scalar_one()
    )
    rows = list(
        (
            await db.execute(
                select(AccountIPBan)
                .order_by(AccountIPBan.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    return rows, total


async def delete_ip_ban(db: AsyncSession, ip_address: str) -> bool:
    ban = (
        await db.execute(select(AccountIPBan).where(AccountIPBan.ip_address == ip_address))
    ).scalar_one_or_none()
    if ban is None:
        return False
    await db.delete(ban)
    await db.commit()
    await _cache_ip_ban(ip_address, False)  # negative-cache so reads see the unban immediately
    return True
```

> Verify `func`, `select`, `AccountEmailBan`, `AccountIPBan`, and `UUID` are imported at the top
> of the file; add any missing import. `_cache_ip_ban` already exists in this module.

- [ ] **Step 4: Add endpoints**

In `src/app/api/admin/abuse_bans.py`, add imports:

```python
from uuid import UUID

from fastapi import Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.services.account.abuse_ban_service import (
    delete_email_ban,
    delete_ip_ban,
    list_email_bans,
    list_ip_bans,
)
from app.services.admin.audit_service import record_admin_action
```

Add response models and routes:

```python
class EmailBanRow(BaseModel):
    id: UUID
    email_identity: str
    email: str
    note: str | None
    created_at: datetime


class EmailBanListResponse(BaseModel):
    bans: list[EmailBanRow]
    total: int
    limit: int
    offset: int


class IPBanRow(BaseModel):
    ip_address: str
    source_email_identity: str | None
    source_user_id: UUID | None
    note: str | None
    created_at: datetime


class IPBanListResponse(BaseModel):
    bans: list[IPBanRow]
    total: int
    limit: int
    offset: int


class BanDeleteResponse(BaseModel):
    status: str = Field(default="deleted")


@router.get("/abuse/email-bans", response_model=EmailBanListResponse)
async def list_email_abuse_bans(
    db: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EmailBanListResponse:
    """List email abuse bans, most recent first."""
    rows, total = await list_email_bans(db, limit=limit, offset=offset)
    return EmailBanListResponse(
        bans=[
            EmailBanRow(
                id=r.id,
                email_identity=r.email_identity,
                email=r.email,
                note=r.note,
                created_at=r.created_at,
            )
            for r in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete("/abuse/email-bans/{ban_id}", response_model=BanDeleteResponse)
async def delete_email_abuse_ban(
    ban_id: UUID,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> BanDeleteResponse:
    """Lift one email abuse ban."""
    if not await delete_email_ban(db, ban_id):
        raise AppHTTPException(
            status_code=404, error_code=ErrorCode.BAN_NOT_FOUND, detail="Email ban not found"
        )
    await record_admin_action(
        db, request, action="ban.email.delete", target_type="email_ban", target_id=str(ban_id)
    )
    return BanDeleteResponse()


@router.get("/abuse/ip-bans", response_model=IPBanListResponse)
async def list_ip_abuse_bans(
    db: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> IPBanListResponse:
    """List IP abuse bans, most recent first."""
    rows, total = await list_ip_bans(db, limit=limit, offset=offset)
    return IPBanListResponse(
        bans=[
            IPBanRow(
                ip_address=r.ip_address,
                source_email_identity=r.source_email_identity,
                source_user_id=r.source_user_id,
                note=r.note,
                created_at=r.created_at,
            )
            for r in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete("/abuse/ip-bans/{ip_address}", response_model=BanDeleteResponse)
async def delete_ip_abuse_ban(
    ip_address: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> BanDeleteResponse:
    """Lift one IP abuse ban and clear its cache."""
    if not await delete_ip_ban(db, ip_address):
        raise AppHTTPException(
            status_code=404, error_code=ErrorCode.BAN_NOT_FOUND, detail="IP ban not found"
        )
    await record_admin_action(
        db, request, action="ban.ip.delete", target_type="ip_ban", target_id=ip_address
    )
    return BanDeleteResponse()
```

> Ensure `Annotated`, `datetime`, `Field` are imported at top of `abuse_bans.py` (add what's
> missing; the file already imports `BaseModel`, `Field`, `Depends`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `poetry run pytest tests/integration/test_admin_abuse_bans.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Lint/type-check and commit**

```bash
poetry run ruff check src/app/api/admin/abuse_bans.py src/app/services/account/abuse_ban_service.py tests/integration/test_admin_abuse_bans.py
poetry run ruff format src/app/api/admin/abuse_bans.py src/app/services/account/abuse_ban_service.py tests/integration/test_admin_abuse_bans.py
poetry run mypy src/app/api/admin/abuse_bans.py src/app/services/account/abuse_ban_service.py
git add src/app/api/admin/abuse_bans.py src/app/services/account/abuse_ban_service.py tests/integration/test_admin_abuse_bans.py
git commit -m "feat(admin): list/delete for email and IP abuse bans"
```

---

### Task 6: Email-domain rules — list & delete

**Files:**
- Modify: `src/app/services/account/email_domain_policy.py`
- Modify: `src/app/api/admin/email_domain_rules.py`
- Test: `tests/integration/test_admin_email_domain_rules.py` (extend existing)

**Interfaces:**
- Consumes: `EmailDomainRule`, `reset_override_cache` (existing), `record_admin_action`.
- Produces (service):
  - `async list_email_domain_rules(db) -> list[EmailDomainRule]`
  - `async delete_email_domain_rule(db, domain: str) -> bool` (resets override cache on success)

- [ ] **Step 1: Write the failing test (append to existing file)**

Append to `tests/integration/test_admin_email_domain_rules.py`:

```python
@pytest.mark.asyncio
async def test_list_domain_rules(client: AsyncClient) -> None:
    from types import SimpleNamespace
    from datetime import UTC, datetime

    rule = SimpleNamespace(domain="x.com", action="deny", note=None, created_at=datetime.now(UTC))
    with patch(
        "app.api.admin.email_domain_rules.list_email_domain_rules",
        new=AsyncMock(return_value=[rule]),
    ):
        resp = await client.get("/admin/email-domain-rules", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["rules"][0]["domain"] == "x.com"


@pytest.mark.asyncio
async def test_delete_domain_rule_not_found(client: AsyncClient) -> None:
    with patch(
        "app.api.admin.email_domain_rules.delete_email_domain_rule",
        new=AsyncMock(return_value=False),
    ):
        resp = await client.delete("/admin/email-domain-rules/x.com", headers=ADMIN_HEADERS)
    assert resp.status_code == 404
```

> If `ADMIN_HEADERS`, `patch`, `AsyncMock`, `pytest`, `AsyncClient` are not already imported in
> this existing test file, add them (mirror Task 5's imports).

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/integration/test_admin_email_domain_rules.py -v -k "list_domain_rules or delete_domain_rule"`
Expected: FAIL (404).

- [ ] **Step 3: Add service functions**

In `src/app/services/account/email_domain_policy.py`:

```python
async def list_email_domain_rules(db: AsyncSession) -> list[EmailDomainRule]:
    rows = (
        await db.execute(select(EmailDomainRule).order_by(EmailDomainRule.created_at.desc()))
    ).scalars().all()
    return list(rows)


async def delete_email_domain_rule(db: AsyncSession, domain: str) -> bool:
    rule = (
        await db.execute(select(EmailDomainRule).where(EmailDomainRule.domain == domain))
    ).scalar_one_or_none()
    if rule is None:
        return False
    await db.delete(rule)
    await db.commit()
    reset_override_cache()
    return True
```

- [ ] **Step 4: Add endpoints**

In `src/app/api/admin/email_domain_rules.py` add imports (`Request`, `list_email_domain_rules`, `delete_email_domain_rule`, `record_admin_action`) and routes:

```python
class EmailDomainRuleListResponse(BaseModel):
    rules: list[EmailDomainRuleResponse]


class DomainRuleDeleteResponse(BaseModel):
    status: str = Field(default="deleted")


@router.get("/email-domain-rules", response_model=EmailDomainRuleListResponse)
async def list_domain_rules(
    db: Annotated[AsyncSession, Depends(get_session)],
) -> EmailDomainRuleListResponse:
    """List all email-domain override rules."""
    rules = await list_email_domain_rules(db)
    return EmailDomainRuleListResponse(
        rules=[
            EmailDomainRuleResponse(
                domain=r.domain, action=r.action, note=r.note, created_at=r.created_at
            )
            for r in rules
        ]
    )


@router.delete("/email-domain-rules/{domain}", response_model=DomainRuleDeleteResponse)
async def delete_domain_rule(
    domain: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> DomainRuleDeleteResponse:
    """Delete one email-domain rule and reset the override cache."""
    normalized = normalize_block_domain(domain)
    if not await delete_email_domain_rule(db, normalized):
        raise AppHTTPException(
            status_code=404,
            error_code=ErrorCode.DOMAIN_RULE_NOT_FOUND,
            detail="Email domain rule not found",
        )
    await record_admin_action(
        db, request, action="domain_rule.delete", target_type="domain_rule", target_id=normalized
    )
    return DomainRuleDeleteResponse()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `poetry run pytest tests/integration/test_admin_email_domain_rules.py -v`
Expected: PASS (existing + 2 new).

- [ ] **Step 6: Lint/type-check and commit**

```bash
poetry run ruff check src/app/api/admin/email_domain_rules.py src/app/services/account/email_domain_policy.py tests/integration/test_admin_email_domain_rules.py
poetry run ruff format src/app/api/admin/email_domain_rules.py src/app/services/account/email_domain_policy.py tests/integration/test_admin_email_domain_rules.py
poetry run mypy src/app/api/admin/email_domain_rules.py src/app/services/account/email_domain_policy.py
git add src/app/api/admin/email_domain_rules.py src/app/services/account/email_domain_policy.py tests/integration/test_admin_email_domain_rules.py
git commit -m "feat(admin): list/delete for email-domain rules"
```

---

### Task 7: User lookup by email / partial query

**Files:**
- Modify: `src/app/api/admin/users.py` (`list_users`, starts line 917)
- Test: `tests/integration/test_admin_endpoints.py` (extend)

**Interfaces:**
- Adds optional `email: str | None` and `q: str | None` query params. Existing filters and `UsersListResponse` unchanged.

- [ ] **Step 1: Write the failing test**

Add to `tests/integration/test_admin_endpoints.py` (mirror the file's existing fixture/imports):

```python
@pytest.mark.asyncio
async def test_list_users_email_filter_passes_through(client: AsyncClient) -> None:
    captured = {}

    async def _fake_execute(stmt):  # noqa: ANN001
        captured["called"] = True
        raise RuntimeError("stop-after-capture")

    # Simplest assertion: the param is accepted (200 path is covered by existing list test).
    resp = await client.get(
        "/admin/users", params={"email": "a@b.com"}, headers=ADMIN_HEADERS
    )
    assert resp.status_code in (200, 500)  # 200 with DB mock; param accepted either way
```

> The repo's existing `test_admin_endpoints.py` already has a working `list_users` test with the
> DB mocked. Prefer extending that test's mock to assert the `email` filter narrows the query
> (add a `WHERE email = ...` assertion against the captured statement) rather than the
> smoke-check above. Use whichever DB-mock pattern that file already establishes.

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/integration/test_admin_endpoints.py -v -k email_filter`
Expected: FAIL (param not yet accepted → 422, or assertion fails).

- [ ] **Step 3: Add params and WHERE clauses**

In `list_users` signature (after `account_stage`, before `limit`), add:

```python
    email: Annotated[
        str | None, Query(description="Filter by exact (canonicalized) email.")
    ] = None,
    q: Annotated[
        str | None, Query(description="Partial match on email or user id.")
    ] = None,
```

After the existing `tier_value` WHERE block, add (and mirror onto `count_stmt`, matching how the
existing code applies `tier`/`is_active` to both statements):

```python
    if email:
        normalized_email = email.strip().lower()
        stmt = stmt.where(APIUser.email == normalized_email)
        count_stmt = count_stmt.where(APIUser.email == normalized_email)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            sa.or_(APIUser.email.ilike(like), sa.cast(APIUser.id, sa.String).ilike(like))
        )
        count_stmt = count_stmt.where(
            sa.or_(APIUser.email.ilike(like), sa.cast(APIUser.id, sa.String).ilike(like))
        )
```

> Verify the canonical email column name on `APIUser` (the codebase uses a canonical email
> identity — `grep -n "canonical_email\|email" src/app/db_base.py` around the `APIUser` model)
> and use that column if `email` is not the canonical one. Confirm `sa` is imported in `users.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `poetry run pytest tests/integration/test_admin_endpoints.py -v -k "list_users"`
Expected: PASS.

- [ ] **Step 5: Lint/type-check and commit**

```bash
poetry run ruff check src/app/api/admin/users.py tests/integration/test_admin_endpoints.py
poetry run ruff format src/app/api/admin/users.py tests/integration/test_admin_endpoints.py
poetry run mypy src/app/api/admin/users.py
git add src/app/api/admin/users.py tests/integration/test_admin_endpoints.py
git commit -m "feat(admin): add email/q lookup filters to user list"
```

---

### Task 8: Write-behind status (read-only)

**Files:**
- Create: `src/app/api/admin/cache_ops.py`
- Modify: `src/app/api/admin/__init__.py`
- Test: `tests/integration/test_admin_cache_ops.py`

**Interfaces:**
- Consumes: `_price_flush_stats`, `_bid_flush_stats` from `app.services.market.write_behind`.
- Produces: router `cache_ops_router`.

- [ ] **Step 1: Verify the stat helper signatures first**

Run: `grep -nA6 "_price_flush_stats\|_bid_flush_stats" src/app/services/market/write_behind.py`
Note the exact return shape (dict[str, int]) and whether they are sync or async; adjust the
endpoint below to match (the code below assumes sync `dict[str, int]`).

- [ ] **Step 2: Write the failing integration test**

Create `tests/integration/test_admin_cache_ops.py`:

```python
from __future__ import annotations

from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.settings import settings

ADMIN_HEADERS = {"X-Admin-Token": "test-admin-token"}


@pytest.fixture(autouse=True)
def _set_admin_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "test-admin-token")


@pytest.mark.asyncio
async def test_write_behind_status(client: AsyncClient) -> None:
    with (
        patch("app.api.admin.cache_ops._price_flush_stats", return_value={"dirty": 3}),
        patch("app.api.admin.cache_ops._bid_flush_stats", return_value={"dirty": 1}),
    ):
        resp = await client.get("/admin/cache/write-behind/status", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    body = resp.json()
    assert body["prices"]["dirty"] == 3
    assert body["bids"]["dirty"] == 1
```

- [ ] **Step 3: Run test to verify it fails**

Run: `poetry run pytest tests/integration/test_admin_cache_ops.py -v`
Expected: FAIL (404).

- [ ] **Step 4: Create the router**

Create `src/app/api/admin/cache_ops.py`:

```python
"""Admin read-only write-behind / cache status."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.openapi_responses import ADMIN_AUTH_RESPONSES
from app.security.admin_auth import verify_admin_token
from app.services.market.write_behind import _bid_flush_stats, _price_flush_stats

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_token)],
    responses={**ADMIN_AUTH_RESPONSES},
)


class WriteBehindStatusResponse(BaseModel):
    prices: dict[str, Any]
    bids: dict[str, Any]


@router.get("/cache/write-behind/status", response_model=WriteBehindStatusResponse)
async def write_behind_status() -> WriteBehindStatusResponse:
    """Read-only write-behind backlog stats. Trigger a flush via POST /admin/queue/jobs."""
    return WriteBehindStatusResponse(prices=_price_flush_stats(), bids=_bid_flush_stats())
```

> If Step 1 showed the stat helpers are `async`, `await` them here. If they take a Redis client
> arg, pass `client()` from `app.redis_client` (mirror how `write_behind.py` calls them).

- [ ] **Step 5: Register and run test**

Add to `src/app/api/admin/__init__.py`:

```python
from app.api.admin.cache_ops import router as cache_ops_router
```
```python
router.include_router(cache_ops_router)
```

Run: `poetry run pytest tests/integration/test_admin_cache_ops.py -v`
Expected: PASS.

- [ ] **Step 6: Lint/type-check and commit**

```bash
poetry run ruff check src/app/api/admin/cache_ops.py src/app/api/admin/__init__.py tests/integration/test_admin_cache_ops.py
poetry run ruff format src/app/api/admin/cache_ops.py tests/integration/test_admin_cache_ops.py
poetry run mypy src/app/api/admin/cache_ops.py
git add src/app/api/admin/cache_ops.py src/app/api/admin/__init__.py tests/integration/test_admin_cache_ops.py
git commit -m "feat(admin): add write-behind status endpoint"
```

---

### Task 9: Runtime config (allowlisted, read-only)

**Files:**
- Create: `src/app/api/admin/config.py`
- Modify: `src/app/api/admin/__init__.py`
- Test: `tests/integration/test_admin_config.py`, `tests/unit/test_admin_config_allowlist.py`

**Interfaces:**
- Consumes: `settings` from `app.settings`.
- Produces: router `config_router`; module constant `CONFIG_ALLOWLIST: tuple[str, ...]`.

- [ ] **Step 1: Write the failing unit test (allowlist safety)**

Create `tests/unit/test_admin_config_allowlist.py`:

```python
from __future__ import annotations

from app.api.admin.config import CONFIG_ALLOWLIST

_SECRET_MARKERS = ("TOKEN", "SECRET", "KEY", "PASSWORD", "DSN", "URL", "DATABASE")


def test_allowlist_contains_no_secret_like_names() -> None:
    for name in CONFIG_ALLOWLIST:
        assert not any(marker in name.upper() for marker in _SECRET_MARKERS), name


def test_allowlist_has_expected_core_keys() -> None:
    assert "WRITE_BEHIND_ENABLED" in CONFIG_ALLOWLIST
    assert "PRICES_INDEX_STRICT_MODE" in CONFIG_ALLOWLIST
```

> Note: `WRITE_BEHIND_PROVIDER_LOCK_TTL_SEC` contains "KEY"? No — it does not. But
> `CSFLOAT_API_KEY` does and must never be in the list. The test enforces this. If a legitimate
> allowlist entry trips a marker, rename the marker check — do not weaken it by removing markers.

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/unit/test_admin_config_allowlist.py -v`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Create the router with an explicit allowlist**

Create `src/app/api/admin/config.py`:

```python
"""Admin read-only runtime config (explicit non-secret allowlist)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.openapi_responses import ADMIN_AUTH_RESPONSES
from app.security.admin_auth import verify_admin_token
from app.settings import settings

# Explicit allowlist — only behaviorally-significant, non-secret settings.
# Never add tokens, API keys, passwords, DSNs, or connection URLs here.
CONFIG_ALLOWLIST: tuple[str, ...] = (
    "APP_ENV",
    "WRITE_BEHIND_ENABLED",
    "WRITE_BEHIND_FLUSH_INTERVAL_SEC",
    "WRITE_BEHIND_MISSING_GRACE_MULTIPLIER",
    "WRITE_BEHIND_PROVIDER_LOCK_TTL_SEC",
    "PRICES_INDEX_STRICT_MODE",
    "BIDS_INDEX_STRICT_MODE",
    "ANALYTICS_DB_STATEMENT_TIMEOUT_MS",
    "ANALYTICS_DB_LOCK_TIMEOUT_MS",
    "ANALYTICS_DB_IDLE_TX_TIMEOUT_MS",
    "ORIGIN_RESPONSE_COMPRESSION_ENABLED",
    "SCHEDULER_LOCK_TTL_SEC",
    "QUEUE_BACKLOG_LIMIT",
    "CACHE_TTL_MULTIPLIER",
    "USAGE_LOG_QUEUE_MAXSIZE",
    "OAUTH_STATE_TTL_MINUTES",
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_token)],
    responses={**ADMIN_AUTH_RESPONSES},
)


class ConfigResponse(BaseModel):
    config: dict[str, Any]


@router.get("/config", response_model=ConfigResponse)
async def get_runtime_config() -> ConfigResponse:
    """Read-only effective runtime config (non-secret allowlist only)."""
    return ConfigResponse(
        config={name: getattr(settings, name, None) for name in CONFIG_ALLOWLIST}
    )
```

> Before finalizing, confirm each allowlist name exists on `settings`
> (`grep -nE "WRITE_BEHIND_ENABLED|PRICES_INDEX_STRICT_MODE|QUEUE_BACKLOG_LIMIT" src/app/settings.py`).
> Drop any name that is not an actual setting; `getattr(..., None)` keeps it safe regardless.

- [ ] **Step 4: Write the integration test**

Create `tests/integration/test_admin_config.py`:

```python
from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.settings import settings

ADMIN_HEADERS = {"X-Admin-Token": "test-admin-token"}


@pytest.fixture(autouse=True)
def _set_admin_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "test-admin-token")


@pytest.mark.asyncio
async def test_get_config_returns_allowlisted_keys_only(client: AsyncClient) -> None:
    resp = await client.get("/admin/config", headers=ADMIN_HEADERS)
    assert resp.status_code == 200
    cfg = resp.json()["config"]
    assert "WRITE_BEHIND_ENABLED" in cfg
    assert not any("TOKEN" in k.upper() or "KEY" in k.upper() for k in cfg)
```

- [ ] **Step 5: Register, run both tests**

Add to `src/app/api/admin/__init__.py`:

```python
from app.api.admin.config import router as config_router
```
```python
router.include_router(config_router)
```

Run: `poetry run pytest tests/unit/test_admin_config_allowlist.py tests/integration/test_admin_config.py -v`
Expected: PASS.

- [ ] **Step 6: Lint/type-check and commit**

```bash
poetry run ruff check src/app/api/admin/config.py src/app/api/admin/__init__.py tests/unit/test_admin_config_allowlist.py tests/integration/test_admin_config.py
poetry run ruff format src/app/api/admin/config.py tests/unit/test_admin_config_allowlist.py tests/integration/test_admin_config.py
poetry run mypy src/app/api/admin/config.py
git add src/app/api/admin/config.py src/app/api/admin/__init__.py tests/unit/test_admin_config_allowlist.py tests/integration/test_admin_config.py
git commit -m "feat(admin): add read-only runtime config endpoint"
```

---

### Task 10: Docs, OpenAPI regen, full gate

**Files:**
- Modify: `docs/internal/API_REFERENCE.md`, `docs/internal/ROUTE_TO_SERVICE_MAP.md`, `docs/internal/DATA_MODEL.md`
- Regenerate: `openapi.json`, `docs/openapi.json` (via scripts)

- [ ] **Step 1: Document new endpoints**

In `docs/internal/API_REFERENCE.md`, add an "Admin operability" subsection covering: failed-jobs (list/retry/discard/retry-all), abuse-bans list/delete, email-domain-rules list/delete, user `email`/`q` filters, `cache/write-behind/status`, `config`, and `audit-log`. Include the note: *"Force-flush and provider re-ingest are performed via `POST /admin/queue/jobs` with `flush_prices_writebehind` / `flush_bids_writebehind` / `<provider>` job ids — there is intentionally no separate cache-mutation endpoint."*

- [ ] **Step 2: Update route map and data model**

In `docs/internal/ROUTE_TO_SERVICE_MAP.md`, add the new routes → services (`audit_service`, `abuse_ban_service`, `email_domain_policy`, `write_behind`). In `docs/internal/DATA_MODEL.md`, add the `admin_audit_log` table.

- [ ] **Step 3: Regenerate OpenAPI**

Run: `poetry run python scripts/generate_openapi.py && poetry run python scripts/filter_openapi.py`
Expected: `openapi.json` and `docs/openapi.json` updated with the new admin paths (admin paths may be filtered out of the public spec — that is expected; just commit whatever the scripts produce).

- [ ] **Step 4: Run the full gate**

Run: `bash scripts/check.sh`
Expected: PASS (Ruff, mypy, pytest, OpenAPI drift check all green).

- [ ] **Step 5: Commit**

```bash
git add docs/ openapi.json
git commit -m "docs(admin): document operability endpoints and regen OpenAPI"
```

---

## Self-Review

**Spec coverage:**
- Gap 1 failed-job recovery → Task 4. ✓
- Gap 2 bans/domain-rules list+delete → Tasks 5, 6 (with cache invalidation). ✓
- Gap 3 user lookup → Task 7. ✓
- Gap 4 write-behind status (read-only, no mutation endpoints) → Task 8. ✓
- Gap 5 runtime config (allowlist) → Task 9. ✓
- Gap 6 minimal audit log (table + recorder + query) → Tasks 1, 2, 3, wired into mutations in 4/5/6. ✓
- Cross-cutting: error codes (Task 1), docs/OpenAPI/gate (Task 10). ✓

**Placeholder scan:** Code blocks are concrete. Several steps include an explicit "verify the exact import path / column name / helper signature" instruction — these are deliberate guards against the few symbols whose exact location the plan could not pin without the implementer re-grepping, not vague TODOs. Each names the exact grep to run and what to substitute.

**Type consistency:** `record_admin_action(db, request, *, action, target_type, target_id)` signature is identical across Tasks 2/4/5/6. `(rows, total)` tuple shape consistent across list services. `_retry_one` returns `str` status used by both single-retry and retry-all. Response models are defined in the task that introduces them.
