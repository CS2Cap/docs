# Consent Record Foundation (SP1) — Design

**Date:** 2026-06-21
**Roadmap item:** Tier 2 #1 — `consent_record` + retention policies (cs2cap `ROADMAP.md`)
**Repos:** `cs2c-api` (backend-led) + `cs2cap` (thin FE)

## Context

The GDPR machinery this item complements already ships: `account_export_service.py`
(data portability) and `account_deletion_service.py` (PII scrub + usage-log
anonymization). The missing companion is a record of **which version of which policy
each user accepted, when, and from where** — versioned policy acceptance.

This spec covers **SP1**, the first of three decomposed sub-projects under a
"Consent & Retention" epic:

- **SP1 — Consent record foundation** (this spec): versioned policy registry +
  `user_consent_records` audit log + recording at signup + a session-authenticated
  consent surface + export/deletion integration + marketing-toggle rewiring.
- **SP2 — Cookie/analytics consent gating** (future spec): a consent banner +
  re-consent gate that reads the staleness SP1 exposes and writes through SP1's API;
  gates PostHog. FE-heavy. Depends on SP1.
- **SP3 — Automated data retention** (future spec): scheduled purge of stale data.
  Independent of SP1/SP2.

SP1 deliberately does **not** block anything; it records and exposes staleness so SP2
can build the gate.

### Current-state facts (verified 2026-06-21)

- Latest migration is `0084`. New migration is `0085`.
- `find_or_create_oauth_user` (`services/auth/oauth_service.py:153`) already receives
  `ip` and returns `(user, tier, is_new_user)`. New users are created in the
  `is_new_user` branch (~line 223).
- A marketing/product-update preference already exists:
  `UserAccountPreferences.product_update_emails_enabled` (`db_base.py:615`,
  `server_default="false"`). SP1 **reuses** this toggle and records its changes as
  consent events — it does not add a duplicate control.
- The portfolio surface establishes the precedent for session-authenticated web
  endpoints: routes are `clone_api_route`'d onto a `/v1/web/...` surface guarded by
  `SurfaceEndpointAccessChecker` (vs API-key-only `/v1/...`).
- Account export builds its payload in `account_export_service._build_export_payload`;
  account deletion deletes per-user rows in `account_deletion_service.delete_user_account`.
- FE policy pages: `cs2cap/src/app/(public)/terms/page.tsx` and `.../privacy/page.tsx`,
  each with a hardcoded `lastUpdated = "April 18, 2026"`.

## Scope decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Consent types | Legal agreements (`tos`, `privacy`) + `marketing` opt-in |
| Version source of truth | Backend constant + public endpoint; FE reads it |
| Recording model | Record implied acceptance at signup; expose staleness; **no blocking** |
| Existing users | Backfill legacy-implied rows → read as consented-to-current |
| FE in SP1 | Yes — rewire the marketing toggle to record consent events |

## Architecture

### 1. Policy version registry

New module `app/services/account/policy_versions.py`:

```python
@dataclass(frozen=True)
class PolicyVersion:
    version: str       # == the policy's lastUpdated date, e.g. "2026-04-18"
    effective_at: date

CURRENT_POLICY_VERSIONS: dict[str, PolicyVersion] = {
    "tos":     PolicyVersion(version="2026-04-18", effective_at=date(2026, 4, 18)),
    "privacy": PolicyVersion(version="2026-04-18", effective_at=date(2026, 4, 18)),
}
```

Bumping a policy = edit this constant **and** the FE policy text in one PR. No table,
no admin UI (the policy text lives in FE React; a metadata-only registry table would
be half-useful — explicitly rejected).

Exposed via **public** `GET /v1/policy-versions` (no auth, in `account_public.py`):

```json
{ "policies": { "tos": {"version": "2026-04-18", "effective_at": "2026-04-18"},
                "privacy": {"version": "2026-04-18", "effective_at": "2026-04-18"} } }
```

### 2. Data model — `user_consent_records` (migration `0085`)

Append-only audit log. The latest record per `(user_id, consent_type)` is the current
state; rows are never mutated.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | `server_default gen_random_uuid()` |
| `user_id` | uuid, FK → `api_users.id` `ON DELETE CASCADE` | |
| `consent_type` | `String(16)` | `'tos' \| 'privacy' \| 'marketing'`; plain string (open) so SP2 adds `'analytics'` with no migration |
| `version` | `String(32)` nullable | policy version for tos/privacy; `NULL` for marketing |
| `granted` | `Boolean` | tos/privacy always `true`; marketing `true`=opt-in / `false`=withdraw |
| `method` | `String(16)` | `'signup' \| 'explicit' \| 'backfill'` |
| `source_ip` | `String(45)` nullable | |
| `user_agent` | `String(512)` nullable | |
| `created_at` | `DateTime(timezone=True)` | `server_default now()` |

Index: `ix_user_consent_user_type_created` on `(user_id, consent_type, created_at DESC)`.

SQLAlchemy model `UserConsentRecord` added to `db_base.py`.

### 3. Service — `app/services/account/consent_service.py`

- `record_signup_consent(db, user, *, ip, user_agent) -> None`
  Writes `tos` + `privacy` rows at current versions, `method='signup'`, `granted=True`.
- `record_explicit_consent(db, user_id, *, accept_policies, marketing, ip, user_agent) -> None`
  Writes a row per policy in `accept_policies` (at current version, `method='explicit'`).
  If `marketing` is not `None`, writes a `marketing` row (`granted=marketing`) **and**
  updates `UserAccountPreferences.product_update_emails_enabled` to match (single source
  of truth for the live preference state remains the prefs row).
- `get_consent_state(db, user_id) -> ConsentState`
  Per-type latest version + `granted` + `outstanding: bool`. `outstanding` is `True` for
  `tos`/`privacy` when the latest accepted version differs from
  `CURRENT_POLICY_VERSIONS[...].version` (or no record exists). Marketing reflects the
  pref and is never `outstanding`.
- `serialize_consent_for_export(db, user_id) -> list[dict]`
  Full ordered history for the export payload.

### 4. Endpoints

Defined on the API-key router, then `clone_api_route`'d to the session-authenticated
`/v1/web` surface (portfolio precedent), guarded by `SurfaceEndpointAccessChecker`.

- `GET /v1/account/consent` → `ConsentStateResponse` (per-type state + `outstanding`).
- `POST /v1/account/consent` → body `ConsentUpdateRequest`
  `{ accept_policies: list[str] = [], marketing: bool | None = None }`; returns the
  updated `ConsentStateResponse`. Captures `request.client.host` / `User-Agent`.
- Cloned: `GET`/`POST /v1/web/account/consent`.
- Public: `GET /v1/policy-versions` → `PolicyVersionsResponse`.

All Pydantic schema fields carry `Field(description=...)` (CI gate). New schemas live in
`schemas.py` alongside existing account schemas. New `ErrorCode` only if needed (likely
not — invalid policy names → 422 via validation).

### 5. Signup integration

Thread `user_agent` into `find_or_create_oauth_user` (add a `user_agent: str | None`
param; `ip` already present) and its caller(s). In the `is_new_user` branch, after the
user is committed, call `record_signup_consent(db, new_user, ip=ip, user_agent=user_agent)`.
A failure here must not break signup — wrap in try/except with a structured warning log
(consent backfill can recover via the explicit endpoint).

### 6. Export + deletion integration

- `_build_export_payload`: add `"consent_records": await serialize_consent_for_export(...)`.
- `delete_user_account`: add explicit
  `await db.execute(delete(UserConsentRecord).where(UserConsentRecord.user_id == user_id))`
  for parity with sibling deletes (the CASCADE FK also covers it).

### 7. Backfill (within migration `0085`)

After `create_table`, a set-based insert in the same migration:

```sql
INSERT INTO user_consent_records (id, user_id, consent_type, version, granted, method, created_at)
SELECT gen_random_uuid(), u.id, ct.consent_type, :version, true, 'backfill', now()
FROM api_users u
CROSS JOIN (VALUES ('tos'), ('privacy')) AS ct(consent_type);
```

`:version` is the current tos/privacy version (`'2026-04-18'`; both share it today —
parameterize per type if they diverge). No marketing backfill (opt-in stays
explicit/default-off). `downgrade()` drops the index then the table.

### 8. Frontend (`cs2cap`, thin)

- Account settings: the existing **product-update-emails** toggle becomes the
  marketing-consent control. Toggling it now calls `POST /v1/web/account/consent`
  with `{ marketing: <bool> }` (which records the consent event and flips the pref)
  instead of the plain preferences PATCH. The displayed state continues to read from
  the preferences/consent state.
- *Optional polish (noted, not required for SP1):* wire `/terms` and `/privacy`
  `lastUpdated` to read from `GET /v1/policy-versions` so the date can't drift from the
  recorded version.

## Out of scope (SP1)

- Re-consent **blocking** gate / `required_actions` integration → SP2.
- Cookie/analytics banner and PostHog gating → SP2.
- Automated retention/purge worker → SP3.
- A policy-document **registry table** / admin editing of policy text → rejected (text
  lives in FE; metadata-only table is half-useful with no consumer).
- Recording an `analytics` consent type now → schema is open to it; populated by SP2.

## Success criteria

Unit (`consent_service`):
- Signup records exactly two rows (`tos`, `privacy`) at current versions, `method='signup'`.
- `get_consent_state` reports `outstanding=False` when latest accepted == current and
  `True` when it differs or is absent.
- Explicit accept of a stale policy flips `outstanding` → `False`.
- Marketing toggle writes a `marketing` row **and** updates
  `product_update_emails_enabled`.

Integration:
- `GET`/`POST /v1/web/account/consent` work under web-session auth and reject API-key-only
  callers per `SurfaceEndpointAccessChecker` behavior (mirroring portfolio).
- `GET /v1/policy-versions` is reachable without auth.
- Export payload includes `consent_records`; account deletion removes consent rows.

Migration:
- `0085` upgrade creates the table + index and backfills tos/privacy rows for all
  existing users; `downgrade` is clean.

Gates (per cs2c-api CI):
- `mypy --strict` clean, `ruff` clean, `Field(description=...)` on every new schema prop,
  portfolio/consent integration tests green.

FE:
- `pnpm lint` + `pnpm build` clean; marketing toggle round-trips through the consent
  endpoint.
