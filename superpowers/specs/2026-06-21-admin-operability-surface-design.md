# Admin Operability Surface — Design

**Date:** 2026-06-21
**Status:** Approved (design); pending implementation plan
**Goal:** Make every routine operations and support workflow achievable through `/admin/*`
endpoints alone, eliminating the current fallbacks to `psql` and `redis-cli`.

---

## Background

An audit of the existing admin surface (`src/app/api/admin/`) found strong coverage of
accounts, API keys, billing webhook reconciliation, queue/scheduler control, and provider/job
observability — but six operational blind spots that currently force direct DB/Redis access:

1. No failed-job recovery path (dead-letter list is read-only and bare).
2. Abuse bans and email-domain rules are write-only (no list, no revoke).
3. No user lookup by email or key prefix.
4. No write-behind / cache freshness visibility.
5. No runtime-config visibility.
6. No queryable admin audit trail (mutations only hit structlog).

This design closes all six through additive admin endpoints. No existing public contract
changes. No change to the indexed-only / write-behind invariants.

---

## Grounding findings (verified against code)

- **Dead-letter queue** `cs2capi:failed_jobs` (worker `consumer.py`) stores **bare `job_id`
  strings only** — no reason, timestamp, or attempt count.
- **`job_execution` table** (`db_base.py:1570`) already carries `error_type`, `error_message`,
  `attempt`, `status`, `started_at`, `finished_at`. Failure detail for a dead-lettered job is
  obtained by joining the `job_id` to its most-recent `job_execution` row — **no worker
  contract change required.**
- **Ban / rule tables are clean and queryable:** `account_email_bans` (`id, email_identity,
  email, note, created_at`), `account_ip_bans` (`ip_address` PK, `source_email_identity,
  source_user_id, note, created_at`), `email_domain_rules` (`domain` PK, `action, note,
  created_at`).
- **Cache invalidation on delete is required:** IP bans are cached in Redis
  (`abuse_ban_service._set_ip_ban_cache` / `_cache_ip_ban`); domain rules use an in-process
  override cache (`email_domain_policy.reset_override_cache` / `_load_overrides`).
- **Force-flush and re-ingest already exist.** `flush_prices_writebehind`,
  `flush_bids_writebehind` are in `CUSTOM_ACCOUNT_JOB_IDS`, and every provider ingest job is in
  `PROVIDER_JOBS`; both sets are in `KNOWN_QUEUE_JOB_IDS`, so they are already enqueueable via
  `POST /admin/queue/jobs`. Therefore the cache gap reduces to read-only status; no new
  mutation endpoints are added, and no raw index-drop is introduced (would violate the
  indexed-only / no-DB-fallback invariant on `/v1/prices` and `/v1/bids`).
- **Dirty-row backlog is already computed** by `write_behind._price_flush_stats()` /
  `_bid_flush_stats()`.
- **Admin auth is a single shared token** (`security/admin_auth.verify_admin_token`, no per-user
  identity). Audit actor is therefore token-level.

---

## Endpoint design

All endpoints: prefix `/admin`, `Depends(verify_admin_token)`, `tags=["Admin"]`. All errors
raised via `AppHTTPException` with a `code` from `error_codes.py` (new codes added where no
existing code fits). All **mutations** (POST/PATCH/DELETE) write a structlog line **and** an
`admin_audit_log` row.

### 1. Failed-job recovery — new router `src/app/api/admin/failed_jobs.py`

Reuses `_clear_dead_letter_entry` (lrem), `enqueue_pending_job`, `clear_job_runtime_state`,
`_has_any_running_marker`, and the `job_execution` join for failure detail.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/admin/failed-jobs` | Enriched list: `job_id`, plus latest `error_type`, `error_message`, `attempt`, `finished_at` from `job_execution`. |
| POST | `/admin/failed-jobs/{job_id}/retry` | `clear_job_runtime_state` → remove from `failed_jobs` → `enqueue_pending_job`. `409` if a running marker exists; `409` if queue full. |
| DELETE | `/admin/failed-jobs/{job_id}` | Remove from dead-letter list only (no retry). |
| POST | `/admin/failed-jobs/retry-all` | Iterate the dead-letter list applying the single-retry logic; return a per-job result map (`queued` / `skipped:<reason>`). |

`job_id` validated against `KNOWN_QUEUE_JOB_IDS` (reuse `_validate_known_job_id`).

### 2. Abuse bans + domain rules list/delete — extend existing routers

`src/app/api/admin/abuse_bans.py`:

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/admin/abuse/email-bans` | Paginated list of `account_email_bans`. |
| DELETE | `/admin/abuse/email-bans/{id}` | Delete row by `id`. |
| GET | `/admin/abuse/ip-bans` | Paginated list of `account_ip_bans`. |
| DELETE | `/admin/abuse/ip-bans/{ip_address}` | Delete row **and invalidate the IP-ban Redis cache** for that IP. |

`src/app/api/admin/email_domain_rules.py`:

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/admin/email-domain-rules` | List all rules. |
| DELETE | `/admin/email-domain-rules/{domain}` | Delete by `domain` and call `reset_override_cache()`. |

List/delete query and mutation logic live in / extend the existing services
(`abuse_ban_service`, `email_domain_policy`) — routers stay thin. New service functions:
`list_email_bans`, `delete_email_ban`, `list_ip_bans`, `delete_ip_ban` (clears cache),
`list_email_domain_rules`, `delete_email_domain_rule` (resets override cache).

### 3. User lookup — extend `GET /admin/users` (`users.py:917`)

Add two optional, additive query params:

- `email`: exact match on canonicalized email identity.
- `q`: partial match on email or user id (ILIKE / prefix).

Existing `tier` / `is_active` / `account_stage` / `limit` / `offset` semantics unchanged.
No response-shape change.

### 4. Cache / write-behind status (read-only) — new router `src/app/api/admin/cache_ops.py`

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/admin/cache/write-behind/status` | Dirty-row backlog from `_price_flush_stats()` / `_bid_flush_stats()`, last flush bucket timestamp, and per-provider index age. |

**No mutation endpoints.** Force-flush and re-ingest are performed through the existing
`POST /admin/queue/jobs` with `flush_prices_writebehind` / `flush_bids_writebehind` /
`<provider>` ingest job ids; this is documented in `API_REFERENCE.md`.

### 5. Runtime config visibility — new router `src/app/api/admin/config.py`

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/admin/config` | Read-only effective settings, **safe subset only**. |

An explicit allowlist of behaviorally-significant, non-secret settings is exposed (e.g.
`WRITE_BEHIND_ENABLED`, `WRITE_BEHIND_FLUSH_INTERVAL_SEC`, `WRITE_BEHIND_MISSING_GRACE_MULTIPLIER`,
`PRICES_INDEX_STRICT_MODE`, `BIDS_INDEX_STRICT_MODE`, analytics timeouts, `QUEUE_BACKLOG_LIMIT`,
`SCHEDULER_LOCK_TTL_SEC`, `CACHE_TTL_MULTIPLIER`). Secrets (tokens, API keys, DSNs, signing
keys) are **never** included — implemented as an allowlist, not a denylist, so a newly added
secret cannot leak by default.

### 6. Minimal audit log — new table + recorder + router `src/app/api/admin/audit.py`

**New table `admin_audit_log`** (model in `db_base.py`, Alembic migration):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | `gen_random_uuid()` |
| `actor` | varchar | `X-Admin-Actor` header if present, else `"admin"` |
| `source_ip` | varchar nullable | request client IP |
| `action` | varchar | dotted code, e.g. `ban.email.delete`, `failed_job.retry` |
| `target_type` | varchar nullable | e.g. `user`, `email_ban`, `job` |
| `target_id` | varchar nullable | id/key of the affected entity |
| `at` | timestamptz | `now()`, indexed desc |

Index on `(action, at desc)` and `(target_id, at desc)` for the query endpoint.

**Recorder:** a small shared helper (e.g. `services/admin/audit_service.record_admin_action`)
called by each mutation handler after the mutation commits. Reads are **not** logged.

> Actor limitation (documented): because admin auth is a single shared token, `actor` reflects
> the optional `X-Admin-Actor` request header for human attribution and falls back to `"admin"`.
> This is not authenticated per-user identity.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/admin/audit-log` | Filter by `action`, `target_id`, and time range; paginated (offset/limit, consistent with `/admin/users`). |

---

## Cross-cutting concerns

- **Architecture rules:** routers thin; query/mutation logic in services and repositories;
  response models (not ORM rows) returned.
- **Error semantics:** `AppHTTPException` only; add `error_codes.py` entries where needed
  (e.g. failed-job-not-found, ban-not-found, domain-rule-not-found).
- **Observability:** preserve structlog patterns; mutations additionally write `admin_audit_log`.
  No new Prometheus metrics required (existing counters suffice); if any are added they follow
  `cs2capi_*`.
- **Migration:** only `admin_audit_log` is new and additive/reversible. Bans, rules, jobs reuse
  existing tables.
- **Cache contracts:** the only cache interaction is **invalidation on delete** (IP-ban Redis
  cache, domain-override cache). No new keys; `CACHE_KEYS.md` unaffected (audit log is DB-only).

## Testing

- Integration tests per endpoint: happy path, `404` (missing target), `409` (failed-job retry
  while running / queue full), and explicit cache-invalidation assertions for ban/rule deletes.
- Unit tests: audit recorder; failed-job enrichment join; config allowlist (assert no secret
  key escapes).
- Focused validation per `CLAUDE.md`: Ruff + mypy on changed paths, affected integration tests,
  `alembic upgrade head` for the new table. `scripts/check.sh` as the pre-commit gate
  (endpoint-contract + generated-artifact + migration change).

## Documentation

- `internal/API_REFERENCE.md` — all new endpoints + the "force-flush/re-ingest via
  `POST /admin/queue/jobs`" note.
- `internal/ROUTE_TO_SERVICE_MAP.md` — new routes → services.
- `internal/DATA_MODEL.md` — `admin_audit_log` table.
- Regenerate full + filtered OpenAPI.

## Out of scope (explicitly)

- Before/after diffing in the audit log.
- Raw index drop / invalidate (unsafe under indexed-only / no-DB-fallback).
- New cache mutation endpoints (covered by existing enqueue path).
- Multi-admin RBAC / per-user authenticated identity.
