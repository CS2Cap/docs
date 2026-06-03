# Browse Detail-Page Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an adaptive, client-side attribute filter bar (Rarity, Wear, StatTrak, Souvenir, name search) to every browse item-listing page, filtering the already-server-rendered cards instantly.

**Architecture:** Enrich the deduped `SkinCard` with `wears`/`hasStatTrak`/`hasSouvenir`; extract a client-safe `rarity.ts` so client code can use `rarityRank`/`groupByRarity` (the existing `taxonomy.ts` is `server-only`); add a shared `useBrowseFilter` hook + `BrowseFilterBar`, and three thin client wrappers (one per page layout) that pages swap in for their grid.

**Tech Stack:** Next.js 16 App Router (RSC + client components), TypeScript, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-03-browse-filters-design.md`

**Commit convention:** every commit ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (messages below omit it).

**Verification note:** No test runner (per `CLAUDE.md`). Per-task gates: `npx tsc --noEmit` (exit 0) + a SCOPED `npx eslint <changed files>` → "No issues found" (NEVER bare `pnpm lint` — repo has unrelated pre-existing debt). Controller runs the full `pnpm build` (needs `NODE_OPTIONS=--max-old-space-size=6144` — the repo OOMs otherwise) + runtime smoke at the end. Match the brutalist/mono aesthetic (`font-mono`, `border-2 border-border`, `bg-card`, active = `border-primary text-primary`, square corners) — aesthetic quality is a hard requirement for this user.

---

## File Structure

**Create:**
- `src/lib/browse/rarity.ts` — client-safe pure helpers: `RARITY_ORDER`, `rarityRank`, `WEAR_ORDER`, `wearRank`, `RarityGroup`, `groupByRarity`, `isSpecialCard`.
- `src/components/browse/useBrowseFilter.ts` — client hook + filter/facet types.
- `src/components/browse/BrowseFilterBar.tsx` — client presentational filter bar.
- `src/components/browse/FilterableSkinGrid.tsx` — client wrapper (flat grid).
- `src/components/browse/FilterableSubtypeSections.tsx` — client wrapper (subtype sections).
- `src/components/browse/FilterableRaritySections.tsx` — client wrapper (rarity sections).

**Modify:**
- `src/lib/browse/taxonomy.ts` — import rarity helpers from `./rarity` + re-export them; enrich `SkinCard`/`dedupToCards`.
- 12 pages under `src/app/(public)/` (swap grid → wrapper).

---

## Task 1: Extract client-safe `rarity.ts`

**Files:** Create `src/lib/browse/rarity.ts`; Modify `src/lib/browse/taxonomy.ts`

Rationale: `taxonomy.ts` is `server-only`; client filter code needs `rarityRank`/`groupByRarity`. Move the pure rarity/wear helpers to a client-safe module and re-export from `taxonomy` so existing server importers are unaffected.

- [ ] **Step 1: Create `src/lib/browse/rarity.ts`**

```ts
import type { SkinCard } from "./taxonomy";

// Rarity order from metadata_schema.json (low → high). Higher rank = rarer.
export const RARITY_ORDER = [
  "Base Grade",
  "Consumer Grade",
  "Industrial Grade",
  "Mil-Spec Grade",
  "High Grade",
  "Distinguished",
  "Restricted",
  "Remarkable",
  "Exceptional",
  "Classified",
  "Exotic",
  "Superior",
  "Covert",
  "Extraordinary",
  "Master",
  "Contraband",
];
const RARITY_RANK: Record<string, number> = Object.fromEntries(
  RARITY_ORDER.map((name, i) => [name, i]),
);
export function rarityRank(name: string | null | undefined): number {
  if (!name) return -1;
  return RARITY_RANK[name] ?? -1;
}

// Wear order (Factory New → Battle-Scarred).
export const WEAR_ORDER = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];
export function wearRank(name: string | null | undefined): number {
  if (!name) return -1;
  const i = WEAR_ORDER.indexOf(name);
  return i === -1 ? WEAR_ORDER.length : i;
}

export interface RarityGroup {
  rarityName: string | null;
  rarityColor: string | null;
  skins: SkinCard[];
}

// True for knife & glove cards (the "rare special" items in a case), detected
// via the up-link baseHref builds for those subtypes.
export function isSpecialCard(card: SkinCard): boolean {
  return (
    card.weaponHref?.startsWith("/knives/") === true ||
    card.weaponHref?.startsWith("/gloves/") === true
  );
}

// Bucket cards by rarity, rarest group first. Card order within a group is
// preserved (callers pass cards already sorted by dedupToCards).
export function groupByRarity(cards: SkinCard[]): RarityGroup[] {
  const groups = new Map<string, RarityGroup>();
  for (const card of cards) {
    const key = card.rarityName ?? "";
    let g = groups.get(key);
    if (!g) {
      g = { rarityName: card.rarityName, rarityColor: card.rarityColor, skins: [] };
      groups.set(key, g);
    }
    g.skins.push(card);
  }
  return [...groups.values()].sort(
    (a, b) => rarityRank(b.rarityName) - rarityRank(a.rarityName),
  );
}
```

Note: the `import type { SkinCard }` is fully erased at compile time, so there is no runtime cycle even though `taxonomy.ts` imports values from this file.

- [ ] **Step 2: Refactor `taxonomy.ts` to use/re-export `rarity.ts`**

In `taxonomy.ts`: **delete** the local definitions of `RARITY_ORDER`, `RARITY_RANK`, `rarityRank`, `WEAR_ORDER`, `wearRank`, the `RarityGroup` interface, `isSpecialCard`, and `groupByRarity` (the "Rarity grouping" section and the rarity/wear consts near the top). Replace them by adding, just below the existing `import { buildItemPath, slugifyMarketHashName } from "@/lib/seo/itemSlug";` line:

```ts
import { rarityRank, wearRank, groupByRarity, isSpecialCard } from "./rarity";

export { rarityRank, groupByRarity, isSpecialCard };
export type { RarityGroup } from "./rarity";
```

`dedupToCards` (uses `rarityRank`) and `pickRepresentative` (uses `wearRank`) keep calling those names — now imported. Everything else in `taxonomy.ts` stays.

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (exit 0; existing importers `cases/[slug]`, `RaritySections`, weapons pages resolve via the re-exports). `npx eslint src/lib/browse/rarity.ts src/lib/browse/taxonomy.ts` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/browse/rarity.ts src/lib/browse/taxonomy.ts
git commit -m "refactor(browse): extract client-safe rarity.ts from taxonomy"
```

---

## Task 2: Enrich `SkinCard` with filter attributes

**Files:** Modify `src/lib/browse/taxonomy.ts`

- [ ] **Step 1: Extend the `SkinCard` interface** — add after `topLabel: string | null;`:

```ts
  wears: string[]; // distinct wears this skin covers (FN→BS), empty for non-weapons
  hasStatTrak: boolean;
  hasSouvenir: boolean;
```

- [ ] **Step 2: Compute them in `dedupToCards`** — inside the `for (const variants of groups.values())` loop, after `const rep = pickRepresentative(variants);` and the `if (rep.item_id == null) continue;` guard, add:

```ts
    const wears = [...new Set(variants.map((v) => v.wear_name).filter((w): w is string => !!w))].sort(
      (a, b) => wearRank(a) - wearRank(b),
    );
    const hasStatTrak = variants.some((v) => v.is_stattrak === true);
    const hasSouvenir = variants.some((v) => v.is_souvenir === true);
```

Then add these three to the `cards.push({ ... })` object (e.g. after the `topLabel: ...` field):

```ts
      wears,
      hasStatTrak,
      hasSouvenir,
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (exit 0). `npx eslint src/lib/browse/taxonomy.ts` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/browse/taxonomy.ts
git commit -m "feat(browse): enrich SkinCard with wears + StatTrak/Souvenir flags"
```

---

## Task 3: `useBrowseFilter` hook

**Files:** Create `src/components/browse/useBrowseFilter.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client";

import { useMemo, useState } from "react";
import type { SkinCard } from "@/lib/browse/taxonomy";
import { rarityRank, WEAR_ORDER } from "@/lib/browse/rarity";

export interface BrowseFacets {
  rarities: { name: string; color: string | null }[];
  wears: string[];
  hasStatTrak: boolean;
  hasSouvenir: boolean;
}

export interface BrowseFilters {
  rarities: Set<string>;
  wears: Set<string>;
  stattrakOnly: boolean;
  souvenirOnly: boolean;
  query: string;
}

export interface BrowseFilterState {
  facets: BrowseFacets;
  filters: BrowseFilters;
  setFilters: (next: BrowseFilters) => void;
  filtered: SkinCard[];
  matches: (skin: SkinCard) => boolean;
  total: number;
  active: boolean;
}

export const EMPTY_FILTERS: BrowseFilters = {
  rarities: new Set(),
  wears: new Set(),
  stattrakOnly: false,
  souvenirOnly: false,
  query: "",
};

export function useBrowseFilter(skins: SkinCard[]): BrowseFilterState {
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);

  const facets = useMemo<BrowseFacets>(() => {
    const rarityColors = new Map<string, string | null>();
    const wearSet = new Set<string>();
    let hasStatTrak = false;
    let hasSouvenir = false;
    for (const s of skins) {
      if (s.rarityName && !rarityColors.has(s.rarityName)) rarityColors.set(s.rarityName, s.rarityColor);
      for (const w of s.wears) wearSet.add(w);
      if (s.hasStatTrak) hasStatTrak = true;
      if (s.hasSouvenir) hasSouvenir = true;
    }
    const rarities = [...rarityColors.entries()]
      .map(([name, color]) => ({ name, color }))
      .sort((a, b) => rarityRank(b.name) - rarityRank(a.name));
    const wears = [...wearSet].sort((a, b) => WEAR_ORDER.indexOf(a) - WEAR_ORDER.indexOf(b));
    return { rarities: rarities.length >= 2 ? rarities : [], wears, hasStatTrak, hasSouvenir };
  }, [skins]);

  const matches = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return (s: SkinCard): boolean => {
      if (filters.rarities.size > 0 && (!s.rarityName || !filters.rarities.has(s.rarityName))) return false;
      if (filters.wears.size > 0 && !s.wears.some((w) => filters.wears.has(w))) return false;
      if (filters.stattrakOnly && !s.hasStatTrak) return false;
      if (filters.souvenirOnly && !s.hasSouvenir) return false;
      if (q && !`${s.skinName ?? ""} ${s.baseName}`.toLowerCase().includes(q)) return false;
      return true;
    };
  }, [filters]);

  const filtered = useMemo(() => skins.filter(matches), [skins, matches]);

  const active =
    filters.rarities.size > 0 ||
    filters.wears.size > 0 ||
    filters.stattrakOnly ||
    filters.souvenirOnly ||
    filters.query.trim() !== "";

  return { facets, filters, setFilters, filtered, matches, total: skins.length, active };
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`; `npx eslint src/components/browse/useBrowseFilter.ts` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/useBrowseFilter.ts
git commit -m "feat(browse): useBrowseFilter hook (facets + filtering)"
```

---

## Task 4: `BrowseFilterBar` component

**Files:** Create `src/components/browse/BrowseFilterBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import type { BrowseFacets, BrowseFilters } from "./useBrowseFilter";
import { EMPTY_FILTERS } from "./useBrowseFilter";

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function chipClass(selected: boolean): string {
  return `border-2 px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
    selected
      ? "border-primary text-primary"
      : "border-border text-foreground/80 hover:border-primary/60"
  }`;
}

export function BrowseFilterBar({
  facets,
  filters,
  setFilters,
  shown,
  total,
  active,
}: {
  facets: BrowseFacets;
  filters: BrowseFilters;
  setFilters: (next: BrowseFilters) => void;
  shown: number;
  total: number;
  active: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-2 border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          placeholder="Filter by name..."
          className="h-8 w-48 border border-border bg-muted/50 px-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <span className="font-mono text-[11px] text-muted-foreground">
          {shown} of {total}
        </span>
        {active && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="ml-auto font-mono text-[11px] uppercase tracking-wider text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {facets.rarities.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Rarity
          </span>
          {facets.rarities.map((r) => {
            const selected = filters.rarities.has(r.name);
            return (
              <button
                key={r.name}
                type="button"
                onClick={() => setFilters({ ...filters, rarities: toggle(filters.rarities, r.name) })}
                className={chipClass(selected)}
                style={
                  selected && r.color
                    ? { borderColor: `#${r.color}`, color: `#${r.color}` }
                    : r.color
                      ? { borderLeftColor: `#${r.color}` }
                      : undefined
                }
              >
                {r.name}
              </button>
            );
          })}
        </div>
      )}

      {facets.wears.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Wear
          </span>
          {facets.wears.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setFilters({ ...filters, wears: toggle(filters.wears, w) })}
              className={chipClass(filters.wears.has(w))}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {(facets.hasStatTrak || facets.hasSouvenir) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Special
          </span>
          {facets.hasStatTrak && (
            <button
              type="button"
              onClick={() => setFilters({ ...filters, stattrakOnly: !filters.stattrakOnly })}
              className={chipClass(filters.stattrakOnly)}
            >
              StatTrak™
            </button>
          )}
          {facets.hasSouvenir && (
            <button
              type="button"
              onClick={() => setFilters({ ...filters, souvenirOnly: !filters.souvenirOnly })}
              className={chipClass(filters.souvenirOnly)}
            >
              Souvenir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`; `npx eslint src/components/browse/BrowseFilterBar.tsx` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/BrowseFilterBar.tsx
git commit -m "feat(browse): BrowseFilterBar presentational component"
```

---

## Task 5: `FilterableSkinGrid` wrapper

**Files:** Create `src/components/browse/FilterableSkinGrid.tsx`

- [ ] **Step 1: Write it**

```tsx
"use client";

import type { SkinCard } from "@/lib/browse/taxonomy";
import { SkinGrid } from "./SkinGrid";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useBrowseFilter } from "./useBrowseFilter";

export function FilterableSkinGrid({ skins }: { skins: SkinCard[] }) {
  const { facets, filters, setFilters, filtered, total, active } = useBrowseFilter(skins);
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
        <SkinGrid skins={filtered} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`; `npx eslint src/components/browse/FilterableSkinGrid.tsx` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/FilterableSkinGrid.tsx
git commit -m "feat(browse): FilterableSkinGrid wrapper"
```

---

## Task 6: `FilterableSubtypeSections` wrapper

**Files:** Create `src/components/browse/FilterableSubtypeSections.tsx`

- [ ] **Step 1: Write it**

```tsx
"use client";

import { useMemo } from "react";
import type { SkinCard } from "@/lib/browse/taxonomy";
import { SkinGrid } from "./SkinGrid";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useBrowseFilter } from "./useBrowseFilter";

export function FilterableSubtypeSections({
  sections,
}: {
  sections: { title: string; skins: SkinCard[] }[];
}) {
  const all = useMemo(() => sections.flatMap((s) => s.skins), [sections]);
  const { facets, filters, setFilters, filtered, total, active, matches } = useBrowseFilter(all);
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
            const skins = section.skins.filter(matches);
            if (skins.length === 0) return null;
            return (
              <section key={section.title}>
                <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{section.title}</h2>
                <SkinGrid skins={skins} />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`; `npx eslint src/components/browse/FilterableSubtypeSections.tsx` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/FilterableSubtypeSections.tsx
git commit -m "feat(browse): FilterableSubtypeSections wrapper"
```

---

## Task 7: `FilterableRaritySections` wrapper

**Files:** Create `src/components/browse/FilterableRaritySections.tsx`

- [ ] **Step 1: Write it**

```tsx
"use client";

import { useMemo } from "react";
import type { SkinCard } from "@/lib/browse/taxonomy";
import { groupByRarity } from "@/lib/browse/rarity";
import { RaritySections } from "./RaritySections";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useBrowseFilter } from "./useBrowseFilter";

export function FilterableRaritySections({
  skins,
  specials,
}: {
  skins: SkinCard[];
  specials: SkinCard[];
}) {
  const all = useMemo(() => [...skins, ...specials], [skins, specials]);
  const { facets, filters, setFilters, filtered, total, active, matches } = useBrowseFilter(all);
  const filteredSkins = useMemo(() => skins.filter(matches), [skins, matches]);
  const filteredSpecials = useMemo(() => specials.filter(matches), [specials, matches]);
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
          <RaritySections groups={groupByRarity(filteredSkins)} />
          {filteredSpecials.length > 0 && (
            <section>
              <h2 className="mb-4 font-mono text-lg font-bold">Knives &amp; Gloves</h2>
              <RaritySections groups={groupByRarity(filteredSpecials)} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
```

Note: `groupByRarity` is imported from `@/lib/browse/rarity` (client-safe), NOT `taxonomy` (server-only).

- [ ] **Step 2: Verify** — `npx tsc --noEmit`; `npx eslint src/components/browse/FilterableRaritySections.tsx` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/FilterableRaritySections.tsx
git commit -m "feat(browse): FilterableRaritySections wrapper"
```

---

## Task 8: Wire all 12 detail/flat pages

**Files:** Modify the 12 pages listed below.

For each of these **8 grouped-detail pages**, change the SkinGrid import and usage:
`src/app/(public)/stickers/[slug]/page.tsx`, `src/app/(public)/sticker-slabs/[slug]/page.tsx`, `src/app/(public)/charms/[slug]/page.tsx`, `src/app/(public)/graffiti/[slug]/page.tsx`, `src/app/(public)/collections/[slug]/page.tsx`, `src/app/(public)/weapons/[weapon]/page.tsx`, `src/app/(public)/knives/[knife]/page.tsx`, `src/app/(public)/gloves/[glove]/page.tsx`.

- [ ] **Step 1: Grouped-detail pages** — in each of the 8 files:
  - Replace `import { SkinGrid } from "@/components/browse/SkinGrid";`
    with `import { FilterableSkinGrid } from "@/components/browse/FilterableSkinGrid";`
  - Replace `<SkinGrid skins={detail.skins} />` with `<FilterableSkinGrid skins={detail.skins} />`

- [ ] **Step 2: Music Kits** — `src/app/(public)/music-kits/page.tsx`:
  - Replace `import { SkinGrid } from "@/components/browse/SkinGrid";`
    with `import { FilterableSkinGrid } from "@/components/browse/FilterableSkinGrid";`
  - Replace `<SkinGrid skins={kits} />` with `<FilterableSkinGrid skins={kits} />`

- [ ] **Step 3: Patches** — `src/app/(public)/patches/page.tsx`:
  - Replace `import { SkinGrid } from "@/components/browse/SkinGrid";`
    with `import { FilterableSubtypeSections } from "@/components/browse/FilterableSubtypeSections";`
  - Replace the whole `<div className="flex flex-col gap-10"> … {sections.map(...)} … </div>` block with:
    ```tsx
        <FilterableSubtypeSections sections={sections} />
    ```

- [ ] **Step 4: Collectibles** — `src/app/(public)/collectibles/page.tsx`: identical change to Step 3 (swap the import to `FilterableSubtypeSections`, replace the `sections.map` `<div>` block with `<FilterableSubtypeSections sections={sections} />`).

- [ ] **Step 5: Cases** — `src/app/(public)/cases/[slug]/page.tsx`:
  - Change imports: remove `import { RaritySections } from "@/components/browse/RaritySections";`; change `import { groupByRarity, isSpecialCard } from "@/lib/browse/taxonomy";` to `import { isSpecialCard } from "@/lib/browse/taxonomy";`; add `import { FilterableRaritySections } from "@/components/browse/FilterableRaritySections";`.
  - The page keeps computing `const specials = detail.skins.filter(isSpecialCard);` and `const skins = detail.skins.filter((c) => !isSpecialCard(c));`.
  - Replace the `<div className="flex flex-col gap-10"> <RaritySections groups={groupByRarity(skins)} /> {specials.length > 0 && ( … )} </div>` block with:
    ```tsx
        <FilterableRaritySections skins={skins} specials={specials} />
    ```

- [ ] **Step 6: Verify** — `npx tsc --noEmit` (exit 0). Scoped eslint:
  ```bash
  npx eslint "src/app/(public)/stickers" "src/app/(public)/sticker-slabs" "src/app/(public)/charms" "src/app/(public)/graffiti" "src/app/(public)/collections" "src/app/(public)/weapons" "src/app/(public)/knives" "src/app/(public)/gloves" "src/app/(public)/music-kits" "src/app/(public)/patches" "src/app/(public)/collectibles" "src/app/(public)/cases"
  ```
  Expected: "No issues found."

- [ ] **Step 7: Commit**

```bash
git add "src/app/(public)"
git commit -m "feat(browse): wire filter bar into all detail/flat pages"
```

---

## Task 9: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Scoped lint of all feature files**

```bash
npx eslint src/lib/browse src/components/browse "src/app/(public)"
```
Expected: "No issues found."

- [ ] **Step 2: Type-check** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Production build** — `NODE_OPTIONS="--max-old-space-size=6144" pnpm build`
  Expected: build succeeds (exit 0); detail routes still prerender; no "server-only" import error from a client component (would mean a client file pulled from `taxonomy` instead of `rarity`).

- [ ] **Step 4: Runtime smoke** (`pnpm start` on an alt port)
  Verify: a filter bar appears above the grid on `/weapons/ak-47` with **Rarity + Wear + StatTrak + Souvenir** facets; toggling chips and typing in search narrows the grid live; "N of M" updates; Clear resets. On `/stickers/<group>` there's **no Wear** facet; on `/music-kits` there's **no Rarity** facet but a StatTrak toggle; on a case page (e.g. `/cases/fever-case`) filters re-flow the rarity sections + the Knives & Gloves section; zero-match shows "No items match these filters."

- [ ] **Step 5: Commit (only if fixups were needed)**

```bash
git add -A
git commit -m "chore(browse): build/lint fixups for filters"
```

---

## Self-Review Notes

- **Spec coverage:** card enrichment (Task 2), `useBrowseFilter` facets+filtering (Task 3), `BrowseFilterBar` adaptive controls (Task 4), three wrappers (Tasks 5-7), page wiring incl. cases→rarity-sections (Task 8). The client-safe `rarity.ts` split (Task 1) is the enabling refactor the spec's "Risks" section implies (server-only boundary).
- **server-only boundary:** client components import `SkinCard` as `type` (erased) and `rarityRank`/`groupByRarity`/`WEAR_ORDER` from `rarity.ts` (client-safe) — never values from `taxonomy.ts`. Task 9 Step 3 build catches any leak.
- **Type consistency:** `BrowseFacets`/`BrowseFilters`/`BrowseFilterState`/`EMPTY_FILTERS` defined in Task 3, consumed in Tasks 4-7; `SkinCard.wears/hasStatTrak/hasSouvenir` defined in Task 2, read in Tasks 3-4; `matches` returned by the hook (Task 3) used in Tasks 6-7.
- **No prices/URL params/new requests:** filtering is pure client state over server-rendered cards.
