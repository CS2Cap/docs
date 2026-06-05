# Active Sessions UI (frontend)

**Date:** 2026-06-05
**Repo:** `cs2cap` (Next.js frontend) — frontend-only
**Consumes:** `cs2c-api` PR #28 session-hardening endpoints (`/v1/account/sessions`).
**Status:** Design approved; pending implementation plan.

## Goal

Let a signed-in user see and manage their active browser sessions ("devices") from
account settings: view the list, revoke a single device, and "sign out all other
devices". This surfaces the durable `user_sessions` table built in `cs2c-api`.

## Scope

**In scope (cs2cap):**

- Session types in `src/lib/api/types.ts`.
- `webApi` methods in `src/lib/api/client.ts` for the 3 endpoints.
- A query hook + two mutation hooks in `src/lib/api/hooks.ts` (+ `queryKeys` entry).
- A `SessionsSection` client component rendered inside `/account/settings`.

**Out of scope:**

- Dedicated `/account/sessions` route (chosen: a section in settings).
- New-device / anomaly alerts, login history, geo lookup.
- Any backend change (the endpoints already exist on the API).

## Backend contract (already shipped on cs2c-api PR #28)

- `GET /v1/account/sessions` → `{ "sessions": SessionInfo[] }`, sorted `last_seen_at` desc, active only.
- `DELETE /v1/account/sessions/{id}` → `{ "revoked": 1 }`, `404` if not owned/active.
- `DELETE /v1/account/sessions` → `{ "revoked": <count> }` (revokes all except the current session; with no session cookie it revokes all).

`SessionInfo`: `id` (uuid), `created_at`, `last_seen_at`, `expires_at` (ISO strings),
`ip_address` (`string | null`), `device_label` (e.g. "Chrome on macOS"), `current` (bool).

Auth: these are `/v1/account/*` endpoints behind `require_api_key`, which accepts the
first-party web session cookie — the same path/auth the existing API-key account calls
already use from the browser via the `/api/cs2c` proxy.

## Data layer — `src/lib/api/`

### `types.ts`

```ts
export interface SessionInfo {
  id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  ip_address: string | null;
  device_label: string;
  current: boolean;
}
export interface SessionListResponse {
  sessions: SessionInfo[];
}
export interface RevokeSessionsResponse {
  revoked: number;
}
```

### `client.ts` (`webApi`)

```ts
listSessions(): Promise<SessionListResponse> {
  return request("/v1/account/sessions");
},
revokeSession(id: string): Promise<RevokeSessionsResponse> {
  return request(`/v1/account/sessions/${id}`, { method: "DELETE" });
},
revokeOtherSessions(): Promise<RevokeSessionsResponse> {
  return request("/v1/account/sessions", { method: "DELETE" });
},
```

### `hooks.ts`

- `queryKeys.sessions = ["sessions"] as const`.
- `useSessions()` — `useQuery({ queryKey: queryKeys.sessions, queryFn: () => webApi.listSessions() })`.
- `useRevokeSessionMutation()` — `mutationFn: (id) => webApi.revokeSession(id)`, **optimistic**:
  `onMutate` cancels the `sessions` query, snapshots it, and removes the row with that `id`
  from the cached `sessions` list; `onError` restores the snapshot and toasts an error;
  `onSettled` invalidates `queryKeys.sessions`. `onSuccess` toasts "Signed out device".
- `useRevokeOtherSessionsMutation()` — `mutationFn: () => webApi.revokeOtherSessions()`,
  optimistic: keep only the `current` session in the cached list; rollback on error;
  invalidate on settle; toast `Signed out ${revoked} device(s)` on success.

Follow the existing mutation style (`useRemoveFromWatchlistMutation`): `useMutation` +
`useQueryClient`. Optimistic handlers are the only addition, for the "immediate" feel.

## Component — `SessionsSection`

`src/app/(auth)/account/settings/SessionsSection.tsx` (`"use client"`). Rendered as a
`Card` inside the settings page after "Linked providers". All session logic lives here so
`settings/page.tsx` doesn't grow.

**Structure** (mirrors the Linked-providers block; shadcn `Card`/`Button`/`Badge`/`Dialog`):

- Header: title "Active sessions" + short description; right-aligned "Sign out all other
  devices" button (disabled when there is ≤1 session, i.e. nothing else to revoke).
- One row per session:
  - `device_label` (medium weight) + a `This device` `Badge` when `current`.
  - Muted line: `ip_address` (omit if null) · relative last-seen ("active just now" when
    `current`, else "last seen <relative>").
  - Right side: `current` → no button; otherwise a small `Revoke` `Button` (variant
    matching the existing destructive-ghost style used by Unlink).
- "Sign out all other devices" opens a confirmation `Dialog` (mirrors the unlink-provider
  confirm) → `useRevokeOtherSessionsMutation`.
- Per-device `Revoke` is immediate (no per-item dialog) → `useRevokeSessionMutation`; the
  row disappears optimistically with a success toast.

**Relative time:** reuse the existing relative-time logic from
`src/components/item/CollapsibleAsksList.tsx`. If it is local to that file, extract it to a
small shared `useRelativeTime` (or `formatRelativeTime`) util under `src/lib` or
`src/hooks` and import it in both places; otherwise import the existing hook directly. Do
not add a date library.

**States:**

- Loading: a few skeleton rows (shadcn `Skeleton`, as used elsewhere).
- Error: inline muted error text + a "Try again" button calling `refetch()`.
- Only-current: render the current device row plus a muted note "You're only signed in on
  this device." and the "Sign out all others" button disabled.

**Buttons disabled / pending:** disable a row's `Revoke` while its mutation is pending;
disable the bulk button while its mutation is pending; show a pending label
("Revoking…" / "Signing out…").

## Wiring

In `src/app/(auth)/account/settings/page.tsx`, import and render `<SessionsSection />` as a
new `Card` block immediately after the Linked-providers card. No other change to the page.

## Error handling

- All mutations surface failures via `toast` (sonner), consistent with the page.
- Optimistic rollback on mutation error restores the prior list so the UI never lies.
- A `404` from `revokeSession` (already-revoked elsewhere) is treated as success-ish: the
  row is gone after invalidation; show a neutral toast rather than an error if convenient,
  otherwise the rollback+invalidate still converges to the correct list.

## Verification (no test runner in this repo, per CLAUDE.md)

- `pnpm lint` clean; `pnpm build` clean (types resolve).
- Manual against the running API branch:
  1. Section lists active sessions; the current browser shows the `This device` badge and
     no revoke button.
  2. Revoking another device removes its row immediately and it stays gone after refetch.
  3. "Sign out all other devices" (confirm) leaves only the current device.
  4. Loading shows skeletons; a forced error shows the retry affordance.

## Success criteria

1. The settings page shows an "Active sessions" card listing the user's sessions with
   correct device labels, IPs, and relative last-seen.
2. The current session is badged and cannot be revoked from the list.
3. Per-device revoke and "sign out all others" call the right endpoints and the list
   reflects the result (optimistically, then reconciled).
4. Lint and build pass.
