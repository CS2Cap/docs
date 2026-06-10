# Free-tier API-key multi-account abuse defense

**Date:** 2026-06-08
**Status:** Approved design — ready for implementation planning
**Repos:** `cs2c-api` (primary, backend enforcement) + `cs2cap` (frontend proxy + device cookie)

## Problem

Free-tier accounts each get an API key with a quota of `quota_requests_per_month`
(1,000 req/mo). Abusers multiply this quota by spinning up many accounts:

1. Sign in via Google OAuth with a throwaway Gmail identity.
2. Add and verify a bogus email address using a temp-mail / disposable-email
   service (verification is required before a key can be minted).
3. Generate an API key → 1,000 free requests/month.
4. Repeat → `N accounts × 1,000` requests.

The dominant signup path is **Google, almost exclusively**, and the constraint is
**near-zero friction for legitimate new users** — enforcement must be silent/soft
and a normal one-account-per-person user must never trip it.

### Why the obvious levers don't apply

- **Per-identity uniqueness is worthless** — Google identities are free to mint.
- **Provider-trust gating** (require Steam to unlock the full free tier) is real
  friction and was explicitly rejected.
- The system **captures nothing at signup today** — no IP, no device, no UA on the
  user or OAuth row.

### Current chokepoints (verified)

- API keys **require a verified email**:
  `_require_verified_email_for_key_generation` (`cs2c-api/src/app/api/account.py:324`)
  checks `email_verified_at`. OAuth users start with `email=None`, so they must add
  + verify an email to mint a key. **This email-verification step is the gate being
  defeated with temp-mail.**
- `api_users.email` is **unique** (`cs2c-api/src/app/db_base.py:496`) — every bypass
  needs a *fresh* disposable address.
- The monthly quota is `quota_requests_per_month` counted per user/key from the
  request log (`cs2c-api/src/app/db_base.py:1528`).
- **No disposable-email filtering exists** anywhere in the codebase today.

## Solution overview

Two layers, highest-leverage / lowest-effort first. A third (quota-pooling) is held
in reserve and is out of scope for this spec.

- **Layer 1 — Disposable-email blocking** at email add/verify. Directly defeats the
  current method; ~zero friction.
- **Layer 2 — Device + IP velocity cap** at key issuance. Catches abusers who find a
  disposable domain not yet on the list, or a real throwaway inbox.

---

## Layer 1 — Disposable-email blocking (primary)

### Components

1. **`assert_deliverable_email_domain(email: str)`** — new validator, likely in a new
   module `cs2c-api/src/app/services/account/email_domain_policy.py`.
2. **Static denylist asset** — the open-source `disposable-email-domains` list
   (~50k domains) vendored as a static file, loaded into a `frozenset[str]` once at
   startup.
3. **`email_domain_rules` DB table** — fast manual override without a deploy:
   - `domain: str` (PK, normalized lowercase)
   - `action: str` — `"deny"` | `"allow"`
   - `note: str | None`
   - `created_at: datetime`
   - Loaded/cached in memory with a short TTL (e.g. 60s) so admin edits take effect
     quickly without per-request DB hits.
4. **MX-record check (optional, cached)** — reject domains with no mail exchanger;
   result cached in Redis (e.g. 24h TTL) keyed by domain.

### Validation order

```
normalize_email(email)                      # existing helper
domain = part after '@'
if domain in db_overrides allow-set:  -> OK  # allow always wins
if domain in db_overrides deny-set:   -> REJECT
if domain in static denylist:         -> REJECT
if MX check enabled and no MX:        -> REJECT
-> OK
```

Allow-overrides take precedence over every deny source, so a false-positive on the
static list can be unblocked instantly via the table.

### Insertion points (`cs2c-api/src/app/api/account.py`)

Invoke the validator **before any verification email is sent**, at:

- `set_missing_email` (account.py:1821)
- `change_email` (account.py:1907)

Defensively also inside `send_email_change`
(`cs2c-api/src/app/services/email/email_verification_service.py:128`) so no caller can
bypass it.

### Error handling

- On rejection: `HTTP 422` with friendly `detail`:
  `"Please use a permanent email address to generate an API key."`
- MX-lookup failures (DNS timeout/error) must **fail open** (treat as deliverable) so
  transient DNS issues never block legitimate users; log at warning level.

---

## Layer 2 — Device + IP velocity cap at key issuance (residual)

### Device signal path

1. **`cs2c_device_id` cookie** — long-lived, httpOnly, first-party, set once per
   browser from the cs2cap **root layout** (server-side; generate a random opaque id
   if absent). Set well before any key-issuance call so it is reliably present.
2. **Proxy forwarding** — extend the `/api/cs2c` proxy
   (`cs2cap/src/app/api/cs2c/[...path]/route.ts`, which today forwards only
   content-type / bearer / session cookie) to forward `cs2c_device_id` to the API as
   an `x-cs2c-device-id` request header.
3. **API read** — the key-issuance handlers read `x-cs2c-device-id`. Fallback to
   `extract_client_ip` (`cs2c-api/src/app/request_ip.py`, already CF-aware) when the
   header is absent (cookie cleared / incognito).

### Velocity check

- Reuse the Redis sliding-window primitives in `cs2c-api/src/app/ratelimit.py`.
- Count **distinct `user_id`s that have minted a key** from the same `device_id`
  (primary) or IP (fallback) within the rolling window.
- Thresholds (approved; expose as settings env vars with these defaults):
  - **> 2 distinct accounts in 24h** per device/IP → block
  - **> 4 distinct accounts in 30d** per device/IP → block
- Recorded at successful key mint; checked at the start of issuance.

### Insertion points

Alongside `_require_verified_email_for_key_generation` (account.py:324), in:

- `reissue_key` (account.py:651)
- `create_sub_key` (account.py:734)

### Error handling

- On trip: `HTTP 429` with a friendly message indicating an existing account already
  exists for this device and to contact support.
- **Only new key minting from a flagged fingerprint is blocked.** Existing keys,
  existing account logins, and quota usage are untouched.

---

## Cross-cutting concerns

### Observability

- Prometheus counters:
  - `EMAIL_DOMAIN_BLOCKED_TOTAL{source="static|override|mx"}`
  - `KEY_ISSUANCE_VELOCITY_BLOCKED_TOTAL{signal="device|ip"}`
- Structured log lines on every block including `device_id` and `ip`, enabling
  fingerprint clustering and feeding the existing admin `merge_accounts` workflow
  (`cs2c-api/src/app/api/admin/users.py:43`) for reactive cleanup.

### Configuration

- `email_domain_rules` table is admin-editable (manual deny/allow without deploy).
- Velocity thresholds and the MX-check toggle are settings env vars.

### CI gates (backend)

- Must pass **mypy strict**.
- Every new Pydantic schema property must carry `Field(description=...)` (enforced by
  cs2c-api OpenAPI CI).

### Testing

- **Unit — domain validator:** deny via static list; deny via override; allow-override
  beats static deny; MX-missing rejection; MX-lookup failure fails open;
  normalization edge cases (case, plus-addressing, surrounding whitespace).
- **Unit — velocity counter:** window rollover at 24h and 30d boundaries;
  device-primary vs IP-fallback selection; threshold boundary (2 OK / 3rd blocked in
  24h; 4 OK / 5th blocked in 30d).
- **Endpoint:** `422` on disposable email at `set_missing_email` / `change_email`;
  `429` past the velocity cap at `reissue_key` / `create_sub_key`; happy-path key
  issuance for a clean fingerprint + permanent email still succeeds.

## Out of scope (reserve — Layer 3)

If L1 + L2 prove leaky: **pool the monthly quota by issuing-device fingerprint** —
stamp each `APIKey` with its issuing `device_id` at creation and, for the free tier,
enforce `quota_requests_per_month` summed across all keys sharing that fingerprint.
This removes the payoff entirely regardless of account count, but touches the
quota-enforcement hot path (API calls are server-to-server with no browser cookie, so
the fingerprint must be bound at issuance time, not per request). Documented here so
the L1/L2 capture surfaces are built fingerprint-aware and ready to extend.
