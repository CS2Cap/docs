# Browse-by-Category, Part 2 (Stickers & remaining types) — Design

**Date:** 2026-06-02
**Status:** Approved (design)
**Extends:** `2026-06-02-browse-by-category-design.md` (v1: Weapons/Knives/Gloves/Agents/Collections/Cases — already merged to `main`)

## Summary

Add browse pages for the remaining meaningful CS2 item categories, reusing the
v1 architecture (server components → snapshot-timestamp-memoized `browse-index`
derivations → `SkinGrid`/`GroupGrid`/`SkinCard`/`GroupCard`). Catalog-only:
reads the items snapshot blob exclusively. No prices, no auth, no new
API/blob/cron.

Seven new categories: **Stickers, Sticker Slabs, Charms, Graffiti, Music Kits,
Patches, Collectibles**. Keys (27) and Tools (2) are intentionally excluded
(utility items, no browse value).

## Goals

- Index + detail pages for the container-style categories (Stickers, Sticker
  Slabs, Charms, Graffiti).
- Flat (single-page) browse for the small categories (Music Kits, Patches,
  Collectibles).
- A 4th "Stickers & More" column in the BROWSE mega-dropdown + hub links.
- Two small, backward-compatible enhancements to existing shared components.

## Non-goals

- Keys, Tools.
- Prices, sitemap entries, item-detail cross-links (still deferred from v1).
- Re-grouping or touching the existing v1 categories beyond the shared-component
  enhancements below.

## Data reality (verified against the live `snapshots/items.json.gz`)

Per `item_type` (with the fields that matter here):

- **Sticker** (10,427): `base_name = "Sticker"`, `skin_name` = unique sticker
  name. 8,848 have a `collection` (31 distinct, e.g. "Katowice 2014 Stickers");
  of the 1,579 without a collection, 1,563 have a `crates[]` capsule and 16 have
  neither. Subtypes: Player Autograph (7,475), Team Logo (2,072), Other (850),
  Tournament (30). All have `image_url`.
- **Charm** (11,370) is **two products**:
  - Real charms: `base_name = "Charm"` — Normal (78) + Highlight Reel souvenir
    charms (865); collections: Missing Link Charm Collection (17), Small Arms
    Charm Collection (16), Missing Link Community Charm Collection (23), Dr Boom
    Charm Collection (22), Austin 2025 Highlight (492), Budapest 2025 Highlight
    (373). ~943 items, 6 collections.
  - **Sticker Slabs**: `base_name = "Sticker Slab"` (10,427) with a placeholder
    `collection = "Sticker Slab"`. Distinct item, mirrors stickers 1:1.
    `skin_name` embeds the event, e.g. "frozen (Holo) | Budapest 2025"; 92%
    (9,560) carry a trailing `| <Event>` segment → 25 event groups + 867 with no
    event suffix.
- **Graffiti** (1,727): `base_name = "Sealed Graffiti"`, all subtype "Other".
  1,673 have a `collection` (4 distinct: CS:GO Graffiti Collection, #2, #3,
  Trolling Graffiti Collection).
- **Music Kit** (183): `base_name = "Music Kit"`, subtypes Normal (88) +
  StatTrak (95). Each kit exists as a Normal and a StatTrak variant sharing the
  same `skin_name` → dedups to ~88 cards. No collection.
- **Patch** (112): `base_name = "Patch"`, subtypes Team Logo (50) + Other (62).
- **Collectible** (77): `skin_name = null`, `base_name` = the item's own name;
  subtypes Pin (45), Tournament Pass (21), Operation Pass (11).

## Routes (all under `(public)`, top-level)

```text
/stickers                    → index grouped by collection → capsule → "Other"
/stickers/[slug]             → stickers in that group
/sticker-slabs               → index grouped by tournament/event (+ "Base")
/sticker-slabs/[slug]        → slabs in that group
/charms                      → index grouped by collection (real charms only)
/charms/[slug]               → charms in that collection
/graffiti                    → index grouped by collection
/graffiti/[slug]             → graffiti in that collection
/music-kits                  → flat grid (deduped, ~88 kits)
/patches                     → flat grid, sectioned by subtype
/collectibles                → flat grid, sectioned by subtype
```

## Derivation (`src/lib/browse/browse-index.ts`)

Extend `buildIndex` to bucket the new item types as it iterates the snapshot
(one pass, same memoization). The four container-style categories produce
`Map<string, NamedGroup>` so they **reuse the existing `toSummaries` and
`namedDetail` helpers** with no new grouping code:

- `stickers: Map<string, NamedGroup>` — key/group resolution per item:
  `collection` if present, else first non-empty `crates[]` entry, else `"Other"`.
  Group image: `collection_image` → first crate image → first item `image_url`.
- `slabs: Map<string, NamedGroup>` — group = the trimmed segment after the last
  `|` in `skin_name`; if there is no `|`, group = `"Base"`. Image: first item
  `image_url`.
- `charms: Map<string, NamedGroup>` — only items with `base_name === "Charm"`
  (exclude Sticker Slabs), keyed by `collection`.
- `graffiti: Map<string, NamedGroup>` — keyed by `collection` (skip items with
  no collection — only 54 lack one and they have no clean grouping).
- `musicKits: ItemOut[]`, `patches: ItemOut[]`, `collectibles: ItemOut[]` — raw
  arrays for the flat pages.

New exported functions (thin wrappers over existing generics where possible):

- `listStickerGroups(ix)` / `stickerGroupDetail(ix, slug)`
- `listSlabGroups(ix)` / `slabGroupDetail(ix, slug)`
- `listCharmGroups(ix)` / `charmGroupDetail(ix, slug)`
- `listGraffitiGroups(ix)` / `graffitiGroupDetail(ix, slug)`
  (the four `list*` call `toSummaries`; the four `*Detail` call `namedDetail`
  with the appropriate subtitle.)
- `musicKitCards(ix): SkinCard[]` — `dedupToCards(ix.musicKits)`.
- `patchSections(ix)` / `collectibleSections(ix)` → `Array<{ title: string;
  skins: SkinCard[] }>`, one section per subtype (subtype order fixed), each
  built with `dedupToCards`.

## Shared-component enhancements (backward compatible)

1. **`SkinCard.topLabel`** (in `taxonomy.ts` `SkinCard` type + `dedupToCards`):
   replace the current `faction` field with a general `topLabel: string | null`.
   In `dedupToCards`, set `topLabel`:
   - `item_type === "Agent"` → `item_subtype` (faction) — preserves agent
     behavior.
   - else if `skin_name == null` → `item_subtype` (so collectibles show their
     subtype as the small label and `base_name` as the title, instead of
     rendering the name twice).
   - else → `base_name`.
   `SkinCard.tsx`: the non-weapon branch renders `skin.topLabel` (was
   `faction ?? baseName`). The title remains `skinName ?? baseName`. The
   weapon-link branch (`weaponHref`) is unchanged. The only behavioral change
   for existing pages is agents now read `topLabel` (same value as before).

2. **`GroupGrid`/`GroupCard` `noun`**: add optional `noun?: string` (default
   `"skin"`) to `GroupGrid`, forwarded to `GroupCard`, which renders
   `{count} {noun}{count === 1 ? "" : "s"}` (simple "+s" pluralization).
   Index `noun` values: stickers → `"sticker"`, sticker slabs → `"slab"`,
   charms → `"charm"`, graffiti → `"item"` (avoids the un-pluralizable
   "graffitis"). Existing callers (weapons/collections/cases/knives/gloves)
   omit it → unchanged "skin/skins".

## Pages

Container-style indexes mirror `/collections/page.tsx` (call `loadBrowseIndex`,
`notFound()` if null, render `GroupGrid` with the right `hrefBase` + `noun`).
Container-style details mirror `/collections/[slug]/page.tsx` (`generateStaticParams`
from the `list*` slugs, `generateMetadata`, `notFound()` on unresolved slug,
render header + `SkinGrid`). All use `export const revalidate = 86400`.

Flat pages (`/music-kits`, `/patches`, `/collectibles`) mirror `/agents/page.tsx`:
load index, render one or more `SkinGrid`s (music kits = single grid; patches /
collectibles = one `<section>` per subtype).

## Navbar & hub

- `BrowseMegaMenu`: add a 4th column "Stickers & More" with links Stickers,
  Sticker Slabs, Charms, Graffiti, Music Kits, Patches, Collectibles. Widen
  `DropdownMenuContent` (`grid-cols-3` → `grid-cols-4`, `w-md` → `w-3xl` =
  48rem, which fits 4 columns). Add the 7 new paths to `BROWSE_HREFS`.
- `/browse` hub: add the 7 categories to its `CATEGORIES` list.

## Rendering & caching

Server Components, `export const revalidate = 86400`, `generateStaticParams` for
the bounded container detail sets. No prices/auth. Unknown slug → `notFound()`.

## Verification

No test runner (per repo). Gates: `npx tsc --noEmit`, `pnpm lint` (feature files
clean; main carries pre-existing lint debt that is out of scope), clean
`pnpm build`, and a runtime smoke pass: each index lists groups with images and
correct count nouns; a detail page renders deduped items; collectibles show
subtype label + name (no duplication); music kits dedup Normal/StatTrak; bogus
slug → 404; the mega-menu's 4th column navigates; `/browse` hub lists all
categories.

## Risks / notes

- Slug namespace within a category mixes collection and capsule names
  (stickers) — collisions are possible but unlit in practice; `resolveBySlug`
  returns the first match and unknown slugs 404.
- Sticker Slab event parsing is string-based (last `|` segment); the 8% with no
  suffix land in "Base". Acceptable.
- The `topLabel` change touches the shared `SkinCard`; the agent path must be
  re-verified (its label value is unchanged).
