

## Goal
Collapse different wear variants of the same skin into a single row in `/search`, while keeping StatTrak, Souvenir, and Doppler/Gamma phases as separate rows. The item page itself already handles wear selection via `ItemConditionVariants`, so no changes there.

## Grouping rule
Group key = `base_name | skin_name | is_stattrak | is_souvenir | phase`.
Items missing `base_name`/`skin_name` (rare — agents, stickers, cases) keep their own row keyed by `market_hash_name`.

When the user explicitly filters by `wear_name`, grouping is bypassed — they asked for a specific wear, so show flat results.

## Approach (server-side, in `getSearchPageData`)

1. **Over-fetch**: API returns at most 24 items per request. After grouping, a "page" could contain far fewer rows. Fetch with a larger `limit` (e.g. 200) starting from offset 0, then group, then slice 24 at the requested page offset client-side. Cap total scanned at e.g. 1000 items (5 paged fetches) to keep latency bounded — sufficient for typical search results, and for very broad queries we can show the partial total with a "showing first N" note.
   
   *Trade-off:* The API's `total` count becomes inaccurate post-grouping. We'll display "X skins" (grouped count from what we scanned) and disable NEXT once we've consumed all scanned items. For the common case (queries returning <1000 items) this is exact; for broader browsing (e.g. "All Rifles") it shows "1000+ skins".

2. **Group**: Reduce flat items into groups. For each group:
   - Pick a **representative item** = the one with `wear_name` closest to FN that has a known price (fallback: any item, fallback: first).
   - Aggregate variants list (used for variant count + tooltip).
   - Collect snapshot metrics (best ask, 24h vol, price change) across all variants from the existing `marketSnapshot`. Lowest ask wins for price; sum of volumes; weighted-avg or representative's % change.

3. **Link**: Row links to the representative item's `/item/[itemId]`. The item page's existing wear selector lets the user jump to any wear from there.

## UI changes (`src/app/(public)/search/page.tsx`)

- Display name: strip the wear suffix from `market_hash_name` (e.g. "AK-47 | Redline (Field-Tested)" → "AK-47 | Redline"). Keep the StatTrak™/Souvenir prefix.
- Subtitle row: replace the wear bullet with a compact variant indicator: `5 wears • Mil-Spec • The Phoenix Collection`.
- Price column: lowest ask across variants (per user's choice).
- 24H column: change of the representative variant (typically FN/cheapest).
- Volume column: sum across variants (more honest for "popularity").
- Header label: "MATCHES" → "SKINS" when grouping is active.
- When the user picks a `wear_name` filter, fall back to the existing flat rendering (no UI change for that path).

## Files touched

- `src/lib/api/compositions.ts` — extend `getSearchPageData`:
  - new internal `groupSearchResults(items, snapshotMap)` helper
  - over-fetch + slice logic
  - return shape gains `grouped: boolean` and `results[i]` gains `variantCount`, `wearsAvailable`, `displayName`
- `src/app/(public)/search/page.tsx` — render grouped rows with new display name and variant indicator; keep existing flat path when `wear_name` filter is set.

No DB or component-level breakage. `getSiblingVariants` and the item detail page are untouched.

## Out of scope
- Item detail page changes (already handles variants).
- Grouping in any other surface (homepage ticker, related items).
- New API endpoints.

