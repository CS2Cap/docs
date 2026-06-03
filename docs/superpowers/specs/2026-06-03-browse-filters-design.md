# Browse Detail-Page Filters — Design

**Date:** 2026-06-03
**Status:** Approved (design)
**Extends:** the browse-by-category system (see `2026-06-02-browse-by-category-design.md` and `2026-06-02-browse-extras-design.md`).

## Summary

Add adaptive, client-side attribute filtering to every browse **detail / item-listing** page. Cards still render server-side (SEO/first-paint unchanged); a client filter bar shows/hides the already-rendered cards instantly. The bar adapts per page — it only shows a facet whose values actually vary on that page.

Catalog-only, no new requests, no URL params, no prices.

## Goals

- A filter bar on all 11 item-listing pages: Rarity, Wear, StatTrak, Souvenir, and an in-page name search.
- Adapt facets to the page's data (no Wear on sticker pages, no Rarity on music kits, ST/Souvenir toggles only when present).
- Preserve each page's existing layout (flat grid, subtype sections, rarity sections).

## Non-goals

- Index/group-list pages (stickers index, cases index, etc.) — they list groups, not items.
- URL/search-param state, server round-trips, Phase/Style facets, price filters, sorting.

## Data reality (verified vs the live blob)

Filterable attributes are category-dependent: Rarity varies on nearly all pages (exception: Music Kits, all "High Grade"); Wear only on weapons/knives/gloves/cases; StatTrak on weapons + music kits; Souvenir on some weapons/cases. Cards are **deduped** (one per `base_name|skin_name|phase`, collapsing wears + StatTrak/Souvenir), so the card must carry the *set* of variants it represents.

## Card enrichment (`src/lib/browse/taxonomy.ts`)

`dedupToCards` already holds every variant of a skin. Add three serializable fields to the `SkinCard` interface (existing fields unchanged; `rarityName`/`rarityColor` already present):

- `wears: string[]` — distinct non-null `wear_name`s among the variants, ordered Factory New → Battle-Scarred (use the existing `WEAR_ORDER`); empty for non-weapon items.
- `hasStatTrak: boolean` — `variants.some(v => v.is_stattrak)`.
- `hasSouvenir: boolean` — `variants.some(v => v.is_souvenir)`.

Backward-compatible: existing consumers (grids, nav builders) ignore the new fields.

## Components (`src/components/browse/`)

Render-props cannot cross the Server→Client boundary, so each layout gets a thin client wrapper; all three share one hook + one presentational bar.

- **`useBrowseFilter(skins)`** (client hook) — derives the available facets from `skins` and holds filter state. Returns `{ facets, filters, setFilters, filtered, total }`.
  - `facets`: `{ rarities: {name,color}[] (rarest-first, only if ≥2 distinct), wears: string[] (WEAR_ORDER, only if any), hasStatTrak: boolean, hasSouvenir: boolean }`.
  - `filters`: `{ rarities: Set<string>, wears: Set<string>, stattrakOnly: boolean, souvenirOnly: boolean, query: string }`.
  - `filtered`: a skin passes when — (rarities empty OR `rarityName` ∈ rarities) AND (wears empty OR `wears` ∩ selected ≠ ∅) AND (!stattrakOnly OR `hasStatTrak`) AND (!souvenirOnly OR `hasSouvenir`) AND (query empty OR `${skinName} ${baseName}`.toLowerCase() includes query.trim().toLowerCase()).
- **`BrowseFilterBar`** (client, presentational) — given `facets`, `filters`, `setFilters`, `filtered.length`, `total`: renders only the applicable controls. Rarity chips carry their rarity color; Wear chips; StatTrak/Souvenir toggle chips (rendered only if `facets.hasStatTrak`/`hasSouvenir`); a name-search input (styled like the navbar search); a "N of M" result count; a "Clear" button shown only when any filter is active. Brutalist/mono: `font-mono`, `border-2 border-border`, `bg-card`, active = `border-primary text-primary`, square corners. Renders nothing (or just search) gracefully when no facets vary.
- **`FilterableSkinGrid({ skins })`** (`"use client"`) — `useBrowseFilter` → `<BrowseFilterBar/>` + `<SkinGrid skins={filtered}/>`; empty → "No items match these filters." Used by: stickers/[slug], sticker-slabs/[slug], charms/[slug], graffiti/[slug], collections/[slug], weapons/[weapon], knives/[knife], gloves/[glove], and music-kits.
- **`FilterableSubtypeSections({ sections })`** (`"use client"`) — facets from the union of all sections' skins; one bar filters across all; renders each `{title, skins}` section with its filtered skins (a section with 0 matches is hidden). Used by: patches, collectibles.
- **`FilterableRaritySections({ skins, specials })`** (`"use client"`) — facets from `skins ∪ specials`; one bar; renders `RaritySections(groupByRarity(filteredSkins))` plus, when `filteredSpecials` is non-empty, the "Knives & Gloves" `RaritySections(groupByRarity(filteredSpecials))`. Used by: cases/[slug] (the page keeps computing the `skins`/`specials` split on the server via `isSpecialCard`).

## Page changes

Each Server-Component page swaps its grid for the matching wrapper, passing the already-built (serializable) cards:

- Plain-grid detail pages + music-kits: `<SkinGrid skins={...}>` → `<FilterableSkinGrid skins={...}>`.
- patches, collectibles: replace the manual `sections.map(... <SkinGrid/>)` with `<FilterableSubtypeSections sections={sections}/>`.
- cases/[slug]: replace the two `<RaritySections/>` blocks with `<FilterableRaritySections skins={skins} specials={specials}/>` (server still derives `skins`/`specials`).

No change to `revalidate`, metadata, or `generateStaticParams`.

## Rendering & caching

Cards are server-rendered (unchanged SSR/SEO); the client wrappers are progressive enhancement that filter in-memory. Page sizes are bounded (hundreds of cards; the largest is sticker-slabs/base ≈ 867) — DOM show/hide is fine.

## Verification

No test runner (per repo). Gates: `npx tsc --noEmit`, scoped `npx eslint` clean on feature files, clean `pnpm build` (with `NODE_OPTIONS=--max-old-space-size=6144`), and a runtime smoke pass: filter bar appears on a detail page; rarity/wear chips + ST/Souvenir toggles + search narrow the grid live; facets are absent where they don't apply (no Wear on /stickers/<group>, no Rarity on /music-kits); cases page filters feed the rarity sections; zero-match empty state shows; Clear resets.

## Risks / notes

- The three wrappers are client components; ensure no server-only import leaks in (they take plain `SkinCard[]` props).
- `useBrowseFilter` must be cheap: facet derivation and filtering are O(cards) per render; fine at these sizes. Memoize derived facets/filtered with `useMemo` keyed on `skins` + `filters`.
- `SkinCard` is and must remain fully serializable (strings/numbers/booleans/string[]).
