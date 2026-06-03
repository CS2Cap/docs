# Resilient Browse Pages (snapshot null-safety) — Design

**Date:** 2026-06-03
**Status:** Approved (design)
**Relates to:** the browse-by-category system (`browse-index.ts`, `blob-snapshot-cache.ts`).

## Problem

Browse pages call `loadBrowseIndex()` and do `if (!ix) notFound()`. `loadBrowseIndex` returns `null` whenever `getCachedItemsSnapshot()` → `readBlob()` returns `null`, and `readBlob` returns `null` on **any** transient failure (a `list()`/`fetch()` timeout, a 5xx, a rate-limit, a parse error) with **no retry**. Under parallel `next build` load, a single transient blob hiccup makes a page bake `notFound()` — a hard 404 cached for the page's `revalidate` window (86400s = 24h). Observed: `/weapons`, `/knives`, `/music-kits`, `/cases/<x>` 404'd in a build while `/stickers/<x>` (built by a different worker) succeeded.

## Goals

- Make transient blob failures **rare** (retry the read) and **non-fatal** (a hard failure yields a 200 "temporarily unavailable" page that ISR refills, not a 24h-cached 404).
- Preserve genuine 404s: a resolved index with an unknown slug (`if (!detail) notFound()`) stays a real 404.

## Non-goals

- Changing `revalidate` values, route config, or making pages dynamic.
- Touching the static hub pages (`/browse`, `/gear`, `/containers`, `/extras`) — they don't read the snapshot.
- Reworking `generateStaticParams`/`generateMetadata` null-handling (already correct: `return []` / "Not Found" title).
- Any change to the prewarm crons or how snapshots are written.

## Part 1 — Blob-read retry (root cause)

`src/lib/blob-snapshot-cache.ts`, `readBlob<T>(pathname)`. Wrap the network work in a bounded retry:

- **3 attempts**, backoff `250ms` then `500ms` between attempts (`250 * attempt`).
- **Retry only transient failures:** a thrown error (network/`AbortSignal` timeout/`list()` failure/parse error) or a non-ok response (`!res.ok` → throw into the retry). After the final attempt, return `null`.
- **Do NOT retry non-transient outcomes:** missing `BLOB_READ_WRITE_TOKEN` → immediate `null` (unchanged); a successful `list()` that yields no matching blob (`!blob`) → immediate `null` (the blob is genuinely absent, e.g. before first prewarm — retrying is pointless).

Resulting shape (illustrative):

```ts
async function readBlob<T>(pathname: string): Promise<{ data: T; uploadedAt: number } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { blobs } = await list({ prefix: pathname, limit: 1 });
      const blob = blobs.find((b) => b.pathname === pathname);
      if (!blob) return null; // genuinely absent — not transient
      const res = await fetch(blob.url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`blob fetch failed: ${res.status}`);
      const data = JSON.parse(gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8")) as T;
      return { data, uploadedAt: blob.uploadedAt.getTime() };
    } catch {
      if (attempt === MAX_ATTEMPTS) return null;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  return null;
}
```

This benefits every snapshot read (items/market/prices/bids) at build and runtime. Worst-case added latency on a total failure: ~750ms (two backoffs), only on the already-failing path.

## Part 2 — Graceful empty state

New `src/components/browse/BrowseUnavailable.tsx` (server component, brutalist/mono): a `<main className="container py-8">` with a heading ("Catalog Unavailable") + a short message ("The item catalog is being refreshed — please try again in a moment.") + a `Link` back to `/browse`, followed by `<FooterSection />`. Mirrors the existing page shell so it reads as a normal page, not an error.

## Part 3 — Page edits

Across the data-driven browse pages, replace the **transient-null** branch `if (!ix) notFound();` with `if (!ix) return <BrowseUnavailable />;`. Add the `BrowseUnavailable` import.

- **Index pages** (`weapons`, `knives`, `gloves`, `agents`, `collections`, `cases`, `stickers`, `sticker-slabs`, `charms`, `graffiti`, `music-kits`, `patches`, `collectibles`): `notFound` was used **only** for the `!ix` check → after the swap it is unused → **remove the `notFound` import**.
- **Detail pages** (`weapons/[weapon]`, `knives/[knife]`, `gloves/[glove]`, `collections/[slug]`, `cases/[slug]`, `stickers/[slug]`, `sticker-slabs/[slug]`, `charms/[slug]`, `graffiti/[slug]`): swap the `!ix` line; **keep** the `notFound` import and the `if (!detail) notFound();` (and the weapon page's `detail.subtitle === "Knives"|"Gloves"` guard) — those are genuine 404s.

`generateStaticParams` and `generateMetadata` are unchanged (their `!ix`/`!detail` handling is already graceful).

## Verification

No test runner (per repo). Gates: `npx tsc --noEmit` (exit 0), scoped `npx eslint` clean on all changed files (catches any now-unused `notFound` import), and a clean `pnpm build` (`NODE_OPTIONS=--max-old-space-size=6144`). Functional check is hard to force deterministically (requires a transient blob failure), so verify by code inspection + build, and confirm no page still does `if (!ix) notFound()`.

## Risks / notes

- The retry adds latency only on the failing path; the success path is unchanged (returns on first attempt).
- A `BrowseUnavailable` render that gets statically cached still revalidates within the route's window; with the retry making null rare, this is an unlikely fallback rather than the common case.
- `readBlob` is shared by all snapshot types; the retry is generically beneficial and changes no success-path behavior.
