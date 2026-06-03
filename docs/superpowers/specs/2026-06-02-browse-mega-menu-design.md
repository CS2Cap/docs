# Browse hover-rail mega-menu — Design

**Date:** 2026-06-02
**Status:** Approved (pending spec review)

## Problem

The desktop BROWSE dropdown ([`src/components/browse/BrowseMegaMenu.tsx`](../../../src/components/browse/BrowseMegaMenu.tsx))
is a small `w-md` (~28rem) panel with three columns of static text links. It does
not surface the actual catalog (weapon models, cases, collections) and looks
sparse next to competitor mega-menus, which use a category rail with live item
thumbnails. The user wants the BROWSE menu to be bigger and richer, matching the
"hover-rail" structure: a left category rail whose hovered row fills a center
panel with that category's items as thumbnails, each with a "View all" link.

## Goals

- A wide, desktop hover-rail mega-menu that shows real catalog items with images.
- Reuse existing catalog data (`browse-index`) and the existing client-API/proxy
  pattern; no new backend work in `cs2c-api`.
- Keep the existing brutalist styling (`rounded-none`, `border-2`, mono type).
- Keep mobile working with the current simple link menu (hover has no touch
  equivalent).

## Non-goals (YAGNI)

- In-menu search box (the navbar already has a search field).
- "Discover / Trending / Investing / Blog" style sections.
- Per-item prices inside the menu.
- Per-agent detail thumbnails (no agent detail pages exist).

## Architecture

### 1. Data — cached API route + query hook

The rich catalog data lives in [`src/lib/browse/browse-index.ts`](../../../src/lib/browse/browse-index.ts),
which is `server-only` (built from the Vercel Blob snapshot). The Navbar is a
client component used in both a server layout (`(public)/layout.tsx`) and a
client layout (`AuthLayout`), so the menu fetches its data client-side.

**New route:** `src/app/api/browse-nav/route.ts`
- Calls `loadBrowseIndex()` server-side and builds a compact payload.
- Sets edge `Cache-Control` consistent with other catalog endpoints
  (`s-maxage=86400, stale-while-revalidate`), matching the 1-day `revalidate`
  used by the browse hub pages.
- Returns `404`-style empty payload if the snapshot is unavailable (menu then
  shows only the static "View all" links — see Error handling).

**Payload shape** (`BrowseNavData`) — every list is a uniform array of
`BrowseNavItem = { name: string; href: string; image: string | null }`:

```ts
interface BrowseNavData {
  weapons: Record<WeaponSubtype, BrowseNavItem[]>; // Pistols, Rifles, SMGs, Heavy, Equipment
  knives: BrowseNavItem[];
  gloves: BrowseNavItem[];
  agents: BrowseNavItem[];   // agent groups; href → /agents
  cases: BrowseNavItem[];    // href → /cases/<slug>
  collections: BrowseNavItem[]; // href → /collections/<slug>
}
```

- Weapon/knife/glove items come from `listWeapons` / `listKnives` / `listGloves`
  (`GroupSummary` → `{ name, href: /weapons|knives|gloves/<slug>, image }`).
- Cases/collections come from `listCases` / `listCollections`.
- Each list is capped at **16** items; the full set lives behind "View all".
- Ordering: existing index order (A–Z).

**New hook:** `useBrowseNav()` in [`src/lib/api/hooks.ts`](../../../src/lib/api/hooks.ts)
- TanStack Query against `/api/browse-nav` with a long `staleTime` (e.g. 1h) and
  `enabled` gated on first menu open, so the payload is fetched once and cached.
- Registered in the shared `queryKeys` registry.

### 2. Desktop mega-menu — `BrowseMegaMenuDesktop`

New component `src/components/browse/BrowseMegaMenuDesktop.tsx` (client),
rendered inside the existing Radix `DropdownMenuContent` in the Navbar.

- **Panel:** wide (`w-[min(900px,calc(100vw-2rem))]`), `rounded-none`,
  `border-2 border-border bg-popover`, padded. Replaces the `w-md` width on the
  BROWSE `DropdownMenuContent`.
- **Left rail:** category rows grouped under three headers:
  - `WEAPONS` → Pistols, Rifles, SMGs, Heavy, Equipment
  - `GEAR` → Knives, Gloves, Agents
  - `CONTAINERS` → Cases, Collections
  Each row is a button that sets the active category on hover **and** focus
  (keyboard accessible); the active row is highlighted. The header labels link to
  their hub pages (`/weapons`, `/gear`, `/containers`).
- **Center panel:** thumbnail grid of the active category's items (image + name),
  each linking to its detail/hub page, ending with a **"View all &lt;category&gt; →"**
  link. Default active category on open = **Rifles**.
- **State:** local `useState` for the active category key. Data from
  `useBrowseNav()`.
- **Loading:** skeleton placeholder grid (a few muted boxes) until the query
  resolves. The left rail renders immediately (it is static).

### 3. Mobile — unchanged

The Navbar mobile sheet keeps rendering the existing
[`BrowseMegaMenu.tsx`](../../../src/components/browse/BrowseMegaMenu.tsx)
(static grouped links). Only the desktop dropdown swaps to
`BrowseMegaMenuDesktop`. `BROWSE_HREFS` stays exported from the existing module
for the Navbar's active-state check.

## Data flow

```
Navbar (client)
  └─ DropdownMenuContent (BROWSE)
       └─ BrowseMegaMenuDesktop (client)
            ├─ left rail: static categories  → setActive(category)
            └─ center: useBrowseNav() ── GET /api/browse-nav ──┐
                                                               │
   src/app/api/browse-nav/route.ts (server) ───────────────────┘
            └─ loadBrowseIndex() → list{Weapons,Knives,Gloves,Cases,Collections}
                                   + agent groups → BrowseNavData (capped 16)
```

## Error handling

- Snapshot unavailable / route error: `useBrowseNav` returns no data; the center
  panel falls back to just the "View all &lt;category&gt; →" link for the active
  category (the hub pages still work). No thrown errors in the menu.
- Items with no image: render a "NO IMAGE" placeholder tile (same pattern as
  [`SkinCard`](../../../src/components/browse/SkinCard.tsx)).

## Accessibility

- Left-rail rows are real `<button>`s; active category updates on both
  `mouseenter` and `focus`, so keyboard users can tab through categories and see
  the center panel update.
- Center links are standard `next/link` anchors.

## Testing / verification

No test runner is configured in this repo. Verification is manual:
1. `pnpm lint` and `npx tsc --noEmit` pass.
2. `pnpm dev` — open BROWSE: rail shows all categories, Rifles active by default,
   hovering each category swaps the center grid, thumbnails load, "View all"
   links navigate to the correct hub/detail pages.
3. Mobile sheet still shows the existing simple link menu.

## Files touched

- **New:** `src/app/api/browse-nav/route.ts`
- **New:** `src/components/browse/BrowseMegaMenuDesktop.tsx`
- **Edit:** `src/lib/api/hooks.ts` (add `useBrowseNav` + query key)
- **Edit:** `src/components/Navbar.tsx` (render desktop menu, widen BROWSE
  dropdown content)
- **Maybe edit:** `src/lib/browse/browse-index.ts` (small helper to assemble the
  nav payload, if cleaner than building it inline in the route)
- **Unchanged:** `src/components/browse/BrowseMegaMenu.tsx` (mobile)
