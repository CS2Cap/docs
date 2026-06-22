# Data-Retention Purge Worker (SP3) — Design

**Date:** 2026-06-22
**Roadmap item:** Tier 2 #1 — `consent_record` + retention, SP3 (final piece of the epic)
**Repo:** `cs2c-api` (backend only)

## Context

The consent/retention epic: SP1 (consent record foundation) and SP2 (analytics consent
banner) shipped. SP3 is the "retention policies" half — a periodic worker that purges stale
relational rows that today accumulate unbounded and are only ever cleaned per-account on
deletion.

### What already has retention (verified — excluded from SP3)

- **Price / sales / candle history** — Timescale retention policies (alembic `0009`, `0012`,
  `0050`) own these hypertables.
- **`api_usage_log`** — a Timescale hypertable (`create_hypertable('api_usage_log','time')`).
  Billing-relevant; if ever capped, the correct tool is a Timescale retention policy in a
  migration, **not** a row-delete worker. Excluded.
- **Account export payloads** — `cleanup_expired_export_artifacts` (a job in
  `account_background_jobs`) already clears Redis payloads.
- **Web sessions** — `session_cleanup_worker.py` already purges expired/revoked rows.
- **Per-user data on account deletion** — `account_deletion_service.delete_user_account`.

### The genuine gaps (SP3 targets — confirmed by brainstorming)

| Table | Cleaned today? |
|---|---|
| `user_alert_events` (+ `user_alert_deliveries`) | only on account deletion |
| `user_webhook_delivery_jobs` (+ `user_webhook_delivery_attempts`) | only on account deletion |
| `email_verification_tokens` | only on account deletion |
| `account_export_jobs` (metadata rows; payload already cleared) | never (rows linger) |

### Verified facts (2026-06-22)

- Cascades are DB-enforced: `user_alert_deliveries.event_id` → `user_alert_events.id`
  `ON DELETE CASCADE`; `user_webhook_delivery_attempts.job_id` →
  `user_webhook_delivery_jobs.id` `ON DELETE CASCADE`. Deleting the parent removes children.
- Relevant columns: `user_alert_events.created_at`; `user_webhook_delivery_jobs.status` +
  `created_at`; `email_verification_tokens.expires_at`; `account_export_jobs.created_at`.
- `session_cleanup_worker.py` is the worker template; it is started/stopped in `main.py`
  lifespan at lines 226 / 393.
- `account_background_jobs.py` already runs `cleanup_expired_export_artifacts` as a periodic
  job — confirming periodic maintenance is an established concern.

## Architecture

A standalone periodic worker (mirroring `session_cleanup_worker.py`) plus a service holding
per-target purge logic. The standalone-worker pattern is chosen over adding a job to
`account_background_jobs` because it is more isolated and testable and matches the closest
precedent (session cleanup is the same shape: a batched sweep of stale rows past a window).

### 1. `app/services/account/retention_service.py` (new)

Each function deletes up to `batch_size` oldest matching rows and returns the count
(testable via `sqlite_session`):

- `purge_alert_events(db, *, older_than_days: int, batch_size: int) -> int` — delete
  `user_alert_events` where `created_at < now - older_than_days` (cascades to
  `user_alert_deliveries`).
- `purge_webhook_deliveries(db, *, older_than_days: int, batch_size: int) -> int` — delete
  `user_webhook_delivery_jobs` where `status IN ('delivered','failed')` AND
  `created_at < now - older_than_days` (cascades to `user_webhook_delivery_attempts`).
  Non-terminal jobs (`queued`/`retry`) are never purged.
- `purge_email_tokens(db, *, grace_days: int, batch_size: int) -> int` — delete
  `email_verification_tokens` where `expires_at < now - grace_days`.
- `purge_export_jobs(db, *, older_than_days: int, batch_size: int) -> int` — delete
  `account_export_jobs` where `created_at < now - older_than_days`.
- `run_retention_sweep(session_factory) -> dict[str, int]` — orchestrator: runs each target
  in its own session/commit, returns `{target: count}`, logs one structured line, and wraps
  each target so a failure logs a warning and the sweep continues.

Batched deletes (a `LIMIT`-bounded subquery/CTE selecting ids, then `DELETE ... WHERE id IN
(...)`) keep transactions short; the daily interval drains any backlog across sweeps — the
same model as `session_cleanup`.

### 2. `app/services/account/retention_cleanup_worker.py` (new)

Structurally a copy of `session_cleanup_worker.py`: `_worker_loop` calling
`run_retention_sweep` on `RETENTION_CLEANUP_INTERVAL_SEC`, with
`start_retention_cleanup_worker()` / `stop_retention_cleanup_worker()` using the same
stop-event + timeout-cancel lifecycle, gated by `RETENTION_CLEANUP_WORKER_ENABLED`.

### 3. Settings (`app/settings.py`)

```python
RETENTION_CLEANUP_WORKER_ENABLED: bool = True
RETENTION_CLEANUP_INTERVAL_SEC: int = 86400        # daily
RETENTION_CLEANUP_BATCH_SIZE: int = 1000
RETENTION_ALERT_EVENTS_DAYS: int = 90
RETENTION_WEBHOOK_DELIVERIES_DAYS: int = 30
RETENTION_EMAIL_TOKEN_GRACE_DAYS: int = 7
RETENTION_EXPORT_JOBS_DAYS: int = 30
```

### 4. Lifecycle wiring (`app/main.py`)

Import and call `start_retention_cleanup_worker()` next to `start_session_cleanup_worker()`
(~line 226) and `stop_retention_cleanup_worker()` next to its stop (~line 393).

## Out of scope

- No new tables, no migration (deletes only). No API surface.
- Timescale-managed data and already-cleaned data (see Context).
- No change to the dedupe/alerting logic — only *old* alert events are purged; the dedupe
  window (`window_start_at` uniqueness) operates on recent data and is unaffected.

## Error handling

Per-target try/except inside the sweep (warn + continue), matching existing worker
resilience. No partial-cascade risk — cascades are DB-enforced in one statement.

## Success criteria (tests)

Unit (`sqlite_session`, per purge function):
- Rows older than the window are deleted; newer rows survive.
- Cascade children are removed with their parent (enable `PRAGMA foreign_keys=ON` for the
  sqlite test connection, or assert child removal explicitly).
- Webhook purge skips non-terminal (`queued`/`retry`) jobs.
- `batch_size` caps the number deleted in one call.

Orchestrator:
- `run_retention_sweep` returns per-target counts and one failing target does not abort the
  others (inject a failure and assert the rest still run).

Gates (cs2c-api CI): `mypy --strict` clean, `ruff` clean, new retention tests green.
