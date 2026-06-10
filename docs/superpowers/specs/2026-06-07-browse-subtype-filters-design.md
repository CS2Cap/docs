# Browse Subtype Filters — Design

**Date:** 2026-06-07
**Status:** Approved (design)
**Scope:** `cs2cap` frontend only (Next.js 16). No backend changes.

## Goal

Add per-item-type **subtype** filtering to the Browse pages, alongside the
existing rarity filter. Each of seven item types gets a fixed set of subtype
filter chips:

| Item type | Subtypes (canonical order) |
|---|---|
| Agent | Counter-Terrorist, Terrorist |
| Charm | Sticker Slab, Normal, Highlight Reel |
| Collectible | Pin, Operation Pass, Tournament Pass |
| Crate | Weapon Case, Gift, Souvenir Package, Sticker Capsule, Graffiti Box, Autograph Capsule, Pins Capsule, Music Kit Box, Patch Capsule, Collection Package, Souvenir Highlight |
| Patch | Other, Team Logo |
| Sticker | Player Autograph, Team Logo, Tournament, Other |
| Weapon | Pistols, Knives, SMGs, Rifles, Heavy, Gloves, Equipment |

All values are confirmed present in the live API (`item_subtype` on
`/v1/web/items`), so no backend work is required.

## Approach

**Extend the existing data-driven, client-side Browse filter system** (chosen
over server-side `?subtype=` query params and over per-page bespoke filters).
Filtering runs entirely client-side over data the static pages already load via
the memoized `buildIndex`. `revalidate = 86400` and `generateStaticParams`
remain untouched — **no new API calls, no added Vercel/serverless cost.** The
existing brutalist/mono chip UI is reused.

Out of scope: URL-sync / deep-linkable filtered URLs (filters stay client
state, matching current behavior). Could be a future enhancement.

## Key data-model facts (verified against live API)

- A **Crate** item (e.g. `Spectrum Case`) carries its own
  `item_subtype` (`Weapon Case`, `Gift`, …). Its `market_hash_name` equals the
  string found in contained skins' `crates[]` array — so crate→subtype can be
  joined by name.
- **Sticker Slabs** are `item_type === "Charm"` with `base_name === "Sticker
  Slab"`. They are currently routed to a separate `/sticker-slabs` page and
  excluded from `/charms`.
- The full sticker subtype set is `Player Autograph, Team Logo, Tournament,
  Other` and the full patch set is `Other, Team Logo` (chip order is the
  canonical order in the table above, not raw API order).
- On group-index pages, the cards represent **collections/cases**, not
  individual items.

## Design

### 1. Data layer — `src/lib/browse/`

**`taxonomy.ts`**
- Add `subtype: string | null` to `SkinCard`, populated from
  `rep.item_subtype`. For charm slabs (`base_name === "Sticker Slab"`), force
  the value `"Sticker Slab"`.
- Add `subtypes: string[]` to `GroupSummary` — the subtype(s) a group card
  represents (used to filter group cards).
- Add canonical ordered subtype constants per item type, matching the table
  above exactly:
  - `AGENT_SUBTYPES`, `CHARM_SUBTYPES`, `COLLECTIBLE_SUBTYPES`,
    `CRATE_SUBTYPES`, `PATCH_SUBTYPES`, `STICKER_SUBTYPES`.
  - Extend `WEAPON_SUBTYPES` to include `"Knives"` and `"Gloves"` (the
    `WeaponSubtype` type widens accordingly). Audit existing
    `WEAPON_SUBTYPES` consumers (`buildBrowseNav`, `baseHref`,
    `weapons/page.tsx`, mega-menu) so widening does not regress nav behavior —
    nav still lists only the original five under "Weapons"; Knives/Gloves keep
    their own departments.

**`browse-index.ts`**
- Add `crateSubtypes: Map<string, string>` to `BrowseIndex`, built in
  `buildIndex` from `item.item_type === "Crate"` items
  (`market_hash_name → item_subtype`).
- `listCases` → set each `GroupSummary.subtypes = [crateSubtype]` (looked up by
  group name; empty array if not found).
- Sticker / charm group summaries → `subtypes` = distinct contained item
  subtypes (slab items mapped to `"Sticker Slab"`).
- `listCharmGroups` → also include the **slab** groups (from the existing
  `slabs` map) with subtype `"Sticker Slab"`. The standalone `/sticker-slabs`
  page and its `slabGroupDetail` stay unchanged.
- Add `listAllWeapons(ix)` returning `GroupSummary[]` across all 7 weapon
  subtypes (including Knives and Gloves), each group tagged with its subtype,
  for the `/weapons` page.
- `toSummaries` gains a way to compute per-group `subtypes` (callback or
  specialization) so collections (out of scope) stay empty while
  stickers/charms/cases populate it.

All additions are computed inside the snapshot-memoized `buildIndex`.

### 2. Filter primitives — `src/components/browse/`

- **Unify the facet shape:**
  - `BrowseFacets = { rarities: {name,color}[]; subtypes: string[] }`
  - `BrowseFilters = { rarities: Set<string>; subtypes: Set<string>; query: string }`
  - Update `EMPTY_FILTERS` accordingly.
- **`useBrowseFilter(skins, subtypeOrder?)`** (item-level): derive a subtype
  facet (distinct `skin.subtype` values, ordered by `subtypeOrder`) and extend
  `matches` to AND-in the subtype check, alongside existing rarity/query.
- **`useGroupFilter(groups, subtypeOrder)`** (group-level, new): emits the same
  facet shape with `rarities: []`. A group matches when its `subtypes`
  intersect the selected set (ANY match); query matches the group `name`.
- **`BrowseFilterBar`**: add a "Type" chip row rendered when
  `facets.subtypes.length > 0`; keep the rarity row conditional as today.
  Reuse `chipClass`. One bar serves both page kinds.
- **`FilterableGroupGrid`** (new): wraps `GroupGrid` + `BrowseFilterBar` via
  `useGroupFilter`. Props mirror `GroupGrid` (`groups`, `hrefBase`, `noun`)
  plus `subtypeOrder`.
- **`FilterableSubtypeSections`**: accept an optional `subtypeOrder` prop and
  pass it through to `useBrowseFilter` so the subtype chip row appears. Section
  titles remain whatever the page provides (subtype names for
  collectibles/patches; collection names for agents).

### 3. Page wiring — `src/app/(public)/`

| Type | Page | Treatment |
|---|---|---|
| Collectible | `/collectibles` | `FilterableSubtypeSections` + `subtypeOrder={COLLECTIBLE_SUBTYPES}` |
| Patch | `/patches` | `FilterableSubtypeSections` + `subtypeOrder={PATCH_SUBTYPES}` |
| Agent | `/agents` | switch to `FilterableSubtypeSections` with **collection** sections + `subtypeOrder={AGENT_SUBTYPES}` (CT/T); gains rarity + query (currently unfiltered) |
| Crate | `/cases` | `FilterableGroupGrid` + `subtypeOrder={CRATE_SUBTYPES}` |
| Sticker | `/stickers` | `FilterableGroupGrid` + `subtypeOrder={STICKER_SUBTYPES}` |
| Charm | `/charms` | `FilterableGroupGrid` (now incl. slab groups) + `subtypeOrder={CHARM_SUBTYPES}` |
| Weapon | `/weapons` | keep sectioned layout + `#pistols`-style anchors (mega-menu links depend on them); wrap in a subtype-facet + query filter that hides non-matching sections/cards; now renders 7 sections incl. Knives & Gloves |

The `/weapons` page keeps its per-subtype `<section id=…>` anchors. Because it
is sectioned (not a flat grid), it uses the group-filter facet/bar but renders
its own sections, hiding any section/card that does not match the active
filter. This is the one page-specific treatment; cases/stickers/charms use the
shared flat `FilterableGroupGrid`.

### 4. Rarity scope

The **rarity** facet appears only on item-level pages (Agents, Collectibles,
Patches), where each card is a single item with one rarity. Group-index cards
(cases, stickers, charms, weapon bases) each span many rarities, so a rarity
chip there is meaningless — those pages show only the **subtype** facet
(+ name query). This is consistent with the decision to "filter the group
cards" rather than flatten them to items.

## Components & boundaries

- **Data layer** (`taxonomy.ts`, `browse-index.ts`): pure, server-only,
  produces `SkinCard.subtype` and `GroupSummary.subtypes` plus the canonical
  subtype constants. Testable by inspecting `buildIndex` output shape.
- **Filter hooks** (`useBrowseFilter`, `useGroupFilter`): pure client logic
  mapping `(items|groups, filters) → filtered + facets`. Independent of UI.
- **Filter UI** (`BrowseFilterBar`, `FilterableGroupGrid`,
  `FilterableSubtypeSections`): presentational, consume the hooks.
- **Pages**: thin wiring that loads the index and passes the right
  `subtypeOrder`.

## Verification

No test suite is configured. Verify via:
1. `pnpm lint` — clean.
2. `NODE_OPTIONS=--max-old-space-size=6144 pnpm build` — succeeds (the build
   OOMs without the memory flag).
3. Manual dev check (`pnpm dev`) for each of the 7 pages:
   - subtype chips appear with the correct canonical labels and only for
     present values;
   - selecting/deselecting chips filters items (item-level) or group cards
     (group-level) correctly, AND-combined with rarity (where shown) and the
     name query;
   - `/weapons` shows Knives & Gloves sections and `#pistols`/`#knives`/etc.
     anchors still scroll;
   - `/charms` includes Sticker Slab groups and the Sticker Slab chip filters
     to them.
