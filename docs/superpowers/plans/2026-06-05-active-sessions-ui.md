# Active Sessions UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Active sessions" section to `/account/settings` that lists the user's browser sessions and lets them revoke one device or sign out all other devices, consuming the `cs2c-api` `/v1/account/sessions` endpoints.

**Architecture:** Follow the repo's API-layer convention — types in `types.ts`, `webApi` methods in `client.ts`, a query hook + two optimistic mutation hooks in `hooks.ts` — then a focused `SessionsSection` client component rendered in the settings page. Relative-time formatting is extracted from `CollapsibleAsksList` into a shared component reused by both.

**Tech Stack:** Next.js 16 App Router, React client components, TanStack Query, shadcn/ui (Card/Button/Badge/Dialog/Skeleton), sonner toasts, Tailwind v4.

**Testing note:** This repo has **no test runner** (per CLAUDE.md). Each task verifies with `pnpm lint` and `pnpm exec tsc --noEmit`; Task 7 runs a full `pnpm build` and a manual checklist against the deployed API.

---

## File Structure

- **Create** `src/components/RelativeTime.tsx` — shared `formatRelativeTime` / `useRelativeTime` / `RelativeTime` (moved out of `CollapsibleAsksList`).
- **Modify** `src/components/item/CollapsibleAsksList.tsx` — import `RelativeTime` from the new module; delete its local copies.
- **Modify** `src/lib/api/types.ts` — `SessionInfo`, `SessionListResponse`, `RevokeSessionsResponse`.
- **Modify** `src/lib/api/client.ts` — `listSessions`, `revokeSession`, `revokeOtherSessions`.
- **Modify** `src/lib/api/hooks.ts` — `queryKeys.sessions`, `useSessions`, `useRevokeSessionMutation`, `useRevokeOtherSessionsMutation`.
- **Create** `src/app/(auth)/account/settings/SessionsSection.tsx` — the UI (Card + rows + bulk confirm dialog).
- **Modify** `src/app/(auth)/account/settings/page.tsx` — render `<SessionsSection />`.

Common verify commands: `pnpm lint`, `pnpm exec tsc --noEmit`.

---

## Task 1: Extract `RelativeTime` into a shared component

**Files:**
- Create: `src/components/RelativeTime.tsx`
- Modify: `src/components/item/CollapsibleAsksList.tsx` (remove local copies at lines 17–54; import from new module)

- [ ] **Step 1: Create the shared module**

Create `src/components/RelativeTime.tsx` with the exact logic moved from `CollapsibleAsksList`, exporting the hook too (sessions needs it):

```tsx
"use client";

import { useEffect, useState } from "react";

export function formatRelativeTime(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function useRelativeTime(value?: string | null) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const compute = () => setLabel(formatRelativeTime(value));
    compute();
    const id = setInterval(compute, 30_000);
    return () => clearInterval(id);
  }, [value]);
  return label;
}

export function RelativeTime({ value }: { value?: string | null }) {
  const label = useRelativeTime(value);
  return (
    <span suppressHydrationWarning className="font-mono text-xs text-foreground/70">
      {label ?? "—"}
    </span>
  );
}
```

- [ ] **Step 2: Rewire `CollapsibleAsksList` to import from the shared module**

In `src/components/item/CollapsibleAsksList.tsx`:
1. Delete the local `formatRelativeTime` (lines ~17–31), `useRelativeTime` (~33–42), and `RelativeTime` (~44–54) definitions.
2. Add this import alongside the existing imports near the top:

```tsx
import { RelativeTime } from "@/components/RelativeTime";
```

Leave the existing `<RelativeTime value={row.last_updated ?? row.timestamp} />` usage untouched — it now resolves to the imported component. Keep `formatNumber` and everything else as-is.

- [ ] **Step 3: Verify lint + types**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors; `CollapsibleAsksList` still references `RelativeTime` (now imported), no unused-symbol warnings for the removed functions.

- [ ] **Step 4: Commit**

```bash
git add src/components/RelativeTime.tsx src/components/item/CollapsibleAsksList.tsx
git commit -m "refactor: extract RelativeTime into a shared component"
```

---

## Task 2: Session types

**Files:**
- Modify: `src/lib/api/types.ts` (append near other account/response interfaces)

- [ ] **Step 1: Add the interfaces**

Append to `src/lib/api/types.ts`:

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

- [ ] **Step 2: Verify types**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/types.ts
git commit -m "feat(sessions): add session response types"
```

---

## Task 3: `webApi` session methods

**Files:**
- Modify: `src/lib/api/client.ts` (add methods next to the other `/v1/account/*` methods, e.g. near `deleteSubKey`; ensure the new types are imported)

- [ ] **Step 1: Ensure the type imports exist**

At the top of `client.ts`, add `SessionListResponse` and `RevokeSessionsResponse` to the existing type import from `./types` (match the existing import grouping for types like `AccountInfo`, `ProviderLinkStartResponse`).

- [ ] **Step 2: Add the three methods to the `webApi` object**

Place beside the other account methods:

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

(`request` is the existing private helper that routes through the `/api/cs2c` proxy and forwards cookies — the same one used by `getSession`, `deleteSubKey`, etc.)

- [ ] **Step 3: Verify lint + types**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/client.ts
git commit -m "feat(sessions): webApi list/revoke session methods"
```

---

## Task 4: Query + mutation hooks

**Files:**
- Modify: `src/lib/api/hooks.ts` (add to `queryKeys`; add one query hook and two mutation hooks)

- [ ] **Step 1: Add the query key**

In the `queryKeys` object add:

```ts
  sessions: ["sessions"] as const,
```

- [ ] **Step 2: Ensure imports**

`hooks.ts` already imports `useMutation`, `useQuery`, `useQueryClient` from `@tanstack/react-query`, and `webApi` + types. Add `SessionListResponse` to the type import from `./types` if hooks.ts imports types there; otherwise import it: `import type { SessionListResponse } from "./types";` (match the file's existing type-import style).

- [ ] **Step 3: Add the query hook**

```ts
export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => webApi.listSessions(),
  });
}
```

- [ ] **Step 4: Add the two optimistic mutation hooks** (toast-free — the component owns toasts, matching `useRemoveFromWatchlistMutation`)

```ts
export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => webApi.revokeSession(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions });
      const previous = queryClient.getQueryData<SessionListResponse>(queryKeys.sessions);
      if (previous) {
        queryClient.setQueryData<SessionListResponse>(queryKeys.sessions, {
          sessions: previous.sessions.filter((s) => s.id !== id),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.sessions, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

export function useRevokeOtherSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => webApi.revokeOtherSessions(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions });
      const previous = queryClient.getQueryData<SessionListResponse>(queryKeys.sessions);
      if (previous) {
        queryClient.setQueryData<SessionListResponse>(queryKeys.sessions, {
          sessions: previous.sessions.filter((s) => s.current),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.sessions, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}
```

- [ ] **Step 5: Verify lint + types**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/hooks.ts
git commit -m "feat(sessions): useSessions + optimistic revoke mutation hooks"
```

---

## Task 5: `SessionsSection` component

**Files:**
- Create: `src/app/(auth)/account/settings/SessionsSection.tsx`

- [ ] **Step 1: Write the component**

Create `src/app/(auth)/account/settings/SessionsSection.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRelativeTime } from "@/components/RelativeTime";
import {
  useSessions,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
} from "@/lib/api";
import type { SessionInfo } from "@/lib/api/types";

function SessionRow({
  session,
  onRevoke,
  revoking,
}: {
  session: SessionInfo;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const lastSeen = useRelativeTime(session.last_seen_at);
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{session.device_label}</span>
          {session.current && (
            <Badge variant="secondary" className="shrink-0">
              This device
            </Badge>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {session.ip_address ? `${session.ip_address} · ` : ""}
          {session.current ? "active now" : `last seen ${lastSeen ?? "—"}`}
        </div>
      </div>
      {!session.current && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-destructive hover:text-destructive"
          disabled={revoking}
          onClick={() => onRevoke(session.id)}
        >
          {revoking ? "Revoking…" : "Revoke"}
        </Button>
      )}
    </div>
  );
}

export function SessionsSection() {
  const { data, isLoading, isError, refetch } = useSessions();
  const revoke = useRevokeSessionMutation();
  const revokeOthers = useRevokeOtherSessionsMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sessions = data?.sessions ?? [];
  const otherCount = sessions.filter((s) => !s.current).length;

  function handleRevoke(id: string) {
    revoke.mutate(id, {
      onSuccess: () => toast.success("Signed out device"),
      onError: () => toast.error("Couldn't sign out that device. Please try again."),
    });
  }

  function handleRevokeOthers() {
    revokeOthers.mutate(undefined, {
      onSuccess: (res) =>
        toast.success(
          res.revoked === 1 ? "Signed out 1 device" : `Signed out ${res.revoked} devices`,
        ),
      onError: () => toast.error("Couldn't sign out the other devices. Please try again."),
      onSettled: () => setConfirmOpen(false),
    });
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Active sessions
          </CardTitle>
          <CardDescription>Devices currently signed in to your account</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={otherCount === 0 || revokeOthers.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Sign out all other devices
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between gap-4 py-2">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load your sessions.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onRevoke={handleRevoke}
                revoking={revoke.isPending && revoke.variables === session.id}
              />
            ))}
            {otherCount === 0 && sessions.length > 0 && (
              <p className="pt-3 text-xs text-muted-foreground">
                You&apos;re only signed in on this device.
              </p>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out all other devices?</DialogTitle>
            <DialogDescription>
              This signs out every session except the one you&apos;re using now. Those devices
              will need to sign in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokeOthers.isPending}
              onClick={handleRevokeOthers}
            >
              {revokeOthers.isPending ? "Signing out…" : "Sign out all others"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
```

> Note: `Monitor` is imported for potential per-row iconography but is not required; if `eslint` flags it as unused, remove it from the import. (Prefer removing it — keep imports clean.)

- [ ] **Step 2: Verify lint + types**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors. If `Monitor` is unused, delete it from the lucide import.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/account/settings/SessionsSection.tsx"
git commit -m "feat(sessions): SessionsSection component"
```

---

## Task 6: Wire into the settings page

**Files:**
- Modify: `src/app/(auth)/account/settings/page.tsx` (import + render between the Account card and the Preferences card, ~line 538)

- [ ] **Step 1: Import the component**

Add near the other imports at the top of `page.tsx`:

```tsx
import { SessionsSection } from "./SessionsSection";
```

- [ ] **Step 2: Render it between the Account card and the Preferences card**

The Account card (which contains "Linked providers") closes with `</Card>` around line 537, and the Preferences `<Card>` starts around line 540. Insert the component between them:

```tsx
        </Card>

        <SessionsSection />

        {/* Preferences */}
        <Card className="border-border/50 bg-card/50">
```

(Match the surrounding indentation; the exact line shifts as you edit — anchor on the `</Card>` that ends the Account/identity card and the `<Card>` that begins Preferences.)

- [ ] **Step 3: Verify lint + types**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/account/settings/page.tsx"
git commit -m "feat(sessions): render Active sessions in account settings"
```

---

## Task 7: Build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full production build (catches type/SSR issues lint misses)**

Run: `pnpm build`
Expected: build succeeds with no type errors and the `/account/settings` route compiles.

- [ ] **Step 2: Manual check against the deployed API**

Run `pnpm dev`, sign in, open `/account/settings`, and confirm:
- An "Active sessions" card appears after the identity/linked-providers card.
- The current browser shows the **This device** badge and **no** Revoke button.
- Loading shows skeleton rows; a session list renders with device label, IP, and "last seen …".
- Revoking another device removes its row immediately (optimistic) and it stays gone after the list refetches; a success toast appears.
- "Sign out all other devices" is disabled when only the current device exists; otherwise it opens the confirm dialog, and confirming leaves only the current device.
- Forcing an error (e.g., offline) shows the "Try again" affordance and, for a failed revoke, the row reappears (rollback) with an error toast.

- [ ] **Step 3: Final commit (only if Step 1/2 required fixups)**

```bash
git add -A
git commit -m "fix(sessions): build/manual-verification fixups"
```

---

## Self-Review Notes

- **Spec coverage:** types (T2) ✅, webApi methods (T3) ✅, query+mutation hooks with optimistic update (T4) ✅, SessionsSection with current-badge/immediate-revoke/confirm-bulk/loading/error/only-current states (T5) ✅, settings wiring (T6) ✅, relative-time reuse via extraction (T1) ✅, lint+build verification (T7) ✅.
- **Type consistency:** `SessionInfo`/`SessionListResponse`/`RevokeSessionsResponse` defined in T2 are used identically in T3 (return types), T4 (cache generics), and T5 (`SessionInfo` prop). `queryKeys.sessions` defined in T4 Step 1 is used by all three hooks. `useRelativeTime` exported in T1 is consumed in T5.
- **Toasts live in the component** (T5), hooks stay toast-free (T4) — matches `useRemoveFromWatchlistMutation`.
