# Browse hover-rail mega-menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small static BROWSE dropdown with a wide hover-rail mega-menu whose left category rail swaps a center grid of live catalog thumbnails (weapons, knives, gloves, agents, cases, collections), each with a "View all" link.

**Architecture:** A new cached Next route (`/api/browse-nav`) serves a compact catalog payload built from the existing `browse-index`. A client TanStack Query hook (`useBrowseNav`) fetches it on first menu open. A new client component `BrowseMegaMenuDesktop` renders the rail + center grid inside the existing Radix BROWSE dropdown. Mobile keeps the existing simple link menu.

**Tech Stack:** Next.js 16 App Router, React client components, TanStack Query, Radix DropdownMenu, `next/image`, Tailwind v4.

**Testing note:** This repo has **no test runner** (per CLAUDE.md). Verification for every task is `pnpm lint` + `npx tsc --noEmit`, plus a final manual `pnpm dev` check. Commit after each task.

---

## File Structure

- **New** `src/lib/browse/nav-types.ts` — client-safe types (`BrowseNavItem`, `BrowseNavData`). No `server-only` import, so both the server route and client code can import it.
- **Edit** `src/lib/browse/browse-index.ts` — add `buildBrowseNav(ix): BrowseNavData` (server-only, assembles the payload from existing `list*` helpers).
- **New** `src/app/api/browse-nav/route.ts` — cached GET returning `BrowseNavData`.
- **Edit** `src/lib/api/hooks.ts` — add `queryKeys.browseNav` + `useBrowseNav()`.
- **New** `src/components/browse/BrowseMegaMenuDesktop.tsx` — the hover-rail menu (client).
- **Edit** `src/components/Navbar.tsx` — render desktop menu in the BROWSE dropdown and widen the dropdown content.
- **Unchanged** `src/components/browse/BrowseMegaMenu.tsx` — still used by the mobile sheet.

---

### Task 1: Client-safe nav types

**Files:**
- Create: `src/lib/browse/nav-types.ts`

- [ ] **Step 1: Create the types file**

```ts
// Client-safe browse-nav types. Intentionally NO "server-only" import so this
// can be imported by both the API route (server) and the menu/hook (client).
import type { WeaponSubtype } from "./taxonomy";

export interface BrowseNavItem {
  name: string;
  href: string;
  image: string | null;
}

export interface BrowseNavData {
  weapons: Record<WeaponSubtype, BrowseNavItem[]>;
  knives: BrowseNavItem[];
  gloves: BrowseNavItem[];
  agents: BrowseNavItem[];
  cases: BrowseNavItem[];
  collections: BrowseNavItem[];
}
```

> Note: `import type` from `taxonomy.ts` is erased at compile time, so it does not pull `taxonomy`'s `server-only` runtime into client bundles.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/browse/nav-types.ts
git commit -m "feat(browse): add client-safe browse-nav types"
```

---

### Task 2: `buildBrowseNav` payload builder

**Files:**
- Modify: `src/lib/browse/browse-index.ts`

- [ ] **Step 1: Add the `WEAPON_SUBTYPES` value import**

The file currently imports from `./taxonomy` with only `WeaponSubtype` as a type. Add the `WEAPON_SUBTYPES` value and the new types. Replace the existing import block:

```ts
import {
  type AgentGroup,
  type DetailResult,
  type GroupSummary,
  type WeaponSubtype,
  WEAPON_SUBTYPES,
  dedupToCards,
  resolveBySlug,
  slugifyName,
} from "./taxonomy";
import type { BrowseNavData, BrowseNavItem } from "./nav-types";
```

- [ ] **Step 2: Append the builder at the end of the file**

```ts
// ── Browse-nav payload (mega-menu) ────────────────────────────────────────────

const NAV_CAP = 16;

function toNavItems(groups: GroupSummary[], base: string): BrowseNavItem[] {
  return groups.slice(0, NAV_CAP).map((g) => ({
    name: g.name,
    href: `${base}/${g.slug}`,
    image: g.image,
  }));
}

// Compact catalog slice for the BROWSE mega-menu. Each list capped at NAV_CAP;
// the full set lives behind the menu's "View all" links.
export function buildBrowseNav(ix: BrowseIndex): BrowseNavData {
  const weapons = {} as Record<WeaponSubtype, BrowseNavItem[]>;
  for (const subtype of WEAPON_SUBTYPES) {
    weapons[subtype] = toNavItems(listWeapons(ix, subtype), "/weapons");
  }
  return {
    weapons,
    knives: toNavItems(listKnives(ix), "/knives"),
    gloves: toNavItems(listGloves(ix), "/gloves"),
    agents: listAgentGroups(ix)
      .slice(0, NAV_CAP)
      .map((g) => ({ name: g.name, href: "/agents", image: g.image })),
    cases: toNavItems(listCases(ix), "/cases"),
    collections: toNavItems(listCollections(ix), "/collections"),
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (`listWeapons`, `listKnives`, `listGloves`, `listAgentGroups`, `listCases`, `listCollections`, and `BrowseIndex` are all already defined in this file.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/browse/browse-index.ts
git commit -m "feat(browse): build compact browse-nav payload from index"
```

---

### Task 3: `/api/browse-nav` route

**Files:**
- Create: `src/app/api/browse-nav/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextResponse } from "next/server";
import { buildBrowseNav, loadBrowseIndex } from "@/lib/browse/browse-index";
import type { BrowseNavData } from "@/lib/browse/nav-types";

export const revalidate = 86400;

const EMPTY: BrowseNavData = {
  weapons: { Pistols: [], Rifles: [], SMGs: [], Heavy: [], Equipment: [] },
  knives: [],
  gloves: [],
  agents: [],
  cases: [],
  collections: [],
};

export async function GET() {
  const ix = await loadBrowseIndex();
  const data = ix ? buildBrowseNav(ix) : EMPTY;
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/browse-nav/route.ts
git commit -m "feat(browse): add cached /api/browse-nav route"
```

---

### Task 4: `useBrowseNav` query hook

**Files:**
- Modify: `src/lib/api/hooks.ts`

- [ ] **Step 1: Add the type import**

After the existing `import type { ... } from "./types";` block (ends ~line 26), add:

```ts
import type { BrowseNavData } from "@/lib/browse/nav-types";
```

- [ ] **Step 2: Register the query key**

In the `queryKeys` object, add this line (e.g. after `item:`):

```ts
  browseNav: ["browse-nav"] as const,
```

- [ ] **Step 3: Add the hook** (append near the other `useQuery` hooks)

```ts
export function useBrowseNav(enabled: boolean) {
  return useQuery<BrowseNavData>({
    queryKey: queryKeys.browseNav,
    queryFn: async () => {
      const res = await fetch("/api/browse-nav");
      if (!res.ok) throw new Error("Failed to load browse nav");
      return (await res.json()) as BrowseNavData;
    },
    enabled,
    staleTime: 60 * 60_000, // 1h — catalog changes at most daily
  });
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/hooks.ts
git commit -m "feat(browse): add useBrowseNav query hook"
```

---

### Task 5: `BrowseMegaMenuDesktop` component

**Files:**
- Create: `src/components/browse/BrowseMegaMenuDesktop.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useBrowseNav } from "@/lib/api/hooks";
import type { BrowseNavData, BrowseNavItem } from "@/lib/browse/nav-types";

type CategoryKey =
  | "Pistols"
  | "Rifles"
  | "SMGs"
  | "Heavy"
  | "Equipment"
  | "Knives"
  | "Gloves"
  | "Agents"
  | "Cases"
  | "Collections";

const RAIL: Array<{ heading: string; href: string; rows: CategoryKey[] }> = [
  { heading: "Weapons", href: "/weapons", rows: ["Pistols", "Rifles", "SMGs", "Heavy", "Equipment"] },
  { heading: "Gear", href: "/gear", rows: ["Knives", "Gloves", "Agents"] },
  { heading: "Containers", href: "/containers", rows: ["Cases", "Collections"] },
];

const VIEW_ALL: Record<CategoryKey, { href: string; label: string }> = {
  Pistols: { href: "/weapons#pistols", label: "View all pistols" },
  Rifles: { href: "/weapons#rifles", label: "View all rifles" },
  SMGs: { href: "/weapons#smgs", label: "View all SMGs" },
  Heavy: { href: "/weapons#heavy", label: "View all heavy" },
  Equipment: { href: "/weapons#equipment", label: "View all equipment" },
  Knives: { href: "/knives", label: "View all knives" },
  Gloves: { href: "/gloves", label: "View all gloves" },
  Agents: { href: "/agents", label: "View all agents" },
  Cases: { href: "/cases", label: "View all cases" },
  Collections: { href: "/collections", label: "View all collections" },
};

function itemsFor(data: BrowseNavData | undefined, cat: CategoryKey): BrowseNavItem[] {
  if (!data) return [];
  switch (cat) {
    case "Pistols":
    case "Rifles":
    case "SMGs":
    case "Heavy":
    case "Equipment":
      return data.weapons[cat];
    case "Knives":
      return data.knives;
    case "Gloves":
      return data.gloves;
    case "Agents":
      return data.agents;
    case "Cases":
      return data.cases;
    case "Collections":
      return data.collections;
  }
}

export function BrowseMegaMenuDesktop({ onNavigate }: { onNavigate?: () => void }) {
  const [active, setActive] = useState<CategoryKey>("Rifles");
  const { data, isLoading } = useBrowseNav(true);
  const items = itemsFor(data, active);
  const viewAll = VIEW_ALL[active];

  return (
    <div className="flex w-[min(900px,calc(100vw-2rem))]">
      {/* Left rail */}
      <div className="w-52 shrink-0 border-r-2 border-border p-3">
        {RAIL.map((group) => (
          <div key={group.heading} className="mb-3 last:mb-0">
            <Link
              href={group.href}
              onClick={onNavigate}
              className="block px-2 pb-1 font-mono text-xs font-bold uppercase tracking-widest text-primary hover:underline"
            >
              {group.heading}
            </Link>
            {group.rows.map((row) => (
              <button
                key={row}
                type="button"
                onMouseEnter={() => setActive(row)}
                onFocus={() => setActive(row)}
                className={`block w-full px-2 py-1 text-left font-mono text-xs tracking-wider transition-colors ${
                  active === row ? "bg-secondary text-primary" : "text-foreground/90 hover:text-primary"
                }`}
              >
                {row}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Center panel */}
      <div className="min-w-0 flex-1 p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="font-mono text-sm font-bold">{active}</span>
          <Link
            href={viewAll.href}
            onClick={onNavigate}
            className="shrink-0 font-mono text-xs text-primary hover:underline"
          >
            {viewAll.label} →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            Nothing to show.{" "}
            <Link href={viewAll.href} onClick={onNavigate} className="text-primary hover:underline">
              {viewAll.label} →
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <Link
                key={`${item.href}-${item.name}`}
                href={item.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 border border-border bg-card p-2 transition-colors hover:border-primary"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-muted/30">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="font-mono text-[8px] text-muted-foreground">N/A</span>
                  )}
                </div>
                <span className="truncate font-mono text-xs text-foreground group-hover:text-primary">
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS. (The `switch` in `itemsFor` is exhaustive over `CategoryKey`, so no missing-return error.)

- [ ] **Step 3: Commit**

```bash
git add src/components/browse/BrowseMegaMenuDesktop.tsx
git commit -m "feat(browse): add hover-rail desktop mega-menu component"
```

---

### Task 6: Wire desktop menu into the Navbar

**Files:**
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add the import**

Below the existing `import { BROWSE_HREFS, BrowseMegaMenu } from "@/components/browse/BrowseMegaMenu";` line, add:

```ts
import { BrowseMegaMenuDesktop } from "@/components/browse/BrowseMegaMenuDesktop";
```

- [ ] **Step 2: Swap the desktop dropdown content + widen it**

Find the BROWSE `DropdownMenuContent` (currently `className="w-md rounded-none border-2 border-border bg-popover p-0"` wrapping `<BrowseMegaMenu />`). Replace that `DropdownMenuContent` block with:

```tsx
            <DropdownMenuContent
              align="start"
              className="w-[min(900px,calc(100vw-2rem))] rounded-none border-2 border-border bg-popover p-0"
            >
              <BrowseMegaMenuDesktop />
            </DropdownMenuContent>
```

> The mobile sheet (further down, `<BrowseMegaMenu onNavigate={...} />`) stays unchanged — it keeps the simple link menu.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat(browse): use hover-rail mega-menu in desktop navbar"
```

---

### Task 7: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: server on http://localhost:3000, no console errors.

- [ ] **Step 2: Verify the desktop menu**

Open the site, click **BROWSE**. Confirm:
- Wide panel with left rail grouped under WEAPONS / GEAR / CONTAINERS.
- **Rifles** active by default; center shows weapon thumbnails (AK-47, AWP…).
- Hovering Pistols / SMGs / Heavy / Equipment / Knives / Gloves / Agents / Cases / Collections swaps the center grid; thumbnails load from `cdn.cs2c.app`.
- Each panel shows a working **"View all … →"** link to the correct hub/detail page.
- Tabbing with the keyboard moves through rail rows and updates the center panel (focus handler).

- [ ] **Step 3: Verify the mobile menu**

Narrow the viewport (or device toolbar) and open the hamburger → Browse. Confirm the existing simple grouped-link menu still renders (unchanged).

- [ ] **Step 4: Verify the network payload is cached**

In DevTools Network, open BROWSE twice. Confirm `/api/browse-nav` is fetched once (second open served from React Query cache / HTTP cache).

- [ ] **Step 5: Final lint + typecheck**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

---

## Self-Review notes

- **Spec coverage:** data route (Task 3) + builder (Task 2) + types (Task 1) + hook (Task 4) + desktop component (Task 5) + Navbar wiring (Task 6) + mobile-unchanged (Task 6 note) + manual verification (Task 7) — all spec sections covered.
- **Type consistency:** `BrowseNavData` / `BrowseNavItem` defined in Task 1 are used identically in Tasks 2–5. `queryKeys.browseNav` defined and used in Task 4. `buildBrowseNav` defined in Task 2, consumed in Task 3.
- **No test runner:** TDD-style failing-test steps are intentionally replaced by `tsc`/`lint`/manual checks, per repo reality (CLAUDE.md: "no test suite or test runner configured").
