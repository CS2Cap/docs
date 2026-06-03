# Resilient Browse Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop browse pages from baking permanent 404s when a transient blob-snapshot read fails at build — by retrying the blob read and degrading to a graceful "catalog unavailable" page instead of `notFound()`.

**Architecture:** (1) Add bounded retry/backoff to `readBlob` in `blob-snapshot-cache.ts` (root cause); (2) a small `BrowseUnavailable` server component; (3) replace the transient-null `if (!ix) notFound()` in 22 browse pages with `return <BrowseUnavailable />`, keeping genuine `if (!detail) notFound()` 404s.

**Tech Stack:** Next.js 16 App Router (RSC), TypeScript, Vercel Blob.

**Spec:** `docs/superpowers/specs/2026-06-03-browse-resilient-snapshot-design.md`

**Commit convention:** every commit ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (omitted below for brevity).

**Verification note:** No test runner (per `CLAUDE.md`). Per-task gates: `npx tsc --noEmit` (exit 0) + SCOPED `npx eslint <changed files>` → "No issues found" (NEVER bare `pnpm lint` — repo has unrelated pre-existing debt; scoped eslint also catches a now-unused `notFound` import). Controller runs the full `pnpm build` (with `NODE_OPTIONS=--max-old-space-size=6144` — repo OOMs otherwise) at the end. Match the brutalist/mono aesthetic.

---

## File Structure

- **Modify:** `src/lib/blob-snapshot-cache.ts` — add retry to `readBlob`.
- **Create:** `src/components/browse/BrowseUnavailable.tsx` — empty-state component.
- **Modify:** 22 pages under `src/app/(public)/` — swap the `!ix` branch.

---

## Task 1: Retry the blob read

**Files:** Modify `src/lib/blob-snapshot-cache.ts`

- [ ] **Step 1: Replace `readBlob`** — find the existing `async function readBlob<T>(pathname: string): Promise<{ data: T; uploadedAt: number } | null> { … }` and replace the WHOLE function with:

```ts
async function readBlob<T>(pathname: string): Promise<{ data: T; uploadedAt: number } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { blobs } = await list({ prefix: pathname, limit: 1 });
      const blob = blobs.find((b) => b.pathname === pathname);
      if (!blob) return null; // genuinely absent (e.g. before first prewarm) — not transient
      const res = await fetch(blob.url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`blob fetch failed: ${res.status}`);
      const data = JSON.parse(
        gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8"),
      ) as T;
      return { data, uploadedAt: blob.uploadedAt.getTime() };
    } catch {
      if (attempt === MAX_ATTEMPTS) return null;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  return null;
}
```

Behavior vs. before: success path identical (returns on attempt 1); a missing token or genuinely-absent blob still returns `null` immediately; only thrown errors / non-ok responses now retry (≤2 backoffs, ~750ms worst case) before giving up.

- [ ] **Step 2: Verify** — `npx tsc --noEmit` (exit 0); `npx eslint src/lib/blob-snapshot-cache.ts` → "No issues found".

- [ ] **Step 3: Commit**

```bash
git add src/lib/blob-snapshot-cache.ts
git commit -m "fix(blob): retry transient snapshot reads with backoff"
```

---

## Task 2: `BrowseUnavailable` component

**Files:** Create `src/components/browse/BrowseUnavailable.tsx`

- [ ] **Step 1: Write it**

```tsx
import Link from "next/link";
import { FooterSection } from "@/components/FooterSection";

// Graceful fallback when the item catalog snapshot is transiently unavailable
// (e.g. a blob read failed at build/revalidate time). Renders a normal 200 page
// instead of a hard notFound() 404; ISR will refill it on the next revalidation.
export function BrowseUnavailable() {
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Catalog Unavailable</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">
          The item catalog is being refreshed — please try again in a moment.
        </p>
        <Link
          href="/browse"
          className="border-2 border-border bg-card px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Back to Browse
        </Link>
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`; `npx eslint src/components/browse/BrowseUnavailable.tsx` → "No issues found".

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/BrowseUnavailable.tsx
git commit -m "feat(browse): BrowseUnavailable graceful empty state"
```

---

## Task 3: Swap the 13 index pages

**Files (each has exactly ONE `notFound()` call — the `!ix` check):**
`src/app/(public)/agents/page.tsx`, `src/app/(public)/weapons/page.tsx`, `src/app/(public)/knives/page.tsx`, `src/app/(public)/gloves/page.tsx`, `src/app/(public)/collections/page.tsx`, `src/app/(public)/cases/page.tsx`, `src/app/(public)/stickers/page.tsx`, `src/app/(public)/sticker-slabs/page.tsx`, `src/app/(public)/charms/page.tsx`, `src/app/(public)/graffiti/page.tsx`, `src/app/(public)/music-kits/page.tsx`, `src/app/(public)/patches/page.tsx`, `src/app/(public)/collectibles/page.tsx`

- [ ] **Step 1: In EACH of the 13 files, make three edits:**
  1. **Delete** the line `import { notFound } from "next/navigation";` (after the swap, `notFound` is unused on these pages → would be a lint error otherwise).
  2. **Add** (with the other `@/components/...` imports) `import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";`
  3. **Replace** `if (!ix) notFound();` with `if (!ix) return <BrowseUnavailable />;`

  (These pages are `export default async function …()` that already `return (<> … </>)`, so an early `return <BrowseUnavailable />` is valid.)

- [ ] **Step 2: Verify** — `npx tsc --noEmit` (exit 0). Confirm no stray `notFound` remains in these 13 files: `grep -rn "notFound" src/app/\(public\)/agents src/app/\(public\)/weapons/page.tsx src/app/\(public\)/knives/page.tsx src/app/\(public\)/gloves/page.tsx src/app/\(public\)/collections/page.tsx src/app/\(public\)/cases/page.tsx src/app/\(public\)/stickers/page.tsx src/app/\(public\)/sticker-slabs/page.tsx src/app/\(public\)/charms/page.tsx src/app/\(public\)/graffiti/page.tsx src/app/\(public\)/music-kits/page.tsx src/app/\(public\)/patches/page.tsx src/app/\(public\)/collectibles/page.tsx` → no matches. Then scoped eslint over those dirs/files → "No issues found".

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)"
git commit -m "fix(browse): index pages degrade to BrowseUnavailable on null snapshot"
```

---

## Task 4: Swap the 9 detail pages

**Files (each has TWO `notFound()` calls — keep the `notFound` import; only swap the `!ix` one):**
`src/app/(public)/weapons/[weapon]/page.tsx`, `src/app/(public)/knives/[knife]/page.tsx`, `src/app/(public)/gloves/[glove]/page.tsx`, `src/app/(public)/collections/[slug]/page.tsx`, `src/app/(public)/cases/[slug]/page.tsx`, `src/app/(public)/stickers/[slug]/page.tsx`, `src/app/(public)/sticker-slabs/[slug]/page.tsx`, `src/app/(public)/charms/[slug]/page.tsx`, `src/app/(public)/graffiti/[slug]/page.tsx`

- [ ] **Step 1: In EACH of the 9 files, make two edits:**
  1. **Add** `import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";` (with the other `@/components/...` imports).
  2. **Replace** `if (!ix) notFound();` with `if (!ix) return <BrowseUnavailable />;`

  **Do NOT remove** the `import { notFound } from "next/navigation";` — it is still used by the page's `if (!detail) notFound();` (and, in `weapons/[weapon]`, the `detail.subtitle === "Knives" || detail.subtitle === "Gloves"` guard). Leave those lines untouched.

- [ ] **Step 2: Verify** — `npx tsc --noEmit` (exit 0). Confirm each of the 9 files still has exactly one `notFound()` call remaining (the `!detail` one) and no `if (!ix) notFound()`: `grep -rn "if (!ix) notFound" "src/app/(public)"` → no matches anywhere. Scoped eslint over the 9 detail dirs → "No issues found" (no unused-import error — `notFound` is still used).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)"
git commit -m "fix(browse): detail pages degrade to BrowseUnavailable on null snapshot"
```

---

## Task 5: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Whole-repo grep** — `grep -rn "if (!ix) notFound" "src/app/(public)"` → **no matches** (every transient-null path now degrades gracefully).

- [ ] **Step 2: Scoped lint + type-check**

```bash
npx eslint src/lib/blob-snapshot-cache.ts src/components/browse "src/app/(public)"
npx tsc --noEmit
```
Expected: "No issues found." and exit 0.

- [ ] **Step 3: Production build** — `NODE_OPTIONS="--max-old-space-size=6144" pnpm build`
  Expected: exit 0. (The retry should also make the flaky build-time 404s observed earlier far less likely; any page that still can't load the snapshot now prerenders a 200 `BrowseUnavailable` instead of a 404.)

- [ ] **Step 4: Commit (only if fixups were needed)**

```bash
git add -A
git commit -m "chore(browse): build/lint fixups for resilient snapshot"
```

---

## Self-Review Notes

- **Spec coverage:** Part 1 retry (Task 1), Part 2 component (Task 2), Part 3 page swaps split by import-handling (Task 3 index = remove `notFound` import; Task 4 detail = keep it). Verification (Task 5).
- **Genuine 404s preserved:** only `if (!ix) notFound()` is swapped; `if (!detail) notFound()` and the weapon subtype guard are untouched (Task 4 Step 1 explicit).
- **Lint correctness:** index pages remove the now-unused `notFound` import (Task 3); detail pages keep it (Task 4) — scoped eslint in each task catches a mistake either way.
- **No behavior change on success path:** `readBlob` returns on the first attempt when the read succeeds; retry only affects the failing path.
