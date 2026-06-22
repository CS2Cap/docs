# Data-Retention Purge Worker (SP3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily background worker that purges stale rows from four tables (alert events, terminal webhook deliveries, expired email tokens, old export-job metadata) that today only get cleaned on account deletion.

**Architecture:** A `retention_service` with one batched-delete helper + four `purge_*` functions + a `run_retention_sweep` orchestrator, driven by a standalone `retention_cleanup_worker` that mirrors the existing `session_cleanup_worker`. Deletes only — no new tables, no migration, no API. Cascades (alert deliveries, webhook attempts) are DB-enforced.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 async, pytest/pytest-asyncio, structlog.

## Global Constraints

- `mypy --strict` clean and `ruff` clean (cs2c-api CI gates). Run via `poetry run mypy` / `poetry run ruff check .` / `poetry run pytest` (bare `python`/`pytest` fail — use Poetry/venv).
- Deletes only. No new DB tables, no Alembic migration, no API surface.
- Batched-delete idiom: mirror `app/services/auth/session_service.py::purge_expired` exactly — a `while True` loop that selects up to `batch_size` ids, deletes them, and breaks when fewer than `batch_size` remain (drains fully per call).
- Cascade is DB-enforced: `user_alert_deliveries.event_id` → `user_alert_events.id` and `user_webhook_delivery_attempts.job_id` → `user_webhook_delivery_jobs.id` are both `ON DELETE CASCADE`. Purge deletes the parent only.
- Webhook purge MUST only delete terminal jobs: `status IN ('delivered','failed')`. Never `queued`/`retry`.
- Filter columns (verbatim): `user_alert_events.created_at`; `user_webhook_delivery_jobs.status` + `created_at`; `email_verification_tokens.expires_at`; `account_export_jobs.created_at`.
- Retention defaults (settings): alert events 90d, webhook deliveries 30d, email-token grace 7d, export jobs 30d; worker enabled, interval 86400s, batch 1000.
- The `sqlite_session` test fixture does NOT enable SQLite FK enforcement; cascade tests must run `PRAGMA foreign_keys=ON` on the session before inserting, or cascades won't fire.
- Worker structure mirrors `app/services/account/session_cleanup_worker.py` (stop-event loop, start/stop with 5s timeout-cancel), wired into `app/main.py` lifespan next to the session worker (start ~line 226, stop ~line 393).

---

## File Structure

**Create:**
- `src/app/services/account/retention_service.py` — batched-delete helper, four `purge_*` functions, `run_retention_sweep` orchestrator.
- `src/app/services/account/retention_cleanup_worker.py` — periodic worker (start/stop + loop).
- `tests/unit/services/test_retention_service.py` — purge + orchestrator tests.

**Modify:**
- `src/app/settings.py` — seven `RETENTION_*` settings.
- `src/app/main.py` — start/stop the worker in lifespan.

---

### Task 1: Retention purge functions

**Files:**
- Create: `src/app/services/account/retention_service.py`
- Test: `tests/unit/services/test_retention_service.py`

**Interfaces:**
- Produces:
  - `purge_alert_events(db: AsyncSession, *, older_than_days: int, batch_size: int) -> int`
  - `purge_webhook_deliveries(db: AsyncSession, *, older_than_days: int, batch_size: int) -> int`
  - `purge_email_tokens(db: AsyncSession, *, grace_days: int, batch_size: int) -> int`
  - `purge_export_jobs(db: AsyncSession, *, older_than_days: int, batch_size: int) -> int`
  - `_WEBHOOK_TERMINAL_STATUSES: tuple[str, ...] = ("delivered", "failed")`

- [ ] **Step 1: Write the failing tests**

```python
# tests/unit/services/test_retention_service.py
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_base import (
    AccountExportJob,
    APITier,
    APIUser,
    EmailVerificationToken,
    UserAlert,
    UserAlertDelivery,
    UserAlertEvent,
    UserWebhookDeliveryJob,
)
from app.services.account import retention_service


def _days_ago(n: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=n)


async def _user(db: AsyncSession) -> APIUser:
    tier = APITier(
        id=uuid4(), code="free", display_name="Free", quota_requests_per_month=1000,
        rate_requests_per_minute=60, limit_param_cap=100, currency="USD", monthly_price_cents=0,
    )
    db.add(tier)
    await db.flush()
    user = APIUser(id=uuid4(), email="u@example.com", display_name="U", tier_id=tier.id)
    db.add(user)
    await db.flush()
    return user


@pytest.mark.asyncio
async def test_purge_alert_events_deletes_old_keeps_new(sqlite_session: AsyncSession) -> None:
    user = await _user(sqlite_session)
    alert = UserAlert(id=uuid4(), user_id=user.id, kind="price_below", threshold_value=100)
    sqlite_session.add(alert)
    await sqlite_session.flush()
    old = UserAlertEvent(id=uuid4(), user_id=user.id, alert_id=alert.id,
                         window_start_at=_days_ago(120), created_at=_days_ago(120))
    new = UserAlertEvent(id=uuid4(), user_id=user.id, alert_id=alert.id,
                         window_start_at=_days_ago(10), created_at=_days_ago(10))
    sqlite_session.add_all([old, new])
    await sqlite_session.commit()

    deleted = await retention_service.purge_alert_events(
        sqlite_session, older_than_days=90, batch_size=1000)
    await sqlite_session.commit()

    assert deleted == 1
    remaining = (await sqlite_session.execute(text("SELECT id FROM user_alert_events"))).all()
    assert len(remaining) == 1


@pytest.mark.asyncio
async def test_purge_alert_events_cascades_deliveries(sqlite_session: AsyncSession) -> None:
    await sqlite_session.execute(text("PRAGMA foreign_keys=ON"))
    user = await _user(sqlite_session)
    alert = UserAlert(id=uuid4(), user_id=user.id, kind="price_below", threshold_value=100)
    sqlite_session.add(alert)
    await sqlite_session.flush()
    ev = UserAlertEvent(id=uuid4(), user_id=user.id, alert_id=alert.id,
                        window_start_at=_days_ago(200), created_at=_days_ago(200))
    sqlite_session.add(ev)
    await sqlite_session.flush()
    sqlite_session.add(UserAlertDelivery(id=uuid4(), event_id=ev.id, channel="browser",
                                         status="pending"))
    await sqlite_session.commit()

    await retention_service.purge_alert_events(sqlite_session, older_than_days=90, batch_size=1000)
    await sqlite_session.commit()

    deliveries = (await sqlite_session.execute(text("SELECT id FROM user_alert_deliveries"))).all()
    assert deliveries == []


@pytest.mark.asyncio
async def test_purge_webhook_deliveries_only_terminal(sqlite_session: AsyncSession) -> None:
    user = await _user(sqlite_session)
    base = dict(user_id=user.id, created_at=_days_ago(60))
    delivered = UserWebhookDeliveryJob(id=uuid4(), status="delivered", **base)
    failed = UserWebhookDeliveryJob(id=uuid4(), status="failed", **base)
    queued = UserWebhookDeliveryJob(id=uuid4(), status="queued", **base)
    recent = UserWebhookDeliveryJob(id=uuid4(), status="delivered", user_id=user.id,
                                    created_at=_days_ago(5))
    sqlite_session.add_all([delivered, failed, queued, recent])
    await sqlite_session.commit()

    deleted = await retention_service.purge_webhook_deliveries(
        sqlite_session, older_than_days=30, batch_size=1000)
    await sqlite_session.commit()

    assert deleted == 2  # delivered + failed (old); queued and recent survive
    rows = (await sqlite_session.execute(text("SELECT status FROM user_webhook_delivery_jobs"))).all()
    statuses = sorted(r[0] for r in rows)
    assert statuses == ["delivered", "queued"]  # the recent delivered + the old queued


@pytest.mark.asyncio
async def test_purge_email_tokens_past_grace(sqlite_session: AsyncSession) -> None:
    user = await _user(sqlite_session)
    old = EmailVerificationToken(id=uuid4(), user_id=user.id, token_hash="a",
                                 email="a@x.com", expires_at=_days_ago(10))
    fresh = EmailVerificationToken(id=uuid4(), user_id=user.id, token_hash="b",
                                   email="b@x.com", expires_at=datetime.now(UTC) + timedelta(days=1))
    sqlite_session.add_all([old, fresh])
    await sqlite_session.commit()

    deleted = await retention_service.purge_email_tokens(
        sqlite_session, grace_days=7, batch_size=1000)
    await sqlite_session.commit()

    assert deleted == 1


@pytest.mark.asyncio
async def test_purge_export_jobs_old(sqlite_session: AsyncSession) -> None:
    user = await _user(sqlite_session)
    old = AccountExportJob(id=uuid4(), user_id=user.id, status="completed",
                           format="json.gz", created_at=_days_ago(60))
    new = AccountExportJob(id=uuid4(), user_id=user.id, status="completed",
                           format="json.gz", created_at=_days_ago(5))
    sqlite_session.add_all([old, new])
    await sqlite_session.commit()

    deleted = await retention_service.purge_export_jobs(
        sqlite_session, older_than_days=30, batch_size=1000)
    await sqlite_session.commit()

    assert deleted == 1


@pytest.mark.asyncio
async def test_purge_drains_in_batches(sqlite_session: AsyncSession) -> None:
    user = await _user(sqlite_session)
    alert = UserAlert(id=uuid4(), user_id=user.id, kind="price_below", threshold_value=100)
    sqlite_session.add(alert)
    await sqlite_session.flush()
    for _ in range(5):
        sqlite_session.add(UserAlertEvent(id=uuid4(), user_id=user.id, alert_id=alert.id,
                                          window_start_at=_days_ago(200), created_at=_days_ago(200)))
    await sqlite_session.commit()

    deleted = await retention_service.purge_alert_events(
        sqlite_session, older_than_days=90, batch_size=2)
    await sqlite_session.commit()

    assert deleted == 5  # drains fully across batches of 2
    rows = (await sqlite_session.execute(text("SELECT id FROM user_alert_events"))).all()
    assert rows == []
```

Note: the model constructors above (e.g. `UserAlert`, `UserAlertDelivery`, `EmailVerificationToken` fields) are best-effort — before running, open `src/app/db_base.py` and adjust each constructor to that model's actual required (NOT-NULL, no-default) columns. Keep the assertions and the `older_than_days`/`batch_size`/return-count contract unchanged.

- [ ] **Step 2: Run tests to verify they fail**

Run: `poetry run pytest tests/unit/services/test_retention_service.py -v`
Expected: FAIL with `ModuleNotFoundError: app.services.account.retention_service` (or AttributeError).

- [ ] **Step 3: Write the implementation**

```python
# src/app/services/account/retention_service.py
"""Periodic retention purges for stale account-related rows (deletes only)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import ColumnElement, delete, select
from sqlalchemy.orm import InstrumentedAttribute
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_base import (
    AccountExportJob,
    EmailVerificationToken,
    UserAlertEvent,
    UserWebhookDeliveryJob,
)

_WEBHOOK_TERMINAL_STATUSES: tuple[str, ...] = ("delivered", "failed")


def _utcnow() -> datetime:
    return datetime.now(UTC)


async def _purge_in_batches(
    db: AsyncSession,
    *,
    id_column: InstrumentedAttribute[Any],
    model: type[Any],
    condition: ColumnElement[bool],
    batch_size: int,
) -> int:
    """Delete rows matching `condition` in batches; drains fully. Mirrors session purge_expired."""
    total = 0
    while True:
        ids = [
            row[0]
            for row in (
                await db.execute(select(id_column).where(condition).limit(batch_size))
            ).all()
        ]
        if not ids:
            break
        await db.execute(delete(model).where(id_column.in_(ids)))
        total += len(ids)
        if len(ids) < batch_size:
            break
    return total


async def purge_alert_events(db: AsyncSession, *, older_than_days: int, batch_size: int) -> int:
    cutoff = _utcnow() - timedelta(days=older_than_days)
    return await _purge_in_batches(
        db,
        id_column=UserAlertEvent.id,
        model=UserAlertEvent,
        condition=UserAlertEvent.created_at < cutoff,
        batch_size=batch_size,
    )


async def purge_webhook_deliveries(
    db: AsyncSession, *, older_than_days: int, batch_size: int
) -> int:
    cutoff = _utcnow() - timedelta(days=older_than_days)
    condition = (UserWebhookDeliveryJob.status.in_(_WEBHOOK_TERMINAL_STATUSES)) & (
        UserWebhookDeliveryJob.created_at < cutoff
    )
    return await _purge_in_batches(
        db,
        id_column=UserWebhookDeliveryJob.id,
        model=UserWebhookDeliveryJob,
        condition=condition,
        batch_size=batch_size,
    )


async def purge_email_tokens(db: AsyncSession, *, grace_days: int, batch_size: int) -> int:
    cutoff = _utcnow() - timedelta(days=grace_days)
    return await _purge_in_batches(
        db,
        id_column=EmailVerificationToken.id,
        model=EmailVerificationToken,
        condition=EmailVerificationToken.expires_at < cutoff,
        batch_size=batch_size,
    )


async def purge_export_jobs(db: AsyncSession, *, older_than_days: int, batch_size: int) -> int:
    cutoff = _utcnow() - timedelta(days=older_than_days)
    return await _purge_in_batches(
        db,
        id_column=AccountExportJob.id,
        model=AccountExportJob,
        condition=AccountExportJob.created_at < cutoff,
        batch_size=batch_size,
    )
```

- [ ] **Step 4: Run tests + typecheck**

Run: `poetry run pytest tests/unit/services/test_retention_service.py -v`
Expected: PASS (6 passed). If a model constructor errors on a missing NOT-NULL column, fix the test's constructor (not the service) per the Step 1 note.

Run: `poetry run mypy --strict src/app/services/account/retention_service.py`
Expected: no issues.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/account/retention_service.py tests/unit/services/test_retention_service.py
git commit -m "feat(retention): add stale-row purge functions"
```

---

### Task 2: Retention sweep orchestrator

**Files:**
- Modify: `src/app/services/account/retention_service.py`
- Modify: `src/app/settings.py`
- Test: `tests/unit/services/test_retention_service.py` (add cases)

**Interfaces:**
- Consumes: the four `purge_*` functions; `settings.RETENTION_*`.
- Produces: `run_retention_sweep(session_factory: async_sessionmaker[AsyncSession]) -> dict[str, int]` returning `{"alert_events": n, "webhook_deliveries": n, "email_tokens": n, "export_jobs": n}`.

- [ ] **Step 1: Add the seven settings**

In `src/app/settings.py`, near the existing `SESSION_CLEANUP_*` block, add:

```python
    RETENTION_CLEANUP_WORKER_ENABLED: bool = True
    RETENTION_CLEANUP_INTERVAL_SEC: int = 86400
    RETENTION_CLEANUP_BATCH_SIZE: int = 1000
    RETENTION_ALERT_EVENTS_DAYS: int = 90
    RETENTION_WEBHOOK_DELIVERIES_DAYS: int = 30
    RETENTION_EMAIL_TOKEN_GRACE_DAYS: int = 7
    RETENTION_EXPORT_JOBS_DAYS: int = 30
```

- [ ] **Step 2: Write the failing orchestrator tests**

```python
# add to tests/unit/services/test_retention_service.py
from unittest.mock import AsyncMock
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.mark.asyncio
async def test_run_retention_sweep_returns_counts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(retention_service, "purge_alert_events", AsyncMock(return_value=3))
    monkeypatch.setattr(retention_service, "purge_webhook_deliveries", AsyncMock(return_value=2))
    monkeypatch.setattr(retention_service, "purge_email_tokens", AsyncMock(return_value=1))
    monkeypatch.setattr(retention_service, "purge_export_jobs", AsyncMock(return_value=0))

    class _FakeSession:
        async def __aenter__(self): return AsyncMock()
        async def __aexit__(self, *a): return False
    factory = lambda: _FakeSession()  # noqa: E731

    summary = await retention_service.run_retention_sweep(factory)  # type: ignore[arg-type]
    assert summary == {"alert_events": 3, "webhook_deliveries": 2,
                       "email_tokens": 1, "export_jobs": 0}


@pytest.mark.asyncio
async def test_run_retention_sweep_one_failure_does_not_abort(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(retention_service, "purge_alert_events",
                        AsyncMock(side_effect=RuntimeError("boom")))
    monkeypatch.setattr(retention_service, "purge_webhook_deliveries", AsyncMock(return_value=2))
    monkeypatch.setattr(retention_service, "purge_email_tokens", AsyncMock(return_value=1))
    monkeypatch.setattr(retention_service, "purge_export_jobs", AsyncMock(return_value=4))

    class _FakeSession:
        async def __aenter__(self): return AsyncMock()
        async def __aexit__(self, *a): return False
    factory = lambda: _FakeSession()  # noqa: E731

    summary = await retention_service.run_retention_sweep(factory)  # type: ignore[arg-type]
    assert summary["alert_events"] == 0  # failed target reported as 0
    assert summary["webhook_deliveries"] == 2
    assert summary["export_jobs"] == 4
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `poetry run pytest tests/unit/services/test_retention_service.py -k run_retention_sweep -v`
Expected: FAIL (`run_retention_sweep` not defined).

- [ ] **Step 4: Implement the orchestrator**

Add to `retention_service.py` (imports: add `structlog`, `from collections.abc import Awaitable, Callable`, `from sqlalchemy.ext.asyncio import async_sessionmaker`, `from app.settings import settings`; add `log = structlog.get_logger()`):

```python
async def run_retention_sweep(
    session_factory: async_sessionmaker[AsyncSession],
) -> dict[str, int]:
    """Run every retention purge in its own session; one failure never aborts the rest."""
    targets: list[tuple[str, Callable[[AsyncSession], Awaitable[int]]]] = [
        (
            "alert_events",
            lambda db: purge_alert_events(
                db,
                older_than_days=settings.RETENTION_ALERT_EVENTS_DAYS,
                batch_size=settings.RETENTION_CLEANUP_BATCH_SIZE,
            ),
        ),
        (
            "webhook_deliveries",
            lambda db: purge_webhook_deliveries(
                db,
                older_than_days=settings.RETENTION_WEBHOOK_DELIVERIES_DAYS,
                batch_size=settings.RETENTION_CLEANUP_BATCH_SIZE,
            ),
        ),
        (
            "email_tokens",
            lambda db: purge_email_tokens(
                db,
                grace_days=settings.RETENTION_EMAIL_TOKEN_GRACE_DAYS,
                batch_size=settings.RETENTION_CLEANUP_BATCH_SIZE,
            ),
        ),
        (
            "export_jobs",
            lambda db: purge_export_jobs(
                db,
                older_than_days=settings.RETENTION_EXPORT_JOBS_DAYS,
                batch_size=settings.RETENTION_CLEANUP_BATCH_SIZE,
            ),
        ),
    ]

    summary: dict[str, int] = {}
    for name, purge in targets:
        try:
            async with session_factory() as db:
                count = await purge(db)
                await db.commit()
            summary[name] = count
        except Exception as exc:
            log.warning("retention.purge_failed", target=name, err=str(exc))
            summary[name] = 0
    log.info("retention.sweep", **summary)
    return summary
```

- [ ] **Step 5: Run tests + typecheck**

Run: `poetry run pytest tests/unit/services/test_retention_service.py -v`
Expected: PASS (8 passed).

Run: `poetry run mypy --strict src/app/services/account/retention_service.py src/app/settings.py`
Expected: no issues.

- [ ] **Step 6: Commit**

```bash
git add src/app/services/account/retention_service.py src/app/settings.py tests/unit/services/test_retention_service.py
git commit -m "feat(retention): add sweep orchestrator + settings"
```

---

### Task 3: Worker + lifecycle wiring

**Files:**
- Create: `src/app/services/account/retention_cleanup_worker.py`
- Modify: `src/app/main.py`

**Interfaces:**
- Consumes: `run_retention_sweep`; `settings.RETENTION_CLEANUP_*`; `get_sessionmaker` from `app.db`.
- Produces: `start_retention_cleanup_worker() -> None`, `stop_retention_cleanup_worker() -> None`.

- [ ] **Step 1: Create the worker (mirror session_cleanup_worker.py)**

```python
# src/app/services/account/retention_cleanup_worker.py
"""Periodic sweep that purges stale account-related rows past their retention windows."""

from __future__ import annotations

import asyncio
from contextlib import suppress

import structlog

from app.db import get_sessionmaker
from app.services.account.retention_service import run_retention_sweep
from app.settings import settings

log = structlog.get_logger()

_worker_stop_event: asyncio.Event | None = None
_worker_task: asyncio.Task[None] | None = None


async def _sleep_or_stop(stop_event: asyncio.Event, seconds: float) -> None:
    try:
        await asyncio.wait_for(stop_event.wait(), timeout=seconds)
    except TimeoutError:
        return


async def _worker_loop(stop_event: asyncio.Event) -> None:
    interval = max(1, settings.RETENTION_CLEANUP_INTERVAL_SEC)
    while not stop_event.is_set():
        try:
            await run_retention_sweep(get_sessionmaker())
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.warning("retention.cleanup.sweep_failed", err=str(exc))
        await _sleep_or_stop(stop_event, interval)
    log.info("retention.cleanup.stopped")


async def start_retention_cleanup_worker() -> None:
    global _worker_stop_event, _worker_task
    if not settings.RETENTION_CLEANUP_WORKER_ENABLED:
        log.info("retention.cleanup.disabled")
        return
    if _worker_task is not None and not _worker_task.done():
        return
    _worker_stop_event = asyncio.Event()
    _worker_task = asyncio.create_task(
        _worker_loop(_worker_stop_event), name="retention_cleanup_worker"
    )
    log.info("retention.cleanup.started")


async def stop_retention_cleanup_worker() -> None:
    global _worker_stop_event, _worker_task
    if _worker_task is None:
        return
    if _worker_stop_event is not None:
        _worker_stop_event.set()
    task = _worker_task
    _worker_task = None
    _worker_stop_event = None
    try:
        await asyncio.wait_for(task, timeout=5.0)
    except TimeoutError:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
```

- [ ] **Step 2: Wire into the app lifespan in `main.py`**

In `src/app/main.py`:
1. Add an import next to the session-cleanup-worker import (~line 106):
```python
from app.services.account.retention_cleanup_worker import (
    start_retention_cleanup_worker,
    stop_retention_cleanup_worker,
)
```
2. Right after the `await start_session_cleanup_worker()` call (~line 226), add:
```python
        await start_retention_cleanup_worker()
```
3. Right after the `await stop_session_cleanup_worker()` call (~line 393), add:
```python
            await stop_retention_cleanup_worker()
```
Match the exact indentation of the neighboring session-worker calls at each site.

- [ ] **Step 3: Verify the app constructs + typecheck + lint**

Run: `poetry run python -c "from app.main import app; app()"`
Expected: no error (the lifespan imports resolve; mirror however `main.py`'s factory is invoked — if `app` is not callable, use `from app.main import create_app` / the real factory name found by grepping `def app`/`def create_app` in main.py).

Run: `poetry run mypy --strict src/app/services/account/retention_cleanup_worker.py src/app/main.py`
Expected: no issues.

Run: `poetry run ruff check src/app/services/account/retention_cleanup_worker.py src/app/main.py`
Expected: clean (ruff may auto-fix; include any change).

- [ ] **Step 4: Commit**

```bash
git add src/app/services/account/retention_cleanup_worker.py src/app/main.py
git commit -m "feat(retention): add cleanup worker + lifecycle wiring"
```

---

### Task 4: Full gate run

**Files:** none (verification).

- [ ] **Step 1: Run the full gates**

Run: `poetry run mypy && poetry run ruff check . && poetry run pytest tests/unit/services/test_retention_service.py -v`
Expected: mypy clean (all files), ruff clean, retention tests pass.

- [ ] **Step 2: Commit any lint fixups**

```bash
git add -A && git commit -m "chore(retention): satisfy mypy/ruff gates" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Four purge targets with correct filters + terminal-only webhook + cascade reliance → Task 1.
- Drain-in-batches idiom mirroring `purge_expired` → Task 1 `_purge_in_batches`.
- `run_retention_sweep` (per-target sessions, one-failure-tolerant, returns counts, logs) → Task 2.
- Seven settings with the spec's defaults → Task 2 Step 1.
- Standalone worker mirroring `session_cleanup_worker` + lifespan wiring → Task 3.
- Tests incl. cascade (with `PRAGMA foreign_keys=ON`), terminal-only, drain-in-batches, orchestrator resilience → Tasks 1–2.
- Gates (mypy strict / ruff / tests) → embedded + Task 4.
- Out-of-scope (no tables/migration/API; Timescale-managed data untouched) → honored; no task adds any.

**Placeholder scan:** No TBDs. The one explicitly-parameterized spot — test model constructors in Task 1 Step 1 — is called out: adjust each to the model's real required columns from `db_base.py` before running, keeping the contract/asserts fixed. The `app()` construction command in Task 3 names its own fallback (grep the real factory). No fabricated commands.

**Type consistency:** `purge_alert_events` / `purge_webhook_deliveries` (`older_than_days`, `batch_size`) / `purge_email_tokens` (`grace_days`, `batch_size`) / `purge_export_jobs` signatures match between Task 1 definition, Task 2 orchestrator calls, and the settings names. `run_retention_sweep(session_factory) -> dict[str,int]` matches between Task 2 (definition) and Task 3 (worker call with `get_sessionmaker()`). `_WEBHOOK_TERMINAL_STATUSES` consistent. Worker start/stop names match the Task 3 interface and the `main.py` imports.
