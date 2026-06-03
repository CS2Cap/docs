# Browse Extras (Stickers + remaining types) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browse pages for the 7 remaining CS2 item categories (Stickers, Sticker Slabs, Charms, Graffiti, Music Kits, Patches, Collectibles), wired into the existing **data-driven** browse system (hover-rail mega-menu, hub pages, `browse-index`), matching its current aesthetic exactly.

**Architecture:** Extend `buildIndex` to bucket the new item types (reusing the existing `NamedGroup` + `toSummaries`/`namedDetail` generics), extend the `BrowseNavData` pipeline (`nav-types` → `buildBrowseNav` → `/api/browse-nav` → `BrowseMegaMenuDesktop`), and add pages that reuse the existing `GroupGrid`/`SkinGrid`/`GroupCard`/`SkinCard` components. Catalog-only: reads the items snapshot blob, no prices/auth/new infra.

**Tech Stack:** Next.js 16 App Router, React Server Components, TypeScript, Tailwind v4, TanStack Query (existing `useBrowseNav`), Vercel Blob snapshot cache.

**Spec:** `docs/superpowers/specs/2026-06-02-browse-extras-design.md`

**Commit convention:** every commit ends with the trailer
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (harness rule); messages below omit it for brevity.

**Verification note:** This repo has **no test runner** (per `CLAUDE.md`). Gates per task: `npx tsc --noEmit` and `pnpm lint` (feature files must be clean; `main` carries large pre-existing lint debt that is out of scope — verify YOUR files with a scoped `npx eslint <paths>`). Do NOT start a dev server; the controller runs `pnpm build` + runtime smoke at the end. Match the existing brutalist/mono Tailwind style precisely (`font-mono`, `border-2 border-border`, `bg-card`, `hover:border-primary`, `text-primary`, square corners) — aesthetic quality is a hard requirement for this user.

**Aesthetic anchors (study before coding):** `src/components/browse/GroupCard.tsx`, `SkinCard.tsx`, `BrowseMegaMenuDesktop.tsx`, `src/app/(public)/gear/page.tsx`, `src/app/(public)/collections/[slug]/page.tsx`.

---

## File Structure

**Modify:**
- `src/lib/browse/taxonomy.ts` — `SkinCard.faction` → `topLabel`; `dedupToCards` sets `topLabel`.
- `src/lib/browse/nav-types.ts` — extend `BrowseNavData` with 7 lists.
- `src/lib/browse/browse-index.ts` — extend `BrowseIndex`/`buildIndex`; new list/detail/flat helpers; extend `buildBrowseNav`.
- `src/app/api/browse-nav/route.ts` — extend `EMPTY`.
- `src/components/browse/SkinCard.tsx` — render `topLabel`.
- `src/components/browse/GroupCard.tsx` + `GroupGrid.tsx` — optional `noun` prop.
- `src/components/browse/BrowseMegaMenuDesktop.tsx` — 4th rail department.
- `src/components/browse/BrowseMegaMenu.tsx` — 4th mobile column + `BROWSE_HREFS`.
- `src/app/(public)/browse/page.tsx` — add 7 categories.

**Create (pages):**
- `src/app/(public)/stickers/page.tsx` + `stickers/[slug]/page.tsx`
- `src/app/(public)/sticker-slabs/page.tsx` + `sticker-slabs/[slug]/page.tsx`
- `src/app/(public)/charms/page.tsx` + `charms/[slug]/page.tsx`
- `src/app/(public)/graffiti/page.tsx` + `graffiti/[slug]/page.tsx`
- `src/app/(public)/music-kits/page.tsx`
- `src/app/(public)/patches/page.tsx`
- `src/app/(public)/collectibles/page.tsx`
- `src/app/(public)/extras/page.tsx` (hub)

---

## Task 1: `SkinCard.topLabel` (replaces `faction`)

**Files:** Modify `src/lib/browse/taxonomy.ts`, `src/components/browse/SkinCard.tsx`

Rationale: collectibles have `skin_name = null`, so today's card would render the name twice (top label `faction ?? baseName` = baseName, and title `skinName ?? baseName` = baseName). A general `topLabel` fixes it and keeps agents identical.

- [ ] **Step 1: Update the `SkinCard` type** — in `taxonomy.ts`, replace the field
  `  faction: string | null; // agents only`
  with
  `  topLabel: string | null; // small label above the title`

- [ ] **Step 2: Update `dedupToCards`** — in `taxonomy.ts`, replace the card field line
  `      faction: rep.item_type === "Agent" ? rep.item_subtype ?? null : null,`
  with:

```ts
      topLabel:
        rep.item_type === "Agent"
          ? rep.item_subtype ?? null // faction (CT/T) — unchanged for agents
          : rep.skin_name == null
            ? rep.item_subtype ?? null // collectibles/keys: subtype, not the name
            : rep.base_name ?? null,
```

- [ ] **Step 3: Update `SkinCard.tsx`** — change the non-weapon label (line ~36) from
  `            {skin.faction ?? skin.baseName}`
  to
  `            {skin.topLabel ?? skin.baseName}`

- [ ] **Step 4: Verify** — `npx tsc --noEmit` passes (agents page + cases page still compile). Run `npx eslint src/lib/browse/taxonomy.ts src/components/browse/SkinCard.tsx` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/browse/taxonomy.ts src/components/browse/SkinCard.tsx
git commit -m "feat(browse): generalize SkinCard faction -> topLabel"
```

---

## Task 2: `GroupCard`/`GroupGrid` `noun` prop

**Files:** Modify `src/components/browse/GroupCard.tsx`, `src/components/browse/GroupGrid.tsx`

- [ ] **Step 1: `GroupCard`** — add an optional `noun`. Replace the props destructure and the count `<span>`:

Props (add `noun`):
```tsx
export function GroupCard({
  href,
  name,
  image,
  count,
  noun = "skin",
}: {
  href: string;
  name: string;
  image: string | null;
  count: number;
  noun?: string;
}) {
```
Count span (replace the existing one):
```tsx
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {count} {count === 1 ? noun : `${noun}s`}
        </span>
```

- [ ] **Step 2: `GroupGrid`** — thread `noun` through. Replace the component:

```tsx
import type { GroupSummary } from "@/lib/browse/taxonomy";
import { GroupCard } from "./GroupCard";

export function GroupGrid({
  groups,
  hrefBase,
  noun,
}: {
  groups: GroupSummary[];
  hrefBase: string; // e.g. "/collections"
  noun?: string;
}) {
  if (groups.length === 0) {
    return <p className="font-mono text-sm text-muted-foreground">Nothing here yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {groups.map((g) => (
        <GroupCard
          key={g.slug}
          href={`${hrefBase}/${g.slug}`}
          name={g.name}
          image={g.image}
          count={g.count}
          noun={noun}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (existing callers omit `noun` → still valid). `npx eslint src/components/browse/GroupCard.tsx src/components/browse/GroupGrid.tsx` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/browse/GroupCard.tsx src/components/browse/GroupGrid.tsx
git commit -m "feat(browse): optional noun on GroupCard/GroupGrid"
```

---

## Task 3: Extend `BrowseIndex` + `buildIndex` for the new types

**Files:** Modify `src/lib/browse/browse-index.ts`

- [ ] **Step 1: Import `SkinCard` type** — in the `./taxonomy` import block, add `type SkinCard,` (alphabetically near the other `type` imports):

```ts
import {
  type AgentGroup,
  type DetailResult,
  type GroupSummary,
  type SkinCard,
  type WeaponSubtype,
  WEAPON_SUBTYPES,
  dedupToCards,
  resolveBySlug,
  slugifyName,
} from "./taxonomy";
```

- [ ] **Step 2: Extend `BrowseIndex`** — add fields to the interface:

```ts
export interface BrowseIndex {
  timestamp: string;
  collections: Map<string, NamedGroup>; // key: collection name
  cases: Map<string, NamedGroup>; // key: crate name
  bases: Map<string, BaseGroup>; // key: base_name (guns + knives + gloves)
  agents: Map<string, NamedGroup>; // key: collection name
  stickers: Map<string, NamedGroup>; // key: collection | capsule | "Other"
  slabs: Map<string, NamedGroup>; // key: tournament/event | "Base"
  charms: Map<string, NamedGroup>; // key: collection (real charms only)
  graffiti: Map<string, NamedGroup>; // key: collection
  musicKits: ItemOut[];
  patches: ItemOut[];
  collectibles: ItemOut[];
}
```

- [ ] **Step 3: Add helpers** — directly above `buildIndex`, add:

```ts
function firstCrate(item: ItemOut): string | null {
  for (const c of item.crates ?? []) if (c) return c;
  return null;
}

function firstCrateImage(item: ItemOut): string | null {
  const crates = item.crates ?? [];
  const imgs = item.crates_images ?? [];
  for (let i = 0; i < crates.length; i++) {
    if (crates[i]) return firstImage(imgs[i]);
  }
  return null;
}

// Tournament/event embedded as the trailing "| <event>" of a Sticker Slab name.
function slabEvent(skinName: string | null | undefined): string {
  if (!skinName) return "Base";
  const parts = skinName.split("|");
  return parts.length > 1 ? parts[parts.length - 1].trim() || "Base" : "Base";
}
```

- [ ] **Step 4: Populate in `buildIndex`** — declare the new maps/arrays alongside the existing ones (after the `agents` map):

```ts
  const stickers = new Map<string, NamedGroup>();
  const slabs = new Map<string, NamedGroup>();
  const charms = new Map<string, NamedGroup>();
  const graffiti = new Map<string, NamedGroup>();
  const musicKits: ItemOut[] = [];
  const patches: ItemOut[] = [];
  const collectibles: ItemOut[] = [];
```

Then extend the `for (const item of snap.items)` chain by appending these `else if` branches after the existing `} else if (item.item_type === "Agent" && item.collection) { ... }` block (i.e. replace the closing `}` of that `else if` with the continuation below):

```ts
    } else if (item.item_type === "Sticker") {
      const group = item.collection || firstCrate(item) || "Other";
      const image =
        firstImage(item.collection_image) || firstCrateImage(item) || firstImage(item.image_url);
      upsertNamed(stickers, group, image, item);
    } else if (item.item_type === "Charm") {
      if (item.base_name === "Sticker Slab") {
        upsertNamed(slabs, slabEvent(item.skin_name), firstImage(item.image_url), item);
      } else if (item.collection) {
        upsertNamed(
          charms,
          item.collection,
          firstImage(item.collection_image) || firstImage(item.image_url),
          item,
        );
      }
    } else if (item.item_type === "Graffiti") {
      if (item.collection) {
        upsertNamed(
          graffiti,
          item.collection,
          firstImage(item.collection_image) || firstImage(item.image_url),
          item,
        );
      }
    } else if (item.item_type === "Music Kit") {
      musicKits.push(item);
    } else if (item.item_type === "Patch") {
      patches.push(item);
    } else if (item.item_type === "Collectible") {
      collectibles.push(item);
    }
```

- [ ] **Step 5: Add to the returned cache object** — update the `cache = { ... }` assignment:

```ts
  cache = {
    timestamp: snap.timestamp,
    collections,
    cases,
    bases,
    agents,
    stickers,
    slabs,
    charms,
    graffiti,
    musicKits,
    patches,
    collectibles,
  };
  return cache;
```

- [ ] **Step 6: Verify** — `npx tsc --noEmit` passes. `npx eslint src/lib/browse/browse-index.ts` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/browse/browse-index.ts
git commit -m "feat(browse): index stickers, slabs, charms, graffiti, music kits, patches, collectibles"
```

---

## Task 4: List/detail/flat query functions

**Files:** Modify `src/lib/browse/browse-index.ts`

- [ ] **Step 1: Grouped list + detail functions** — after the existing `baseDetail` function, add:

```ts
// ── New category groupings (reuse toSummaries/namedDetail generics) ───────────

export function listStickerGroups(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.stickers);
}
export function stickerGroupDetail(ix: BrowseIndex, slug: string): DetailResult | null {
  return namedDetail(ix.stickers, slug, "Stickers");
}

export function listSlabGroups(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.slabs);
}
export function slabGroupDetail(ix: BrowseIndex, slug: string): DetailResult | null {
  return namedDetail(ix.slabs, slug, "Sticker Slabs");
}

export function listCharmGroups(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.charms);
}
export function charmGroupDetail(ix: BrowseIndex, slug: string): DetailResult | null {
  return namedDetail(ix.charms, slug, "Charms");
}

export function listGraffitiGroups(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.graffiti);
}
export function graffitiGroupDetail(ix: BrowseIndex, slug: string): DetailResult | null {
  return namedDetail(ix.graffiti, slug, "Graffiti");
}
```

- [ ] **Step 2: Flat helpers** — append:

```ts
// ── Flat categories (single page, optional subtype sections) ──────────────────

export interface SubtypeSection {
  title: string;
  skins: SkinCard[];
}

function sectionsBySubtype(items: ItemOut[], order: string[]): SubtypeSection[] {
  const by = new Map<string, ItemOut[]>();
  for (const it of items) {
    const key = it.item_subtype ?? "Other";
    const arr = by.get(key);
    if (arr) arr.push(it);
    else by.set(key, [it]);
  }
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  return [...by.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((title) => ({ title, skins: dedupToCards(by.get(title)!) }));
}

export function musicKitCards(ix: BrowseIndex): SkinCard[] {
  return dedupToCards(ix.musicKits);
}

export function patchSections(ix: BrowseIndex): SubtypeSection[] {
  return sectionsBySubtype(ix.patches, ["Team Logo", "Other"]);
}

export function collectibleSections(ix: BrowseIndex): SubtypeSection[] {
  return sectionsBySubtype(ix.collectibles, ["Pin", "Operation Pass", "Tournament Pass"]);
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`; `npx eslint src/lib/browse/browse-index.ts` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/browse/browse-index.ts
git commit -m "feat(browse): list/detail/flat query functions for new categories"
```

---

## Task 5: Extend the browse-nav payload

**Files:** Modify `src/lib/browse/nav-types.ts`, `src/lib/browse/browse-index.ts`, `src/app/api/browse-nav/route.ts`

- [ ] **Step 1: `nav-types.ts`** — extend `BrowseNavData`:

```ts
export interface BrowseNavData {
  weapons: Record<WeaponSubtype, BrowseNavItem[]>;
  knives: BrowseNavItem[];
  gloves: BrowseNavItem[];
  agents: BrowseNavItem[];
  cases: BrowseNavItem[];
  collections: BrowseNavItem[];
  stickers: BrowseNavItem[];
  slabs: BrowseNavItem[];
  charms: BrowseNavItem[];
  graffiti: BrowseNavItem[];
  musicKits: BrowseNavItem[];
  patches: BrowseNavItem[];
  collectibles: BrowseNavItem[];
}
```

- [ ] **Step 2: `buildBrowseNav`** — in `browse-index.ts`, add a small helper for flat-category nav items above `buildBrowseNav`:

```ts
function flatNavItems(cards: SkinCard[], href: string): BrowseNavItem[] {
  return cards.slice(0, NAV_CAP).map((c) => ({
    name: c.skinName ?? c.baseName,
    href,
    image: c.image,
  }));
}
```

Then extend the returned object in `buildBrowseNav` (add the 7 keys after `collections`):

```ts
    collections: toNavItems(listCollections(ix), "/collections"),
    stickers: toNavItems(listStickerGroups(ix), "/stickers"),
    slabs: toNavItems(listSlabGroups(ix), "/sticker-slabs"),
    charms: toNavItems(listCharmGroups(ix), "/charms"),
    graffiti: toNavItems(listGraffitiGroups(ix), "/graffiti"),
    musicKits: flatNavItems(musicKitCards(ix), "/music-kits"),
    patches: flatNavItems(patchSections(ix).flatMap((s) => s.skins), "/patches"),
    collectibles: flatNavItems(
      collectibleSections(ix).flatMap((s) => s.skins),
      "/collectibles",
    ),
```

- [ ] **Step 3: `/api/browse-nav` `EMPTY`** — extend the fallback in `src/app/api/browse-nav/route.ts`:

```ts
const EMPTY: BrowseNavData = {
  weapons: { Pistols: [], Rifles: [], SMGs: [], Heavy: [], Equipment: [] },
  knives: [],
  gloves: [],
  agents: [],
  cases: [],
  collections: [],
  stickers: [],
  slabs: [],
  charms: [],
  graffiti: [],
  musicKits: [],
  patches: [],
  collectibles: [],
};
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` (this will fail to compile `BrowseMegaMenuDesktop` only if it exhaustively switches on nav keys — it does not; it reads specific fields, so it stays valid). `npx eslint src/lib/browse/nav-types.ts src/lib/browse/browse-index.ts src/app/api/browse-nav/route.ts` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/browse/nav-types.ts src/lib/browse/browse-index.ts src/app/api/browse-nav/route.ts
git commit -m "feat(browse): extend browse-nav payload with new categories"
```

---

## Task 6: Grouped category pages — Stickers

**Files:** Create `src/app/(public)/stickers/page.tsx`, `src/app/(public)/stickers/[slug]/page.tsx`

- [ ] **Step 1: Index page** — `src/app/(public)/stickers/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listStickerGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Stickers — Browse Every Sticker Collection",
  description: "Browse all Counter-Strike 2 stickers grouped by collection and capsule.",
};

export default async function StickersPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const groups = listStickerGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Stickers</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} groups</p>
        <GroupGrid groups={groups} hrefBase="/stickers" noun="sticker" />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Detail page** — `src/app/(public)/stickers/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { listStickerGroups, stickerGroupDetail, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listStickerGroups(ix).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? stickerGroupDetail(ix, slug) : null;
  if (!detail) return { title: "Stickers Not Found" };
  return {
    title: `${detail.title} — CS2 Stickers`,
    description: `All ${detail.count} stickers in ${detail.title}.`,
  };
}

export default async function StickerGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = stickerGroupDetail(ix, slug);
  if (!detail) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} stickers</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`; `npx eslint "src/app/(public)/stickers"` → clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/stickers"
git commit -m "feat(browse): stickers index + group detail pages"
```

---

## Task 7: Grouped category pages — Sticker Slabs

**Files:** Create `src/app/(public)/sticker-slabs/page.tsx`, `src/app/(public)/sticker-slabs/[slug]/page.tsx`

- [ ] **Step 1: Index page** — `src/app/(public)/sticker-slabs/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listSlabGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Sticker Slabs — Browse by Tournament",
  description: "Browse all Counter-Strike 2 sticker slabs grouped by tournament.",
};

export default async function StickerSlabsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const groups = listSlabGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Sticker Slabs</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} groups</p>
        <GroupGrid groups={groups} hrefBase="/sticker-slabs" noun="slab" />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Detail page** — `src/app/(public)/sticker-slabs/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { listSlabGroups, slabGroupDetail, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listSlabGroups(ix).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? slabGroupDetail(ix, slug) : null;
  if (!detail) return { title: "Sticker Slabs Not Found" };
  return {
    title: `${detail.title} Sticker Slabs — CS2`,
    description: `All ${detail.count} sticker slabs in ${detail.title}.`,
  };
}

export default async function SlabGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = slabGroupDetail(ix, slug);
  if (!detail) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} slabs</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`; `npx eslint "src/app/(public)/sticker-slabs"` → clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/sticker-slabs"
git commit -m "feat(browse): sticker-slabs index + group detail pages"
```

---

## Task 8: Grouped category pages — Charms

**Files:** Create `src/app/(public)/charms/page.tsx`, `src/app/(public)/charms/[slug]/page.tsx`

- [ ] **Step 1: Index page** — `src/app/(public)/charms/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listCharmGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Charms — Browse Every Charm Collection",
  description: "Browse all Counter-Strike 2 charms grouped by collection.",
};

export default async function CharmsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const groups = listCharmGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Charms</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} collections</p>
        <GroupGrid groups={groups} hrefBase="/charms" noun="charm" />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Detail page** — `src/app/(public)/charms/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { listCharmGroups, charmGroupDetail, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listCharmGroups(ix).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? charmGroupDetail(ix, slug) : null;
  if (!detail) return { title: "Charms Not Found" };
  return {
    title: `${detail.title} — CS2 Charms`,
    description: `All ${detail.count} charms in ${detail.title}.`,
  };
}

export default async function CharmGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = charmGroupDetail(ix, slug);
  if (!detail) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} charms</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`; `npx eslint "src/app/(public)/charms"` → clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/charms"
git commit -m "feat(browse): charms index + collection detail pages"
```

---

## Task 9: Grouped category pages — Graffiti

**Files:** Create `src/app/(public)/graffiti/page.tsx`, `src/app/(public)/graffiti/[slug]/page.tsx`

- [ ] **Step 1: Index page** — `src/app/(public)/graffiti/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listGraffitiGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Graffiti — Browse Every Graffiti Collection",
  description: "Browse all Counter-Strike 2 sealed graffiti grouped by collection.",
};

export default async function GraffitiPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const groups = listGraffitiGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Graffiti</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} collections</p>
        <GroupGrid groups={groups} hrefBase="/graffiti" noun="item" />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Detail page** — `src/app/(public)/graffiti/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { listGraffitiGroups, graffitiGroupDetail, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listGraffitiGroups(ix).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? graffitiGroupDetail(ix, slug) : null;
  if (!detail) return { title: "Graffiti Not Found" };
  return {
    title: `${detail.title} — CS2 Graffiti`,
    description: `All ${detail.count} graffiti in ${detail.title}.`,
  };
}

export default async function GraffitiGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = graffitiGroupDetail(ix, slug);
  if (!detail) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} items</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`; `npx eslint "src/app/(public)/graffiti"` → clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/graffiti"
git commit -m "feat(browse): graffiti index + collection detail pages"
```

---

## Task 10: Flat category pages — Music Kits, Patches, Collectibles

**Files:** Create `src/app/(public)/music-kits/page.tsx`, `src/app/(public)/patches/page.tsx`, `src/app/(public)/collectibles/page.tsx`

- [ ] **Step 1: Music Kits** — `src/app/(public)/music-kits/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { musicKitCards, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Music Kits — Browse Every Music Kit",
  description: "Browse all Counter-Strike 2 music kits.",
};

export default async function MusicKitsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const kits = musicKitCards(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Music Kits</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{kits.length} music kits</p>
        <SkinGrid skins={kits} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Patches** — `src/app/(public)/patches/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { patchSections, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Patches — Browse Every Patch",
  description: "Browse all Counter-Strike 2 patches by type.",
};

export default async function PatchesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const sections = patchSections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Patches</h1>
        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{section.title}</h2>
              <SkinGrid skins={section.skins} />
            </section>
          ))}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Collectibles** — `src/app/(public)/collectibles/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { collectibleSections, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Collectibles — Pins & Passes",
  description: "Browse Counter-Strike 2 collectibles: pins, operation passes, and tournament passes.",
};

export default async function CollectiblesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const sections = collectibleSections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Collectibles</h1>
        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{section.title}</h2>
              <SkinGrid skins={section.skins} />
            </section>
          ))}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit`; `npx eslint "src/app/(public)/music-kits" "src/app/(public)/patches" "src/app/(public)/collectibles"` → clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/music-kits" "src/app/(public)/patches" "src/app/(public)/collectibles"
git commit -m "feat(browse): music-kits, patches, collectibles flat pages"
```

---

## Task 11: `/extras` hub + `/browse` hub update

**Files:** Create `src/app/(public)/extras/page.tsx`; modify `src/app/(public)/browse/page.tsx`

- [ ] **Step 1: `/extras` hub** — mirrors `/gear` exactly. `src/app/(public)/extras/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/FooterSection";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Stickers, Charms, Graffiti & More",
  description:
    "Browse Counter-Strike 2 stickers, sticker slabs, charms, graffiti, music kits, patches, and collectibles.",
};

const CATEGORIES = [
  { label: "Stickers", href: "/stickers", blurb: "Every sticker by collection" },
  { label: "Sticker Slabs", href: "/sticker-slabs", blurb: "Slabs by tournament" },
  { label: "Charms", href: "/charms", blurb: "Charm collections" },
  { label: "Graffiti", href: "/graffiti", blurb: "Sealed graffiti" },
  { label: "Music Kits", href: "/music-kits", blurb: "Every music kit" },
  { label: "Patches", href: "/patches", blurb: "Agent patches" },
  { label: "Collectibles", href: "/collectibles", blurb: "Pins & passes" },
];

export default function ExtrasPage() {
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Stickers &amp; More</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="flex flex-col gap-1 border-2 border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <span className="font-mono text-lg font-semibold text-foreground">{c.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{c.blurb}</span>
            </Link>
          ))}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: `/browse` hub** — extend its `CATEGORIES` array (append after the existing Cases entry):

```tsx
  { label: "Stickers", href: "/stickers", blurb: "Every sticker by collection" },
  { label: "Sticker Slabs", href: "/sticker-slabs", blurb: "Slabs by tournament" },
  { label: "Charms", href: "/charms", blurb: "Charm collections" },
  { label: "Graffiti", href: "/graffiti", blurb: "Sealed graffiti" },
  { label: "Music Kits", href: "/music-kits", blurb: "Every music kit" },
  { label: "Patches", href: "/patches", blurb: "Agent patches" },
  { label: "Collectibles", href: "/collectibles", blurb: "Pins & passes" },
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`; `npx eslint "src/app/(public)/extras" "src/app/(public)/browse"` → clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/extras" "src/app/(public)/browse"
git commit -m "feat(browse): extras hub page + browse hub update"
```

---

## Task 12: Desktop hover-rail — 4th department

**Files:** Modify `src/components/browse/BrowseMegaMenuDesktop.tsx`

- [ ] **Step 1: Extend `CategoryKey`** — add the 7 new keys to the union:

```ts
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
  | "Collections"
  | "Stickers"
  | "Sticker Slabs"
  | "Charms"
  | "Graffiti"
  | "Music Kits"
  | "Patches"
  | "Collectibles";
```

- [ ] **Step 2: Add the 4th `RAIL` department** — append to the `RAIL` array:

```ts
  {
    heading: "Stickers & More",
    href: "/extras",
    rows: ["Stickers", "Sticker Slabs", "Charms", "Graffiti", "Music Kits", "Patches", "Collectibles"],
  },
```

- [ ] **Step 3: Extend `VIEW_ALL`** — add entries (inside the `VIEW_ALL` object, after `Collections`):

```ts
  Stickers: { href: "/stickers", label: "View all stickers" },
  "Sticker Slabs": { href: "/sticker-slabs", label: "View all sticker slabs" },
  Charms: { href: "/charms", label: "View all charms" },
  Graffiti: { href: "/graffiti", label: "View all graffiti" },
  "Music Kits": { href: "/music-kits", label: "View all music kits" },
  Patches: { href: "/patches", label: "View all patches" },
  Collectibles: { href: "/collectibles", label: "View all collectibles" },
```

- [ ] **Step 4: Extend `itemsFor`** — add cases before the closing brace of the `switch`:

```ts
    case "Stickers":
      return data.stickers;
    case "Sticker Slabs":
      return data.slabs;
    case "Charms":
      return data.charms;
    case "Graffiti":
      return data.graffiti;
    case "Music Kits":
      return data.musicKits;
    case "Patches":
      return data.patches;
    case "Collectibles":
      return data.collectibles;
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit` (the `switch` is now exhaustive over the widened `CategoryKey`; confirm no "not all paths return" error — every new key has a case). `npx eslint src/components/browse/BrowseMegaMenuDesktop.tsx` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/browse/BrowseMegaMenuDesktop.tsx
git commit -m "feat(browse): add Stickers & More department to desktop mega-menu"
```

---

## Task 13: Mobile menu column + `BROWSE_HREFS`

**Files:** Modify `src/components/browse/BrowseMegaMenu.tsx`

- [ ] **Step 1: Extend `BROWSE_HREFS`** — append the new routes:

```ts
export const BROWSE_HREFS = [
  "/browse",
  "/weapons",
  "/gear",
  "/knives",
  "/gloves",
  "/agents",
  "/containers",
  "/collections",
  "/cases",
  "/extras",
  "/stickers",
  "/sticker-slabs",
  "/charms",
  "/graffiti",
  "/music-kits",
  "/patches",
  "/collectibles",
];
```

- [ ] **Step 2: Add the 4th `COLUMNS` entry** — append to the `COLUMNS` array:

```ts
  {
    heading: "Stickers & More",
    href: "/extras",
    links: [
      { label: "Stickers", href: "/stickers" },
      { label: "Sticker Slabs", href: "/sticker-slabs" },
      { label: "Charms", href: "/charms" },
      { label: "Graffiti", href: "/graffiti" },
      { label: "Music Kits", href: "/music-kits" },
      { label: "Patches", href: "/patches" },
      { label: "Collectibles", href: "/collectibles" },
    ],
  },
```

- [ ] **Step 3: Widen the grid** — the mobile menu renders inside a full-width container, but the `grid-cols-3` should become `grid-cols-2` so 4 columns wrap cleanly on narrow screens. Change the wrapper:

`<div className="grid grid-cols-3 gap-6 p-4">` → `<div className="grid grid-cols-2 gap-6 p-4">`

- [ ] **Step 4: Verify** — `npx tsc --noEmit`; `npx eslint src/components/browse/BrowseMegaMenu.tsx` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/browse/BrowseMegaMenu.tsx
git commit -m "feat(browse): add Stickers & More to mobile menu + BROWSE_HREFS"
```

---

## Task 14: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Scoped lint of all new/changed feature files**

Run:
```bash
npx eslint src/lib/browse src/components/browse "src/app/(public)/stickers" "src/app/(public)/sticker-slabs" "src/app/(public)/charms" "src/app/(public)/graffiti" "src/app/(public)/music-kits" "src/app/(public)/patches" "src/app/(public)/collectibles" "src/app/(public)/extras" "src/app/(public)/browse" src/app/api/browse-nav
```
Expected: "No issues found."

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (exit 0).

- [ ] **Step 3: Production build** (controller provides `.env.local` with `BLOB_READ_WRITE_TOKEN` for the blob)

Run: `pnpm build`
Expected: build succeeds; new routes appear (`/stickers`, `/stickers/[slug]`, `/sticker-slabs`, `/charms`, `/graffiti`, `/music-kits`, `/patches`, `/collectibles`, `/extras`); detail routes prerender via `generateStaticParams`.

- [ ] **Step 4: Runtime smoke** (`pnpm start` on an alt port)

Verify: `/stickers` lists groups with images + "N stickers"; a sticker group detail renders a grid; `/sticker-slabs` shows tournament groups; `/charms` shows ~6 collections (no "Sticker Slab" pseudo-group); `/graffiti` shows 4; `/music-kits` shows a flat grid; `/patches` + `/collectibles` show subtype sections; a collectible card shows its subtype label + name (no duplication); the desktop BROWSE menu shows a "Stickers & More" department whose rows reveal thumbnails; bogus slug → 404.

- [ ] **Step 5: Commit (only if build/lint fixups were needed)**

```bash
git add -A
git commit -m "chore(browse): build/lint fixups for extras"
```

---

## Self-Review Notes

- **Spec coverage:** routes (Tasks 6-11), grouping rules (Task 3: sticker collection→capsule→Other, slab event parse, charm base-name filter, graffiti collection), flat sections (Task 4), `topLabel` fix (Task 1), `noun` (Task 2), data-driven nav extension (Tasks 5/12/13), hubs (Task 11). All covered.
- **Sticker Slabs excluded from Charms:** Task 3 routes `base_name === "Sticker Slab"` into `slabs`, and only `base_name !== "Sticker Slab"` (with a collection) into `charms` — so `/charms` shows ~6 real collections, never the 10k slabs.
- **Type consistency:** `SkinCard.topLabel` (Task 1) is read in `SkinCard.tsx` (Task 1) and set in `dedupToCards` (Task 1); `SubtypeSection` defined in Task 4 and consumed in Task 10; `BrowseNavData` keys added in Task 5 match `itemsFor`/`data.*` reads in Task 12 (`stickers/slabs/charms/graffiti/musicKits/patches/collectibles`).
- **No prices/auth:** only `loadBrowseIndex`/items-snapshot used.
- **Aesthetic:** every page reuses the existing `GroupGrid`/`SkinGrid`/`GroupCard`/`SkinCard` and the `/gear` hub layout verbatim; the mega-menu changes are data-only additions to the existing hover-rail.
