# Browse-by-Category — Design

**Date:** 2026-06-02
**Status:** Approved (pending spec review)

## Summary

Add a dedicated "browse by category" section to the cs2cap frontend that
represents CS2 items in relation to each other. Users enter from the top
navbar via a `BROWSE` mega-dropdown, drill from category indexes into
container/weapon detail pages, and from any item card move **down** to the
existing item detail page (by clicking the skin name) or **up** to the parent
weapon (by clicking the weapon name).

The section is **catalog-only**: it reads exclusively from the existing items
snapshot blob (`getCachedItemsSnapshot()`). No prices, no auth, no new API,
no new blob, no cron.

## Goals

- Navbar `BROWSE` mega-dropdown with six top-level categories.
- Index + detail pages for Weapons, Knives, Gloves, Agents, Collections, Cases.
- Item cards that encode the up/down relationship (weapon name vs skin name).
- Pure, memoized derivation layer over the items snapshot.

## Non-goals (v1)

- Prices on cards (the items blob carries no pricing).
- In-page filter UI (the existing `/search` page covers filtering/sorting).
- Sitemap entries for the new pages.
- Cross-links injected into the existing `/item/[itemId]` detail page.
- Item types outside Weapons / Knives / Gloves / Agents (no Stickers, Charms,
  Graffiti, Music Kits, Patches, Keys, Tools, Collectibles in v1).

These are explicitly deferred and may be fast-followed.

## Data reality (verified against the live `snapshots/items.json.gz`, 40,471 items)

Each record (`ItemOut`) carries these fields relevant here:

```text
item_id, market_hash_name, phase, item_type, item_subtype, weapon_type,
base_name, skin_name, wear_name, collection, collection_image,
crates[], crates_images[], rarity_name, rarity_color, style_name,
is_stattrak, is_souvenir, image_url, supply
```

- `collection_image` and `crates_images` **exist in the blob** but are **absent
  from the `ItemOut` TypeScript type** — the type must be extended. They may be
  `null` or `[""]`.
- `item_type` distribution: Weapon 16014, Charm 11370, Sticker 10427, Graffiti
  1727, Patch 112, Collectible 77, Agent 63, Crate 469, Music Kit 183, Key 27,
  Tool 2.
- **Weapon** subtypes (`item_subtype`): Rifles, Pistols, SMGs, Heavy, Equipment,
  **Knives**, **Gloves**. (Knives and Gloves are subtypes of Weapon but are
  surfaced as their own top-level browse categories.)
- **Knives/Gloves**: `collection = null`; their container linkage is in
  `crates[]` (cases). `base_name` = e.g. "Butterfly Knife" / "Sport Gloves",
  `skin_name` = the finish.
- **Agents** (`item_type = "Agent"`): `collection = "…Agents"`, faction in
  `item_subtype` (Terrorist / Counter-Terrorist), `weapon_type = null`, no
  `wear_name`, `crates = [""]`. Each agent is a single item with no skins
  beneath it.
- A skin can appear under both a Collection and a Case (e.g. AK-47 Leet Museo is
  in "The Operation Riptide Collection" and the "Operation Riptide Case"). That
  dual membership is the cross-relationship the section exposes; dedup is always
  scoped to a single page.

## Routes

All under the `(public)` route group, top-level paths (good SEO, mirrors
csgoskins.gg). No collisions with existing routes (`/search`, `/pricing`,
`/item`, `/apis`, etc.).

```text
/browse                      → hub linking to all six categories (optional, included)
/weapons                     → guns grouped by subtype: Pistols, Rifles, SMGs, Heavy, Equipment
/weapons/[weapon]            → all skins of one base weapon (e.g. /weapons/ak-47)
/knives                      → all knife base types
/knives/[knife]              → all finishes of one knife base
/gloves                      → all glove base types
/gloves/[glove]              → all finishes of one glove base
/agents                      → all agents, grouped by collection, faction badge per card
/collections                 → all collections (with collection_image)
/collections/[slug]          → all skins in a collection
/cases                       → all weapon cases (with crate image)
/cases/[slug]                → all skins in a case
```

Knives and Gloves use the same index→detail shape as weapons but are filtered to
their respective subtypes and excluded from `/weapons`.

`/weapons` excludes the Knives and Gloves subtypes (they are their own
categories). `Equipment` (Zeus x27) is kept as a weapon subtype group.

## Slugs

A shared `slugifyName(name)` (reuse/align with the existing
`slugifyMarketHashName` style) produces the `[weapon]` / `[slug]` path segments.
Resolution is by **slugifying candidate names from the derived index and
matching** — no stored slug↔name map. If a slug fails to resolve, the page
returns `notFound()`.

Item detail links continue to use the existing `buildItemPath(itemId, name)`.

## The two-link card (the relationship mechanic)

A shared `BrowseItemCard` renders one **deduplicated skin**. Dedup key:
`item_type | item_subtype | base_name | skin_name | phase`. All wears and
StatTrak/Souvenir variants of the same skin collapse into one card.

- **Representative item_id** (the down-link target): choose deterministically —
  prefer `is_stattrak = false` and `is_souvenir = false`, then the lowest-wear
  variant available (Factory New first, falling back through the wear order);
  for items without wear (agents) the single variant. Links via
  `buildItemPath`.
- **Skin name → down**: link to `/item/[itemId]` (existing detail page).
- **Weapon/base name → up**: link to `/weapons/[base]` (or `/knives/[base]`,
  `/gloves/[base]`). **Agent cards omit the up-link** (no weapon parent).

Cards always use `image_url` when present (per the requirement to use images
when available); rarity is conveyed via `rarity_color`.

## Derivation library (`src/lib/browse/`)

Pure functions over `ItemsSnapshotData`, server-only, **memoized by
`items.timestamp`** (same pattern as `candidateCache` in
`src/lib/search/snapshot-search.ts`).

- `taxonomy.ts`
  - Category definitions (the six top-level categories + their metadata).
  - Weapon subtype groupings (Pistols, Rifles, SMGs, Heavy, Equipment).
  - `RARITY_RANK` map derived from the metadata rarity order, for sorting.
  - `slugifyName(name)` and `resolveBySlug(slug, names)` helpers.
- `browse-index.ts`
  - Index builders: `listCollections()`, `listCases()`,
    `listWeapons(subtype)`, `listKnives()`, `listGloves()` — each returns groups
    with name, image, and item/skin counts.
  - `listAgents()` — agents have no detail level; returns all agents grouped by
    collection (with faction per agent) for the single `/agents` index page.
  - Detail builders: `skinsInCollection(slug)`, `skinsInCase(slug)`,
    `skinsOfWeapon(base)`, `skinsOfKnife(base)`, `skinsOfGlove(base)` — each
    returns deduped, rarity-sorted skin groups plus the container/weapon display
    metadata (name, image, count).
  - Default sort: rarity rank (high→low), then skin name A→Z.

The detail builders return enough metadata (display name, hero image, total
count) for the page header so the page component stays thin.

## Components (`src/components/browse/`)

- `BrowseItemCard` — the two-link skin card described above.
- `BrowseGroupCard` — index-page card for a collection / case / weapon / knife /
  glove (image + name + count), linking to the corresponding detail page.
- `BrowseMegaMenu` — the navbar dropdown content (see below). Lives with the
  navbar or under `browse/`; reuses the existing `DropdownMenu` primitives.

Pages compose these; each page file is thin (fetch snapshot → call one
derivation function → render header + grid).

## Navbar mega-dropdown

Add a `BROWSE` entry to `navItems` ordering, placed before `TOOLS`. Opens a
mega-menu with columns:

- **Weapons** — header links to `/weapons`; five subtype anchor links
  (Pistols, Rifles, SMGs, Heavy, Equipment) linking to `/weapons` (optionally
  with a subtype hash/section anchor).
- **Knives** — links to `/knives`.
- **Gloves** — links to `/gloves`.
- **Agents** — links to `/agents`.
- **Containers** — Collections (`/collections`) and Cases (`/cases`).

Styling matches the existing brutalist `DropdownMenuContent` (2px border, mono,
square corners). Mobile menu gets a collapsible "Browse" section mirroring the
existing "Tools" section pattern in `Navbar.tsx`.

## Rendering & caching

- Server Components. No client JS beyond the navbar dropdown (already client).
- `export const revalidate` on the browse pages aligned to the items snapshot
  freshness window (24h / 86400s).
- `generateStaticParams` for the bounded detail sets (collections ~130, cases
  ~100, weapons/knives/gloves base names) and for the indexes. Unknown slugs
  fall through to `notFound()`.
- No prices, no market snapshot, no auth reads.

## Type changes

Extend `ItemOut` in `src/lib/api/types.ts` with the blob-present fields:

```ts
collection_image?: string | null;
crates_images?: (string | null)[];
```

(Confirmed present in the live blob; currently untyped.)

## Testing / verification

No test runner is configured in this repo. Verification is manual:

- `pnpm build` succeeds (type-check + route generation).
- Each index page renders its expected groups with images.
- A detail page (e.g. `/weapons/ak-47`, `/collections/the-operation-riptide-collection`,
  `/cases/fever-case`) renders deduped, rarity-sorted skins.
- Card skin-name link lands on the correct `/item/[itemId]`; card weapon-name
  link lands on the correct `/weapons/[base]`; agent cards omit the up-link.
- Mega-dropdown opens and all six category links navigate correctly; mobile
  Browse section works.
- Unknown slug → 404.

## Risks / notes

- 40k-item iteration per snapshot is amortized by timestamp-keyed memoization;
  first request after a new snapshot pays the build cost once.
- Some `image_url` / `*_image` fields may be `null` or `""`; cards must degrade
  gracefully to a placeholder.
- Wear ordering for representative-variant selection uses the metadata wear
  order (Factory New → Battle-Scarred).
