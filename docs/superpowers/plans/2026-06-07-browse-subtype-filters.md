# Browse Subtype Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-item-type subtype filter chips to the Browse pages (Agent, Charm, Collectible, Crate, Patch, Sticker, Weapon), alongside the existing rarity filter, entirely client-side.

**Architecture:** Extend the existing data-driven Browse system. The server-only data layer (`taxonomy.ts`, `browse-index.ts`) gains `SkinCard.subtype`, `GroupSummary.subtypes`, a crate→subtype lookup, and canonical subtype constants. Two client filter hooks (`useBrowseFilter` for item cards, new `useGroupFilter` for group cards) derive a subtype facet and filter; `BrowseFilterBar` renders a new "Type" chip row. Pages pass the right `subtypeOrder`. No new API calls; static `revalidate=86400` pages are untouched.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind v4. Package manager **pnpm**. No test runner is configured — verification per task is `pnpm exec tsc --noEmit` (type safety) + `pnpm lint`, with a final `pnpm build` and manual dev check.

**Spec:** `docs/superpowers/specs/2026-06-07-browse-subtype-filters-design.md`

**Note on `WEAPON_SUBTYPES`:** Do NOT widen the existing `WEAPON_SUBTYPES` constant — it drives the mega-menu nav payload (`buildBrowseNav` builds `Record<WeaponSubtype, …>` keyed by exactly the five gun families, and `BrowseMegaMenuDesktop`/`nav-types.ts` depend on that). Instead add a separate `WEAPON_PAGE_SUBTYPES` (Task 1) used only by the `/weapons` page filter.

---

### Task 1: Data types — `SkinCard.subtype`, `GroupSummary` fields, subtype constants

**Files:**
- Modify: `src/lib/browse/taxonomy.ts`

- [ ] **Step 1: Add `subtype` to `SkinCard` and `subtypes`/`href` to `GroupSummary`**

In `src/lib/browse/taxonomy.ts`, change the `GroupSummary` interface (currently lines ~47-52) to:

```ts
export interface GroupSummary {
  name: string;
  slug: string;
  image: string | null;
  count: number; // number of deduped skins
  subtypes: string[]; // subtype(s) this group card represents (for filtering)
  href?: string; // explicit link override (default `${hrefBase}/${slug}`)
}
```

In the `SkinCard` interface, add a `subtype` field right after `rarityColor`:

```ts
  rarityName: string | null;
  rarityColor: string | null;
  subtype: string | null; // item_subtype (slabs → "Sticker Slab"); used for filtering
  itemHref: string; // down-link → /item/[itemId]
```

- [ ] **Step 2: Add canonical subtype constants**

In `src/lib/browse/taxonomy.ts`, immediately after the existing `WEAPON_SUBTYPES` declaration (ends ~line 19), add:

```ts
// Subtype filter vocabularies per item type. Array order = chip display order.
export const AGENT_SUBTYPES = ["Counter-Terrorist", "Terrorist"] as const;
export const CHARM_SUBTYPES = ["Sticker Slab", "Normal", "Highlight Reel"] as const;
export const COLLECTIBLE_SUBTYPES = ["Pin", "Operation Pass", "Tournament Pass"] as const;
export const CRATE_SUBTYPES = [
  "Weapon Case",
  "Gift",
  "Souvenir Package",
  "Sticker Capsule",
  "Graffiti Box",
  "Autograph Capsule",
  "Pins Capsule",
  "Music Kit Box",
  "Patch Capsule",
  "Collection Package",
  "Souvenir Highlight",
] as const;
export const PATCH_SUBTYPES = ["Other", "Team Logo"] as const;
export const STICKER_SUBTYPES = ["Player Autograph", "Team Logo", "Tournament", "Other"] as const;

// Weapon subtypes for the /weapons PAGE filter (includes Knives & Gloves).
// Distinct from WEAPON_SUBTYPES, which drives the mega-menu nav payload and
// must stay limited to the five gun families.
export const WEAPON_PAGE_SUBTYPES = [
  "Pistols",
  "Knives",
  "SMGs",
  "Rifles",
  "Heavy",
  "Gloves",
  "Equipment",
] as const;
```

- [ ] **Step 3: Populate `subtype` in `dedupToCards`**

In `dedupToCards` (in the same file), inside the `for (const variants of groups.values())` loop, after the `hasSouvenir` line and before the `cards.push({`, add:

```ts
    const subtype =
      rep.base_name === "Sticker Slab" ? "Sticker Slab" : rep.item_subtype ?? null;
```

Then add `subtype,` to the pushed card object, right after the `rarityColor: rep.rarity_color ?? null,` line:

```ts
      rarityName: rep.rarity_name ?? null,
      rarityColor: rep.rarity_color ?? null,
      subtype,
      itemHref: buildItemPath(rep.item_id, rep.market_hash_name),
```

- [ ] **Step 4: Typecheck (expected to FAIL)**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL — `browse-index.ts` constructs `GroupSummary` objects in `toSummaries` and `listBases` without the now-required `subtypes` field. This is fixed in Task 2. (If it passes, the new required field was not added correctly — revisit Step 1.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/browse/taxonomy.ts
git commit -m "feat(browse): add subtype to SkinCard/GroupSummary + subtype constants"
```

---

### Task 2: Data layer — crate subtypes, group subtypes, charm+slab list, weapon sections

**Files:**
- Modify: `src/lib/browse/browse-index.ts`

- [ ] **Step 1: Import `WEAPON_PAGE_SUBTYPES`**

In `src/lib/browse/browse-index.ts`, add `WEAPON_PAGE_SUBTYPES` to the existing import from `"./taxonomy"`:

```ts
import {
  type AgentGroup,
  type DetailResult,
  type GroupSummary,
  type SkinCard,
  type WeaponSubtype,
  WEAPON_SUBTYPES,
  WEAPON_PAGE_SUBTYPES,
  dedupToCards,
  resolveBySlug,
  slugifyName,
} from "./taxonomy";
```

- [ ] **Step 2: Add `crateSubtypes` to the `BrowseIndex` interface**

In the `BrowseIndex` interface, add after the `cases` line:

```ts
  cases: Map<string, NamedGroup>; // key: crate name
  crateSubtypes: Map<string, string>; // key: crate market_hash_name → item_subtype
```

- [ ] **Step 3: Build `crateSubtypes` in `buildIndex`**

In `buildIndex`, add the declaration alongside the other map declarations (after `const collectibles: ItemOut[] = [];`):

```ts
  const crateSubtypes = new Map<string, string>();
```

Inside the `for (const item of snap.items)` loop, at the END of the existing `if (item.item_type === "Weapon" …) … else if … else if (item.item_type === "Collectible")` chain, add a new branch:

```ts
    } else if (item.item_type === "Collectible") {
      collectibles.push(item);
    } else if (item.item_type === "Crate") {
      if (item.market_hash_name && item.item_subtype) {
        crateSubtypes.set(item.market_hash_name, item.item_subtype);
      }
    }
```

Add `crateSubtypes,` to the `cache = { … }` object (after `cases,`):

```ts
    collections,
    cases,
    crateSubtypes,
    bases,
```

- [ ] **Step 4: Add a `subtypesOf` callback to `toSummaries` and a `distinctSubtypes` helper**

Replace the existing `toSummaries` function with:

```ts
function toSummaries(
  map: Map<string, NamedGroup>,
  subtypesOf?: (g: NamedGroup) => string[],
): GroupSummary[] {
  return [...map.values()]
    .map((g) => ({
      name: g.name,
      slug: slugifyName(g.name),
      image: g.image,
      count: dedupToCards(g.items).length,
      subtypes: subtypesOf ? subtypesOf(g) : [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Distinct item subtypes within a group's items (slabs → "Sticker Slab").
function distinctSubtypes(items: ItemOut[]): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const st = it.base_name === "Sticker Slab" ? "Sticker Slab" : it.item_subtype;
    if (st) set.add(st);
  }
  return [...set];
}
```

- [ ] **Step 5: Attach subtypes in `listCases`, `listBases`, `listStickerGroups`**

Replace `listCases` with:

```ts
export function listCases(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.cases, (g) => {
    const st = ix.crateSubtypes.get(g.name);
    return st ? [st] : [];
  });
}
```

In `listBases`, add `subtypes` to the mapped object (after the `count:` line):

```ts
    .map((b) => ({
      name: b.base,
      slug: slugifyName(b.base),
      image: b.items[0]?.image_url ?? null,
      count: dedupToCards(b.items).length,
      subtypes: b.subtype ? [b.subtype] : [],
    }))
```

Replace `listStickerGroups` with:

```ts
export function listStickerGroups(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.stickers, (g) => distinctSubtypes(g.items));
}
```

(Leave `listCollections`, `listCharmGroups`, `listSlabGroups`, `listGraffitiGroups` as-is — they pass no `subtypesOf` and default to `[]`, which is correct. `listCharmGroups` and `listSlabGroups` remain unchanged so the mega-menu nav keeps charms and slabs in separate departments.)

- [ ] **Step 6: Add `listCharmPageGroups` (charms + slabs merged, with hrefs)**

Add after `charmGroupDetail`:

```ts
// Charm browse page: real charm collections plus slab event groups (subtype
// "Sticker Slab"). Slab cards link to their own /sticker-slabs route.
export function listCharmPageGroups(ix: BrowseIndex): GroupSummary[] {
  const charmGroups = toSummaries(ix.charms, (g) => distinctSubtypes(g.items));
  const slabGroups = toSummaries(ix.slabs, () => ["Sticker Slab"]).map((g) => ({
    ...g,
    href: `/sticker-slabs/${g.slug}`,
  }));
  return [...charmGroups, ...slabGroups].sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 7: Add `listWeaponPageSections` (all 7 subtypes incl. Knives/Gloves)**

Add after `listGloves`:

```ts
export interface WeaponPageSection {
  subtype: string;
  groups: GroupSummary[];
}

// Weapon browse page sections in display order, including Knives & Gloves.
export function listWeaponPageSections(ix: BrowseIndex): WeaponPageSection[] {
  return WEAPON_PAGE_SUBTYPES.map((subtype) => ({
    subtype,
    groups: listBases(ix, (s) => s === subtype),
  })).filter((sec) => sec.groups.length > 0);
}
```

- [ ] **Step 8: Typecheck (expected to PASS)**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — all `GroupSummary` constructors now set `subtypes`, and the new exports are well-typed.

- [ ] **Step 9: Commit**

```bash
git add src/lib/browse/browse-index.ts
git commit -m "feat(browse): index crate subtypes, group subtypes, charm+slab & weapon page listers"
```

---

### Task 3: Filter hooks — `useBrowseFilter` subtype facet + new `useGroupFilter`

**Files:**
- Modify: `src/components/browse/useBrowseFilter.ts`
- Create: `src/components/browse/useGroupFilter.ts`

- [ ] **Step 1: Extend facet/filter shapes and `EMPTY_FILTERS`**

In `src/components/browse/useBrowseFilter.ts`, replace the `BrowseFacets`, `BrowseFilters`, and `EMPTY_FILTERS` declarations with:

```ts
export interface BrowseFacets {
  rarities: { name: string; color: string | null }[];
  subtypes: string[];
}

export interface BrowseFilters {
  rarities: Set<string>;
  subtypes: Set<string>;
  query: string;
}
```

```ts
export const EMPTY_FILTERS: BrowseFilters = {
  rarities: new Set(),
  subtypes: new Set(),
  query: "",
};
```

- [ ] **Step 2: Add the shared `orderSubtypes` helper**

In the same file, add (above `useBrowseFilter`):

```ts
// Order present subtype values by a canonical order; unknown values sorted last.
export function orderSubtypes(present: Set<string>, order?: readonly string[]): string[] {
  if (!order) return [...present].sort();
  const inOrder = order.filter((s) => present.has(s));
  const extras = [...present].filter((s) => !order.includes(s)).sort();
  return [...inOrder, ...extras];
}
```

- [ ] **Step 3: Add subtype support to `useBrowseFilter`**

Replace the `useBrowseFilter` function body with:

```ts
export function useBrowseFilter(
  skins: SkinCard[],
  subtypeOrder?: readonly string[],
): BrowseFilterState {
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);

  const facets = useMemo<BrowseFacets>(() => {
    const rarityColors = new Map<string, string | null>();
    const subtypeSet = new Set<string>();
    for (const s of skins) {
      if (s.rarityName && !rarityColors.has(s.rarityName)) rarityColors.set(s.rarityName, s.rarityColor);
      if (s.subtype) subtypeSet.add(s.subtype);
    }
    const rarities = [...rarityColors.entries()]
      .map(([name, color]) => ({ name, color }))
      .sort((a, b) => rarityRank(b.name) - rarityRank(a.name));
    const subtypes = orderSubtypes(subtypeSet, subtypeOrder);
    return {
      rarities: rarities.length >= 2 ? rarities : [],
      subtypes: subtypes.length >= 2 ? subtypes : [],
    };
  }, [skins, subtypeOrder]);

  const matches = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return (s: SkinCard): boolean => {
      if (filters.rarities.size > 0 && (!s.rarityName || !filters.rarities.has(s.rarityName))) return false;
      if (filters.subtypes.size > 0 && (!s.subtype || !filters.subtypes.has(s.subtype))) return false;
      if (q && !`${s.skinName ?? ""} ${s.baseName}`.toLowerCase().includes(q)) return false;
      return true;
    };
  }, [filters]);

  const filtered = useMemo(() => skins.filter(matches), [skins, matches]);

  const active = filters.rarities.size > 0 || filters.subtypes.size > 0 || filters.query.trim() !== "";

  return { facets, filters, setFilters, filtered, matches, total: skins.length, active };
}
```

- [ ] **Step 4: Create `useGroupFilter.ts`**

Create `src/components/browse/useGroupFilter.ts` with:

```ts
"use client";

import { useMemo, useState } from "react";
import type { GroupSummary } from "@/lib/browse/taxonomy";
import { EMPTY_FILTERS, orderSubtypes } from "./useBrowseFilter";
import type { BrowseFacets, BrowseFilters } from "./useBrowseFilter";

export interface GroupFilterState {
  facets: BrowseFacets;
  filters: BrowseFilters;
  setFilters: (next: BrowseFilters) => void;
  filtered: GroupSummary[];
  matches: (g: GroupSummary) => boolean;
  total: number;
  active: boolean;
}

// Group-card filter for index pages. Only the subtype facet applies (group
// cards span many rarities), so `facets.rarities` is always empty.
export function useGroupFilter(
  groups: GroupSummary[],
  subtypeOrder?: readonly string[],
): GroupFilterState {
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);

  const facets = useMemo<BrowseFacets>(() => {
    const subtypeSet = new Set<string>();
    for (const g of groups) for (const s of g.subtypes) subtypeSet.add(s);
    const subtypes = orderSubtypes(subtypeSet, subtypeOrder);
    return { rarities: [], subtypes: subtypes.length >= 2 ? subtypes : [] };
  }, [groups, subtypeOrder]);

  const matches = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return (g: GroupSummary): boolean => {
      if (filters.subtypes.size > 0 && !g.subtypes.some((s) => filters.subtypes.has(s))) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    };
  }, [filters]);

  const filtered = useMemo(() => groups.filter(matches), [groups, matches]);

  const active = filters.subtypes.size > 0 || filters.query.trim() !== "";

  return { facets, filters, setFilters, filtered, matches, total: groups.length, active };
}
```

- [ ] **Step 5: Typecheck (expected to PASS)**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — the new `BrowseFacets`/`BrowseFilters` only *add* the `subtypes` field, so existing consumers (`BrowseFilterBar`, `FilterableSkinGrid`, `FilterableRaritySections`, `FilterableSubtypeSections`) still compile against `rarities`/`query`, and `useBrowseFilter`'s new second arg is optional. `BrowseFilterBar` does not render the subtype row until Task 4 — that is expected.

- [ ] **Step 6: Commit**

```bash
git add src/components/browse/useBrowseFilter.ts src/components/browse/useGroupFilter.ts
git commit -m "feat(browse): subtype facet in useBrowseFilter + new useGroupFilter hook"
```

---

### Task 4: `BrowseFilterBar` — add the "Type" chip row

**Files:**
- Modify: `src/components/browse/BrowseFilterBar.tsx`

- [ ] **Step 1: Render a subtype chip row**

In `src/components/browse/BrowseFilterBar.tsx`, directly after the closing `)}` of the existing `{facets.rarities.length > 0 && ( … )}` block and before the final `</div>`, add:

```tsx
      {facets.subtypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Type
          </span>
          {facets.subtypes.map((s) => {
            const selected = filters.subtypes.has(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilters({ ...filters, subtypes: toggle(filters.subtypes, s) })}
                className={chipClass(selected)}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
```

- [ ] **Step 2: Typecheck (expected to PASS)**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: PASS (no new errors).

- [ ] **Step 4: Commit**

```bash
git add src/components/browse/BrowseFilterBar.tsx
git commit -m "feat(browse): render subtype Type chip row in BrowseFilterBar"
```

---

### Task 5: Group grid components — `href` support, `FilterableGroupGrid`, `FilterableGroupSections`

**Files:**
- Modify: `src/components/browse/GroupGrid.tsx`
- Create: `src/components/browse/FilterableGroupGrid.tsx`
- Create: `src/components/browse/FilterableGroupSections.tsx`

- [ ] **Step 1: Honor `GroupSummary.href` in `GroupGrid`**

In `src/components/browse/GroupGrid.tsx`, change the `href` prop passed to `GroupCard` from:

```tsx
          href={`${hrefBase}/${g.slug}`}
```

to:

```tsx
          href={g.href ?? `${hrefBase}/${g.slug}`}
```

- [ ] **Step 2: Create `FilterableGroupGrid.tsx` (flat group pages)**

Create `src/components/browse/FilterableGroupGrid.tsx` with:

```tsx
"use client";

import type { GroupSummary } from "@/lib/browse/taxonomy";
import { GroupGrid } from "./GroupGrid";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useGroupFilter } from "./useGroupFilter";

export function FilterableGroupGrid({
  groups,
  hrefBase,
  noun,
  subtypeOrder,
}: {
  groups: GroupSummary[];
  hrefBase: string;
  noun?: string;
  subtypeOrder?: readonly string[];
}) {
  const { facets, filters, setFilters, filtered, total, active } = useGroupFilter(
    groups,
    subtypeOrder,
  );
  return (
    <>
      <BrowseFilterBar
        facets={facets}
        filters={filters}
        setFilters={setFilters}
        shown={filtered.length}
        total={total}
        active={active}
      />
      <GroupGrid groups={filtered} hrefBase={hrefBase} noun={noun} />
    </>
  );
}
```

- [ ] **Step 3: Create `FilterableGroupSections.tsx` (sectioned weapons page)**

Create `src/components/browse/FilterableGroupSections.tsx` with:

```tsx
"use client";

import { useMemo } from "react";
import type { GroupSummary } from "@/lib/browse/taxonomy";
import { GroupGrid } from "./GroupGrid";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useGroupFilter } from "./useGroupFilter";

export function FilterableGroupSections({
  sections,
  hrefBase,
  subtypeOrder,
}: {
  sections: { subtype: string; groups: GroupSummary[] }[];
  hrefBase: string;
  subtypeOrder?: readonly string[];
}) {
  const all = useMemo(() => sections.flatMap((s) => s.groups), [sections]);
  const { facets, filters, setFilters, filtered, total, active, matches } = useGroupFilter(
    all,
    subtypeOrder,
  );
  return (
    <>
      <BrowseFilterBar
        facets={facets}
        filters={filters}
        setFilters={setFilters}
        shown={filtered.length}
        total={total}
        active={active}
      />
      {filtered.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground">No items match these filters.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map((section) => {
            const groups = section.groups.filter(matches);
            if (groups.length === 0) return null;
            return (
              <section
                key={section.subtype}
                id={section.subtype.toLowerCase()}
                className="scroll-mt-20"
              >
                <h2 className="mb-3 font-mono text-lg font-semibold text-primary">
                  {section.subtype}
                </h2>
                <GroupGrid groups={groups} hrefBase={hrefBase} />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Typecheck + lint (expected to PASS)**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/browse/GroupGrid.tsx src/components/browse/FilterableGroupGrid.tsx src/components/browse/FilterableGroupSections.tsx
git commit -m "feat(browse): GroupSummary href override + FilterableGroupGrid/Sections"
```

---

### Task 6: `FilterableSubtypeSections` — accept `subtypeOrder`

**Files:**
- Modify: `src/components/browse/FilterableSubtypeSections.tsx`

- [ ] **Step 1: Thread `subtypeOrder` into the hook**

In `src/components/browse/FilterableSubtypeSections.tsx`, change the component signature and the `useBrowseFilter` call. Replace:

```tsx
export function FilterableSubtypeSections({
  sections,
}: {
  sections: { title: string; skins: SkinCard[] }[];
}) {
  const all = useMemo(() => sections.flatMap((s) => s.skins), [sections]);
  const { facets, filters, setFilters, filtered, total, active, matches } = useBrowseFilter(all);
```

with:

```tsx
export function FilterableSubtypeSections({
  sections,
  subtypeOrder,
}: {
  sections: { title: string; skins: SkinCard[] }[];
  subtypeOrder?: readonly string[];
}) {
  const all = useMemo(() => sections.flatMap((s) => s.skins), [sections]);
  const { facets, filters, setFilters, filtered, total, active, matches } = useBrowseFilter(
    all,
    subtypeOrder,
  );
```

- [ ] **Step 2: Typecheck (expected to PASS)**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/FilterableSubtypeSections.tsx
git commit -m "feat(browse): FilterableSubtypeSections accepts subtypeOrder"
```

---

### Task 7: Wire item-level pages — Collectibles, Patches, Agents

**Files:**
- Modify: `src/app/(public)/collectibles/page.tsx`
- Modify: `src/app/(public)/patches/page.tsx`
- Modify: `src/app/(public)/agents/page.tsx`

- [ ] **Step 1: Collectibles — pass `COLLECTIBLE_SUBTYPES`**

In `src/app/(public)/collectibles/page.tsx`, add the import:

```tsx
import { COLLECTIBLE_SUBTYPES } from "@/lib/browse/taxonomy";
```

and change the render to:

```tsx
        <FilterableSubtypeSections sections={sections} subtypeOrder={COLLECTIBLE_SUBTYPES} />
```

- [ ] **Step 2: Patches — pass `PATCH_SUBTYPES`**

In `src/app/(public)/patches/page.tsx`, add the import:

```tsx
import { PATCH_SUBTYPES } from "@/lib/browse/taxonomy";
```

and change the render to:

```tsx
        <FilterableSubtypeSections sections={sections} subtypeOrder={PATCH_SUBTYPES} />
```

- [ ] **Step 3: Agents — switch to filterable, sections by collection**

Replace the entire body of `src/app/(public)/agents/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableSubtypeSections } from "@/components/browse/FilterableSubtypeSections";
import { listAgentGroups, loadBrowseIndex } from "@/lib/browse/browse-index";
import { AGENT_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Agents — Browse Every Agent Skin",
  description: "Browse all Counter-Strike 2 agents by collection.",
};

export default async function AgentsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const sections = listAgentGroups(ix).map((g) => ({ title: g.name, skins: g.agents }));
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Agents</h1>
        <FilterableSubtypeSections sections={sections} subtypeOrder={AGENT_SUBTYPES} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 4: Typecheck + lint (expected to PASS)**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS. (The previous `SkinGrid` import in agents/page.tsx is removed by the full-body replacement — confirm no unused-import lint error.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/collectibles/page.tsx" "src/app/(public)/patches/page.tsx" "src/app/(public)/agents/page.tsx"
git commit -m "feat(browse): subtype filters on collectibles, patches, agents pages"
```

---

### Task 8: Wire group-index pages — Cases, Stickers, Charms

**Files:**
- Modify: `src/app/(public)/cases/page.tsx`
- Modify: `src/app/(public)/stickers/page.tsx`
- Modify: `src/app/(public)/charms/page.tsx`

- [ ] **Step 1: Cases — `FilterableGroupGrid` + `CRATE_SUBTYPES`**

In `src/app/(public)/cases/page.tsx`, replace the `GroupGrid` import with `FilterableGroupGrid`, add the constants import, and swap the render. Change:

```tsx
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listCases, loadBrowseIndex } from "@/lib/browse/browse-index";
```

to:

```tsx
import { FilterableGroupGrid } from "@/components/browse/FilterableGroupGrid";
import { listCases, loadBrowseIndex } from "@/lib/browse/browse-index";
import { CRATE_SUBTYPES } from "@/lib/browse/taxonomy";
```

and change:

```tsx
        <GroupGrid groups={cases} hrefBase="/cases" />
```

to:

```tsx
        <FilterableGroupGrid groups={cases} hrefBase="/cases" subtypeOrder={CRATE_SUBTYPES} />
```

- [ ] **Step 2: Stickers — `FilterableGroupGrid` + `STICKER_SUBTYPES`**

In `src/app/(public)/stickers/page.tsx`, change:

```tsx
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listStickerGroups, loadBrowseIndex } from "@/lib/browse/browse-index";
```

to:

```tsx
import { FilterableGroupGrid } from "@/components/browse/FilterableGroupGrid";
import { listStickerGroups, loadBrowseIndex } from "@/lib/browse/browse-index";
import { STICKER_SUBTYPES } from "@/lib/browse/taxonomy";
```

and change:

```tsx
        <GroupGrid groups={groups} hrefBase="/stickers" noun="sticker" />
```

to:

```tsx
        <FilterableGroupGrid
          groups={groups}
          hrefBase="/stickers"
          noun="sticker"
          subtypeOrder={STICKER_SUBTYPES}
        />
```

- [ ] **Step 3: Charms — include slabs, `FilterableGroupGrid` + `CHARM_SUBTYPES`**

In `src/app/(public)/charms/page.tsx`, change:

```tsx
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listCharmGroups, loadBrowseIndex } from "@/lib/browse/browse-index";
```

to:

```tsx
import { FilterableGroupGrid } from "@/components/browse/FilterableGroupGrid";
import { listCharmPageGroups, loadBrowseIndex } from "@/lib/browse/browse-index";
import { CHARM_SUBTYPES } from "@/lib/browse/taxonomy";
```

change the data call:

```tsx
  const groups = listCharmPageGroups(ix);
```

change the count line to reflect that groups now include slabs (the existing `{groups.length} collections` text stays accurate as a group count, but update the noun to "groups" for correctness):

```tsx
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} groups</p>
```

and change the render:

```tsx
        <FilterableGroupGrid groups={groups} hrefBase="/charms" noun="charm" subtypeOrder={CHARM_SUBTYPES} />
```

- [ ] **Step 4: Typecheck + lint (expected to PASS)**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/cases/page.tsx" "src/app/(public)/stickers/page.tsx" "src/app/(public)/charms/page.tsx"
git commit -m "feat(browse): subtype filters on cases, stickers, charms (incl. slabs)"
```

---

### Task 9: Wire the Weapons page (sectioned + filter, incl. Knives/Gloves)

**Files:**
- Modify: `src/app/(public)/weapons/page.tsx`

- [ ] **Step 1: Replace the weapons page body**

Replace the entire body of `src/app/(public)/weapons/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableGroupSections } from "@/components/browse/FilterableGroupSections";
import { listWeaponPageSections, loadBrowseIndex } from "@/lib/browse/browse-index";
import { WEAPON_PAGE_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Weapons — Browse Every Weapon Skin",
  description: "Browse all Counter-Strike 2 weapons by category and view their skins.",
};

export default async function WeaponsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const sections = listWeaponPageSections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Weapons</h1>
        <FilterableGroupSections
          sections={sections}
          hrefBase="/weapons"
          subtypeOrder={WEAPON_PAGE_SUBTYPES}
        />
      </main>
      <FooterSection />
    </>
  );
}
```

Note: `FilterableGroupSections` renders `<section id={subtype.toLowerCase()}>` for each section, preserving the `#pistols`/`#rifles`/`#smgs`/`#heavy`/`#equipment` anchors the mega-menu links to (and adds `#knives`/`#gloves`).

- [ ] **Step 2: Verify knife/glove cards still link to their own routes**

`listWeaponPageSections` uses `listBases`, whose `GroupSummary` has no `href`, so cards link to `/weapons/<slug>`. Knives and Gloves bases must still resolve. Confirm by reading `src/app/(public)/weapons/[weapon]/page.tsx`: it calls `baseDetail` then `notFound()` when `detail.subtitle === "Knives" || "Gloves"`. **This means a knife card at `/weapons/<slug>` would 404.** Fix: in the weapons page, give Knives/Gloves sections' groups an explicit `href` to `/knives/<slug>` and `/gloves/<slug>`.

Replace the `const sections = listWeaponPageSections(ix);` line with:

```tsx
  const sections = listWeaponPageSections(ix).map((sec) => {
    const base =
      sec.subtype === "Knives" ? "/knives" : sec.subtype === "Gloves" ? "/gloves" : "/weapons";
    return base === "/weapons"
      ? sec
      : { ...sec, groups: sec.groups.map((g) => ({ ...g, href: `${base}/${g.slug}` })) };
  });
```

- [ ] **Step 3: Typecheck + lint (expected to PASS)**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/weapons/page.tsx"
git commit -m "feat(browse): filterable weapons page with Knives & Gloves sections"
```

---

### Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: both PASS, no errors.

- [ ] **Step 2: Production build**

Run: `NODE_OPTIONS=--max-old-space-size=6144 pnpm build`
Expected: build succeeds. (The flag is required — the build OOMs without it.)

- [ ] **Step 3: Manual dev check**

Run: `pnpm dev`, then in the browser verify each page shows a "Type" chip row with the correct canonical labels and that toggling chips filters correctly (AND-combined with the rarity chips where shown and the name query):

- `/collectibles` — chips: Pin, Operation Pass, Tournament Pass (+ rarity).
- `/patches` — chips: Other, Team Logo (+ rarity).
- `/agents` — chips: Counter-Terrorist, Terrorist (+ rarity); sections still grouped by collection.
- `/cases` — chips: the crate subtypes (Weapon Case, Gift, …); selecting one shows only those case cards; no rarity row.
- `/stickers` — chips: Player Autograph, Team Logo, Tournament, Other; no rarity row.
- `/charms` — chips: Sticker Slab, Normal, Highlight Reel; Sticker Slab shows the slab groups, and a slab card navigates to `/sticker-slabs/<slug>` (resolves, no 404).
- `/weapons` — 7 sections incl. Knives & Gloves; selecting a chip narrows to that section; `#pistols`/`#knives` anchors scroll; a knife card navigates to `/knives/<slug>` (resolves), a pistol card to `/weapons/<slug>` (resolves).

- [ ] **Step 4: Confirm nav is unchanged**

Open the BROWSE mega-menu (desktop) — the Weapons rail still lists only Pistols/Rifles/SMGs/Heavy/Equipment, and Charms vs Sticker Slabs remain separate departments. (Confirms `WEAPON_SUBTYPES`/`listCharmGroups`/`listSlabGroups` were left untouched.)

- [ ] **Step 5: Final commit (if any manual-check fixes were needed)**

```bash
git add -A
git commit -m "fix(browse): address subtype-filter verification findings"
```

(Skip if Steps 1-4 needed no changes.)
