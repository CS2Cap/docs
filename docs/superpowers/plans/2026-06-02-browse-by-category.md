# Browse-by-Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a catalog-only browse section (Weapons, Knives, Gloves, Agents, Collections, Cases) driven entirely by the items snapshot blob, with a BROWSE navbar mega-dropdown and item cards that link both down (to the item page) and up (to the parent weapon).

**Architecture:** Server Components under `(public)` read `getCachedItemsSnapshot()` and call pure, snapshot-timestamp-memoized derivation functions in a new `src/lib/browse/` module. Thin page files compose two generic grid components (`GroupGrid` for index pages, `SkinGrid` for detail pages). The navbar gains a client mega-dropdown.

**Tech Stack:** Next.js 16 App Router, React Server Components, TypeScript, Tailwind v4, shadcn/ui `DropdownMenu` (Radix), `next/image` (cdn.cs2c.app), Vercel Blob snapshot cache.

**Verification note:** This repo has **no test runner** (`CLAUDE.md`: "There is no test suite or test runner configured"), and user instructions take precedence over the skill's TDD default. Each task is verified with `npx tsc --noEmit`, `pnpm lint`, and (for pages) a `pnpm dev` smoke check against the real blob, then a commit. Do **not** introduce a test framework.

**Spec:** `docs/superpowers/specs/2026-06-02-browse-by-category-design.md`

**Commit convention:** every commit below must end with the trailer
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (harness rule). The
commit messages shown omit it for brevity — append it when committing.

---

## File Structure

**Create:**
- `src/lib/browse/taxonomy.ts` — category/subtype constants, rarity & wear order, slug + href helpers, the `dedupToCards` skin-collapsing function, shared types (`SkinCard`, `GroupSummary`, `DetailResult`, `AgentGroup`).
- `src/lib/browse/browse-index.ts` — `loadBrowseIndex()` + memoized `buildIndex()` + the `list*` / `*Detail` derivation functions over `ItemsSnapshotData`.
- `src/components/browse/SkinCard.tsx` — the two-link deduped skin card.
- `src/components/browse/GroupCard.tsx` — index-page card (image + name + count).
- `src/components/browse/SkinGrid.tsx` — header + responsive grid of `SkinCard`.
- `src/components/browse/GroupGrid.tsx` — header + responsive grid of `GroupCard`.
- `src/components/browse/BrowseMegaMenu.tsx` — navbar dropdown content + shared `BROWSE_CATEGORIES` data (client).
- Pages (all under `src/app/(public)/`):
  - `browse/page.tsx`
  - `weapons/page.tsx`, `weapons/[weapon]/page.tsx`
  - `knives/page.tsx`, `knives/[knife]/page.tsx`
  - `gloves/page.tsx`, `gloves/[glove]/page.tsx`
  - `agents/page.tsx`
  - `collections/page.tsx`, `collections/[slug]/page.tsx`
  - `cases/page.tsx`, `cases/[slug]/page.tsx`

**Modify:**
- `src/lib/api/types.ts` — extend `ItemOut` with `collection_image`, `crates_images`.
- `src/components/Navbar.tsx` — add the BROWSE entry (desktop mega-dropdown + mobile section).

---

## Task 1: Extend the `ItemOut` type

**Files:**
- Modify: `src/lib/api/types.ts:86-109` (the `ItemOut` interface)

- [ ] **Step 1: Add the two blob-present fields**

In `src/lib/api/types.ts`, inside `export interface ItemOut { … }`, add after the `collection?: string;` line:

```ts
  collection_image?: string | null;
```

and after the `crates?: string[];` line:

```ts
  crates_images?: (string | null)[];
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/types.ts
git commit -m "feat(types): add collection_image/crates_images to ItemOut"
```

---

## Task 2: Browse taxonomy module

**Files:**
- Create: `src/lib/browse/taxonomy.ts`

- [ ] **Step 1: Write the module**

Create `src/lib/browse/taxonomy.ts`:

```ts
import "server-only";

import type { ItemOut } from "@/lib/api/types";
import { buildItemPath, slugifyMarketHashName } from "@/lib/seo/itemSlug";

// Weapon subtypes surfaced under /weapons (Knives & Gloves are their own
// top-level categories and are intentionally excluded here).
export type WeaponSubtype = "Pistols" | "Rifles" | "SMGs" | "Heavy" | "Equipment";
export const WEAPON_SUBTYPES: WeaponSubtype[] = [
  "Pistols",
  "Rifles",
  "SMGs",
  "Heavy",
  "Equipment",
];

// Rarity order from metadata_schema.json (low → high). Higher rank = rarer.
const RARITY_ORDER = [
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

// Wear order (Factory New → Battle-Scarred); used to pick a representative
// variant for a deduped skin.
const WEAR_ORDER = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];
function wearRank(name: string | null | undefined): number {
  if (!name) return -1;
  const i = WEAR_ORDER.indexOf(name);
  return i === -1 ? WEAR_ORDER.length : i;
}

// Reuse the existing item slugifier so group slugs are consistent site-wide.
export function slugifyName(name: string): string {
  return slugifyMarketHashName(name);
}

// Resolve a slug back to its source name by matching slugified candidates.
export function resolveBySlug(slug: string, names: Iterable<string>): string | null {
  for (const name of names) {
    if (slugifyName(name) === slug) return name;
  }
  return null;
}

// Up-link target for a weapon-bearing card, by item_subtype.
export function baseHref(subtype: string | null | undefined, base: string): string | null {
  const slug = slugifyName(base);
  if (subtype === "Knives") return `/knives/${slug}`;
  if (subtype === "Gloves") return `/gloves/${slug}`;
  if (subtype && WEAPON_SUBTYPES.includes(subtype as WeaponSubtype)) {
    return `/weapons/${slug}`;
  }
  return null;
}

// ── Shared view types ────────────────────────────────────────────────────────

export interface GroupSummary {
  name: string;
  slug: string;
  image: string | null;
  count: number; // number of deduped skins
}

export interface SkinCard {
  itemId: number;
  baseName: string;
  skinName: string | null;
  image: string | null;
  rarityName: string | null;
  rarityColor: string | null;
  itemHref: string; // down-link → /item/[itemId]
  weaponHref: string | null; // up-link → /weapons|knives|gloves/[base]
  faction: string | null; // agents only
}

export interface DetailResult {
  title: string;
  image: string | null;
  subtitle: string | null;
  count: number;
  skins: SkinCard[];
}

export interface AgentGroup {
  name: string; // collection name
  image: string | null;
  agents: SkinCard[];
}

// ── Dedup ────────────────────────────────────────────────────────────────────

// Collapse all wear + StatTrak/Souvenir variants of the same skin into one
// card. Representative variant: prefer non-StatTrak & non-Souvenir, then the
// lowest wear. Pass includeWeaponHref=false on a weapon detail page (cards are
// already under that weapon).
export function dedupToCards(
  items: ItemOut[],
  opts: { includeWeaponHref?: boolean } = {},
): SkinCard[] {
  const includeWeaponHref = opts.includeWeaponHref ?? true;
  const groups = new Map<string, ItemOut[]>();
  for (const it of items) {
    const key = `${it.base_name ?? ""}|${it.skin_name ?? ""}|${it.phase ?? ""}`;
    const arr = groups.get(key);
    if (arr) arr.push(it);
    else groups.set(key, [it]);
  }

  const cards: SkinCard[] = [];
  for (const variants of groups.values()) {
    const rep = pickRepresentative(variants);
    if (rep.item_id == null) continue;
    cards.push({
      itemId: rep.item_id,
      baseName: rep.base_name ?? "",
      skinName: rep.skin_name ?? null,
      image: rep.image_url ?? null,
      rarityName: rep.rarity_name ?? null,
      rarityColor: rep.rarity_color ?? null,
      itemHref: buildItemPath(rep.item_id, rep.market_hash_name),
      weaponHref: includeWeaponHref ? baseHref(rep.item_subtype, rep.base_name ?? "") : null,
      faction: rep.item_type === "Agent" ? rep.item_subtype ?? null : null,
    });
  }

  // Sort rarest first, then skin name A→Z.
  cards.sort((a, b) => {
    const r = rarityRank(b.rarityName) - rarityRank(a.rarityName);
    if (r !== 0) return r;
    return (a.skinName ?? "").localeCompare(b.skinName ?? "");
  });
  return cards;
}

function pickRepresentative(variants: ItemOut[]): ItemOut {
  return [...variants].sort((a, b) => {
    const stA = a.is_stattrak || a.is_souvenir ? 1 : 0;
    const stB = b.is_stattrak || b.is_souvenir ? 1 : 0;
    if (stA !== stB) return stA - stB;
    return wearRank(a.wear_name) - wearRank(b.wear_name);
  })[0];
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/browse/taxonomy.ts
git commit -m "feat(browse): taxonomy constants, slug/href helpers, skin dedup"
```

---

## Task 3: Browse derivation index

**Files:**
- Create: `src/lib/browse/browse-index.ts`

- [ ] **Step 1: Write the module**

Create `src/lib/browse/browse-index.ts`:

```ts
import "server-only";

import { getCachedItemsSnapshot, type ItemsSnapshotData } from "@/lib/blob-snapshot-cache";
import type { ItemOut } from "@/lib/api/types";
import {
  type AgentGroup,
  type DetailResult,
  type GroupSummary,
  type WeaponSubtype,
  baseHref,
  dedupToCards,
  resolveBySlug,
  slugifyName,
} from "./taxonomy";

interface NamedGroup {
  name: string;
  image: string | null;
  items: ItemOut[];
}
interface BaseGroup {
  base: string;
  subtype: string;
  items: ItemOut[];
}

export interface BrowseIndex {
  timestamp: string;
  collections: Map<string, NamedGroup>; // key: collection name
  cases: Map<string, NamedGroup>; // key: crate name
  bases: Map<string, BaseGroup>; // key: base_name (guns + knives + gloves)
  agents: Map<string, NamedGroup>; // key: collection name
}

let cache: BrowseIndex | null = null;

function firstImage(value: string | null | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function buildIndex(snap: ItemsSnapshotData): BrowseIndex {
  if (cache && cache.timestamp === snap.timestamp) return cache;

  const collections = new Map<string, NamedGroup>();
  const cases = new Map<string, NamedGroup>();
  const bases = new Map<string, BaseGroup>();
  const agents = new Map<string, NamedGroup>();

  const upsertNamed = (
    map: Map<string, NamedGroup>,
    name: string,
    image: string | null,
    item: ItemOut,
  ) => {
    let g = map.get(name);
    if (!g) {
      g = { name, image, items: [] };
      map.set(name, g);
    }
    if (!g.image && image) g.image = image;
    g.items.push(item);
  };

  for (const item of snap.items) {
    if (item.item_type === "Weapon" && item.base_name) {
      let bg = bases.get(item.base_name);
      if (!bg) {
        bg = { base: item.base_name, subtype: item.item_subtype ?? "", items: [] };
        bases.set(item.base_name, bg);
      }
      bg.items.push(item);

      if (item.collection) {
        upsertNamed(collections, item.collection, firstImage(item.collection_image), item);
      }
      const crates = item.crates ?? [];
      const crateImages = item.crates_images ?? [];
      for (let i = 0; i < crates.length; i++) {
        const crate = crates[i];
        if (crate) upsertNamed(cases, crate, firstImage(crateImages[i]), item);
      }
    } else if (item.item_type === "Agent" && item.collection) {
      upsertNamed(agents, item.collection, firstImage(item.collection_image), item);
    }
  }

  cache = { timestamp: snap.timestamp, collections, cases, bases, agents };
  return cache;
}

export async function loadBrowseIndex(): Promise<BrowseIndex | null> {
  const cached = await getCachedItemsSnapshot();
  if (!cached) return null;
  return buildIndex(cached.snapshot);
}

// ── Index listings ───────────────────────────────────────────────────────────

function toSummaries(map: Map<string, NamedGroup>): GroupSummary[] {
  return [...map.values()]
    .map((g) => ({
      name: g.name,
      slug: slugifyName(g.name),
      image: g.image,
      count: dedupToCards(g.items).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listCollections(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.collections);
}

export function listCases(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.cases);
}

function listBases(ix: BrowseIndex, predicate: (subtype: string) => boolean): GroupSummary[] {
  return [...ix.bases.values()]
    .filter((b) => predicate(b.subtype))
    .map((b) => ({
      name: b.base,
      slug: slugifyName(b.base),
      image: b.items[0]?.image_url ?? null,
      count: dedupToCards(b.items).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listWeapons(ix: BrowseIndex, subtype: WeaponSubtype): GroupSummary[] {
  return listBases(ix, (s) => s === subtype);
}

export function listKnives(ix: BrowseIndex): GroupSummary[] {
  return listBases(ix, (s) => s === "Knives");
}

export function listGloves(ix: BrowseIndex): GroupSummary[] {
  return listBases(ix, (s) => s === "Gloves");
}

export function listAgentGroups(ix: BrowseIndex): AgentGroup[] {
  return [...ix.agents.values()]
    .map((g) => ({
      name: g.name,
      image: g.image,
      agents: dedupToCards(g.items, { includeWeaponHref: false }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Detail builders (return null when slug doesn't resolve) ───────────────────

function namedDetail(
  map: Map<string, NamedGroup>,
  slug: string,
  subtitle: string,
): DetailResult | null {
  const name = resolveBySlug(slug, map.keys());
  if (!name) return null;
  const g = map.get(name)!;
  const skins = dedupToCards(g.items);
  return { title: name, image: g.image, subtitle, count: skins.length, skins };
}

export function collectionDetail(ix: BrowseIndex, slug: string): DetailResult | null {
  return namedDetail(ix.collections, slug, "Collection");
}

export function caseDetail(ix: BrowseIndex, slug: string): DetailResult | null {
  return namedDetail(ix.cases, slug, "Case");
}

export function baseDetail(ix: BrowseIndex, slug: string): DetailResult | null {
  const name = resolveBySlug(slug, ix.bases.keys());
  if (!name) return null;
  const b = ix.bases.get(name)!;
  // On a weapon page the cards are already under that weapon → no up-link.
  const skins = dedupToCards(b.items, { includeWeaponHref: false });
  return {
    title: name,
    image: b.items[0]?.image_url ?? null,
    subtitle: b.subtype || null,
    count: skins.length,
    skins,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/browse/browse-index.ts
git commit -m "feat(browse): snapshot-derived index + detail builders"
```

---

## Task 4: Card + grid components

**Files:**
- Create: `src/components/browse/SkinCard.tsx`
- Create: `src/components/browse/GroupCard.tsx`
- Create: `src/components/browse/SkinGrid.tsx`
- Create: `src/components/browse/GroupGrid.tsx`

- [ ] **Step 1: SkinCard**

Create `src/components/browse/SkinCard.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import type { SkinCard as SkinCardData } from "@/lib/browse/taxonomy";

export function SkinCard({ skin }: { skin: SkinCardData }) {
  return (
    <div
      className="group relative flex flex-col border-2 border-border bg-card transition-colors hover:border-primary"
      style={skin.rarityColor ? { borderTopColor: `#${skin.rarityColor}` } : undefined}
    >
      <Link href={skin.itemHref} className="block aspect-4/3 bg-muted/30">
        {skin.image ? (
          <Image
            src={skin.image}
            alt={skin.skinName ?? skin.baseName}
            width={256}
            height={192}
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
            NO IMAGE
          </div>
        )}
      </Link>
      <div className="flex flex-col gap-0.5 p-2">
        {skin.weaponHref ? (
          <Link
            href={skin.weaponHref}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
          >
            {skin.baseName}
          </Link>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {skin.faction ?? skin.baseName}
          </span>
        )}
        <Link
          href={skin.itemHref}
          className="font-mono text-sm font-semibold text-foreground hover:text-primary"
        >
          {skin.skinName ?? skin.baseName}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: GroupCard**

Create `src/components/browse/GroupCard.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";

export function GroupCard({
  href,
  name,
  image,
  count,
}: {
  href: string;
  name: string;
  image: string | null;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col border-2 border-border bg-card transition-colors hover:border-primary"
    >
      <div className="flex aspect-4/3 items-center justify-center bg-muted/30">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={256}
            height={192}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <span className="font-mono text-xs text-muted-foreground">NO IMAGE</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary">
          {name}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {count} {count === 1 ? "skin" : "skins"}
        </span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: SkinGrid**

Create `src/components/browse/SkinGrid.tsx`:

```tsx
import type { SkinCard as SkinCardData } from "@/lib/browse/taxonomy";
import { SkinCard } from "./SkinCard";

export function SkinGrid({ skins }: { skins: SkinCardData[] }) {
  if (skins.length === 0) {
    return <p className="font-mono text-sm text-muted-foreground">No items found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {skins.map((skin) => (
        <SkinCard key={skin.itemId} skin={skin} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: GroupGrid**

Create `src/components/browse/GroupGrid.tsx`:

```tsx
import type { GroupSummary } from "@/lib/browse/taxonomy";
import { GroupCard } from "./GroupCard";

export function GroupGrid({
  groups,
  hrefBase,
}: {
  groups: GroupSummary[];
  hrefBase: string; // e.g. "/collections"
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
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/browse/
git commit -m "feat(browse): SkinCard, GroupCard, SkinGrid, GroupGrid components"
```

---

## Task 5: Collections index + detail pages

**Files:**
- Create: `src/app/(public)/collections/page.tsx`
- Create: `src/app/(public)/collections/[slug]/page.tsx`

- [ ] **Step 1: Collections index page**

Create `src/app/(public)/collections/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listCollections, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Collections — Browse Every Skin Collection",
  description: "Browse all Counter-Strike 2 weapon skin collections.",
};

export default async function CollectionsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const collections = listCollections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Collections</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">
          {collections.length} collections
        </p>
        <GroupGrid groups={collections} hrefBase="/collections" />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Collection detail page**

Create `src/app/(public)/collections/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { collectionDetail, listCollections, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listCollections(ix).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? collectionDetail(ix, slug) : null;
  if (!detail) return { title: "Collection Not Found" };
  return {
    title: `${detail.title} — CS2 Skins`,
    description: `All ${detail.count} skins in the ${detail.title}.`,
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = collectionDetail(ix, slug);
  if (!detail) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">
          {detail.subtitle} · {detail.count} skins
        </p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Smoke test**

Run: `pnpm dev` then visit `http://localhost:3000/collections` and click into a collection (e.g. The Operation Riptide Collection).
Expected: index lists collections with images and skin counts; detail page shows deduped, rarest-first skins; clicking a skin name → `/item/...`; clicking the weapon name → `/weapons/...` (will 404 until Task 7 — acceptable here).

- [ ] **Step 4: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/collections"
git commit -m "feat(browse): collections index + detail pages"
```

---

## Task 6: Cases index + detail pages

**Files:**
- Create: `src/app/(public)/cases/page.tsx`
- Create: `src/app/(public)/cases/[slug]/page.tsx`

- [ ] **Step 1: Cases index page**

Create `src/app/(public)/cases/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listCases, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Cases — Browse Every Weapon Case",
  description: "Browse all Counter-Strike 2 weapon cases and their skins.",
};

export default async function CasesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const cases = listCases(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Cases</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{cases.length} cases</p>
        <GroupGrid groups={cases} hrefBase="/cases" />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Case detail page**

Create `src/app/(public)/cases/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { caseDetail, listCases, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listCases(ix).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? caseDetail(ix, slug) : null;
  if (!detail) return { title: "Case Not Found" };
  return {
    title: `${detail.title} — CS2 Skins`,
    description: `All ${detail.count} skins in the ${detail.title}.`,
  };
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = caseDetail(ix, slug);
  if (!detail) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">
          {detail.subtitle} · {detail.count} skins
        </p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Smoke test**

Run: `pnpm dev`, visit `/cases`, click into a case (e.g. Fever Case).
Expected: index lists cases with crate images + counts; detail shows deduped skins including knives/gloves that belong to that case.

- [ ] **Step 4: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/cases"
git commit -m "feat(browse): cases index + detail pages"
```

---

## Task 7: Weapons index + detail pages

**Files:**
- Create: `src/app/(public)/weapons/page.tsx`
- Create: `src/app/(public)/weapons/[weapon]/page.tsx`

- [ ] **Step 1: Weapons index page (grouped by subtype)**

Create `src/app/(public)/weapons/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listWeapons, loadBrowseIndex } from "@/lib/browse/browse-index";
import { WEAPON_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Weapons — Browse Every Weapon Skin",
  description: "Browse all Counter-Strike 2 weapons by category and view their skins.",
};

export default async function WeaponsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Weapons</h1>
        <div className="flex flex-col gap-10">
          {WEAPON_SUBTYPES.map((subtype) => {
            const weapons = listWeapons(ix, subtype);
            if (weapons.length === 0) return null;
            return (
              <section key={subtype} id={subtype.toLowerCase()}>
                <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{subtype}</h2>
                <GroupGrid groups={weapons} hrefBase="/weapons" />
              </section>
            );
          })}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Weapon detail page**

Create `src/app/(public)/weapons/[weapon]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { baseDetail, listWeapons, loadBrowseIndex } from "@/lib/browse/browse-index";
import { WEAPON_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return WEAPON_SUBTYPES.flatMap((s) => listWeapons(ix, s)).map((w) => ({ weapon: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ weapon: string }>;
}): Promise<Metadata> {
  const { weapon } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? baseDetail(ix, weapon) : null;
  if (!detail) return { title: "Weapon Not Found" };
  return {
    title: `${detail.title} Skins — CS2`,
    description: `All ${detail.count} ${detail.title} skins in Counter-Strike 2.`,
  };
}

export default async function WeaponDetailPage({
  params,
}: {
  params: Promise<{ weapon: string }>;
}) {
  const { weapon } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = baseDetail(ix, weapon);
  // Guard: knives/gloves are served by their own routes.
  if (!detail || detail.subtitle === "Knives" || detail.subtitle === "Gloves") notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} skins</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Smoke test**

Run: `pnpm dev`, visit `/weapons`, confirm subtype sections (Pistols/Rifles/SMGs/Heavy/Equipment) with weapon cards; click AK-47 → `/weapons/ak-47` shows all AK skins; clicking a skin name → `/item/...`. Confirm the weapon-name up-link from a Task 5/6 detail card now resolves.
Expected: all pass; Knives/Gloves do NOT appear under `/weapons`.

- [ ] **Step 4: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/weapons"
git commit -m "feat(browse): weapons index + detail pages"
```

---

## Task 8: Knives index + detail pages

**Files:**
- Create: `src/app/(public)/knives/page.tsx`
- Create: `src/app/(public)/knives/[knife]/page.tsx`

- [ ] **Step 1: Knives index page**

Create `src/app/(public)/knives/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listKnives, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Knives — Browse Every Knife Skin",
  description: "Browse all Counter-Strike 2 knife types and their finishes.",
};

export default async function KnivesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const knives = listKnives(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Knives</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{knives.length} knife types</p>
        <GroupGrid groups={knives} hrefBase="/knives" />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Knife detail page**

Create `src/app/(public)/knives/[knife]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { baseDetail, listKnives, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listKnives(ix).map((k) => ({ knife: k.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ knife: string }>;
}): Promise<Metadata> {
  const { knife } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? baseDetail(ix, knife) : null;
  if (!detail) return { title: "Knife Not Found" };
  return {
    title: `${detail.title} Skins — CS2`,
    description: `All ${detail.count} ${detail.title} finishes in Counter-Strike 2.`,
  };
}

export default async function KnifeDetailPage({
  params,
}: {
  params: Promise<{ knife: string }>;
}) {
  const { knife } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = baseDetail(ix, knife);
  if (!detail || detail.subtitle !== "Knives") notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} finishes</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Smoke test**

Run: `pnpm dev`, visit `/knives`, click a knife (e.g. Karambit) → finishes listed.
Expected: only knife base types appear; detail shows deduped finishes.

- [ ] **Step 4: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/knives"
git commit -m "feat(browse): knives index + detail pages"
```

---

## Task 9: Gloves index + detail pages

**Files:**
- Create: `src/app/(public)/gloves/page.tsx`
- Create: `src/app/(public)/gloves/[glove]/page.tsx`

- [ ] **Step 1: Gloves index page**

Create `src/app/(public)/gloves/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listGloves, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Gloves — Browse Every Glove Skin",
  description: "Browse all Counter-Strike 2 glove types and their finishes.",
};

export default async function GlovesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const gloves = listGloves(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Gloves</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{gloves.length} glove types</p>
        <GroupGrid groups={gloves} hrefBase="/gloves" />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 2: Glove detail page**

Create `src/app/(public)/gloves/[glove]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { baseDetail, listGloves, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listGloves(ix).map((g) => ({ glove: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ glove: string }>;
}): Promise<Metadata> {
  const { glove } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? baseDetail(ix, glove) : null;
  if (!detail) return { title: "Glove Not Found" };
  return {
    title: `${detail.title} Skins — CS2`,
    description: `All ${detail.count} ${detail.title} finishes in Counter-Strike 2.`,
  };
}

export default async function GloveDetailPage({
  params,
}: {
  params: Promise<{ glove: string }>;
}) {
  const { glove } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = baseDetail(ix, glove);
  if (!detail || detail.subtitle !== "Gloves") notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} finishes</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
```

- [ ] **Step 3: Smoke test**

Run: `pnpm dev`, visit `/gloves`, click a glove (e.g. Sport Gloves) → finishes listed.
Expected: only glove base types appear; detail shows deduped finishes.

- [ ] **Step 4: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/gloves"
git commit -m "feat(browse): gloves index + detail pages"
```

---

## Task 10: Agents index page

**Files:**
- Create: `src/app/(public)/agents/page.tsx`

- [ ] **Step 1: Agents page (grouped by collection, faction per card)**

Create `src/app/(public)/agents/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { listAgentGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Agents — Browse Every Agent Skin",
  description: "Browse all Counter-Strike 2 agents by collection.",
};

export default async function AgentsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const groups = listAgentGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Agents</h1>
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{group.name}</h2>
              <SkinGrid skins={group.agents} />
            </section>
          ))}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
```

Note: `SkinCard` renders the faction (e.g. "Terrorist") in the top label slot because agent cards have `weaponHref = null` and `faction` set — no code change needed.

- [ ] **Step 2: Smoke test**

Run: `pnpm dev`, visit `/agents`.
Expected: agents grouped by collection (e.g. "Operation Riptide Agents"); each card shows the agent name with a faction label and links to its item page; no weapon up-link.

- [ ] **Step 3: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/agents"
git commit -m "feat(browse): agents index page"
```

---

## Task 11: Browse hub page

**Files:**
- Create: `src/app/(public)/browse/page.tsx`

- [ ] **Step 1: Hub page**

Create `src/app/(public)/browse/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/FooterSection";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Browse CS2 Items by Category",
  description: "Browse Counter-Strike 2 weapons, knives, gloves, agents, collections, and cases.",
};

const CATEGORIES = [
  { label: "Weapons", href: "/weapons", blurb: "Pistols, rifles, SMGs & more" },
  { label: "Knives", href: "/knives", blurb: "Every knife finish" },
  { label: "Gloves", href: "/gloves", blurb: "Every glove finish" },
  { label: "Agents", href: "/agents", blurb: "T & CT operators" },
  { label: "Collections", href: "/collections", blurb: "Skins grouped by collection" },
  { label: "Cases", href: "/cases", blurb: "Weapon cases & contents" },
];

export default function BrowsePage() {
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Browse</h1>
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

- [ ] **Step 2: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/browse"
git commit -m "feat(browse): browse hub page"
```

---

## Task 12: Navbar BROWSE mega-dropdown

**Files:**
- Create: `src/components/browse/BrowseMegaMenu.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Shared category data + mega-menu content**

Create `src/components/browse/BrowseMegaMenu.tsx`:

```tsx
import Link from "next/link";

export const BROWSE_HREFS = [
  "/weapons",
  "/knives",
  "/gloves",
  "/agents",
  "/collections",
  "/cases",
];

const COLUMNS: Array<{ heading: string; href: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Weapons",
    href: "/weapons",
    links: [
      { label: "Pistols", href: "/weapons#pistols" },
      { label: "Rifles", href: "/weapons#rifles" },
      { label: "SMGs", href: "/weapons#smgs" },
      { label: "Heavy", href: "/weapons#heavy" },
      { label: "Equipment", href: "/weapons#equipment" },
    ],
  },
  {
    heading: "Gear",
    href: "/knives",
    links: [
      { label: "Knives", href: "/knives" },
      { label: "Gloves", href: "/gloves" },
      { label: "Agents", href: "/agents" },
    ],
  },
  {
    heading: "Containers",
    href: "/collections",
    links: [
      { label: "Collections", href: "/collections" },
      { label: "Cases", href: "/cases" },
    ],
  },
];

export function BrowseMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-6 p-4">
      {COLUMNS.map((col) => (
        <div key={col.heading} className="flex flex-col gap-2">
          <Link
            href={col.href}
            onClick={onNavigate}
            className="font-mono text-xs font-bold uppercase tracking-widest text-primary hover:underline"
          >
            {col.heading}
          </Link>
          <div className="flex flex-col gap-1">
            {col.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onNavigate}
                className="font-mono text-xs tracking-wider text-foreground/90 hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add BROWSE to the desktop navbar**

In `src/components/Navbar.tsx`, add the import near the other imports (after the `dropdown-menu` import block at lines 24-31):

```tsx
import { BROWSE_HREFS, BrowseMegaMenu } from "@/components/browse/BrowseMegaMenu";
```

Add an `isBrowseActive` derivation next to `isToolsActive` (around line 67):

```tsx
  const isBrowseActive = BROWSE_HREFS.some((href) => pathname.startsWith(href));
```

Insert a BROWSE dropdown in the desktop nav — place it immediately **before** the `<DropdownMenu>` that renders TOOLS (before line 137 `<DropdownMenu>`):

```tsx
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`flex items-center gap-1 px-3 py-1.5 font-mono text-sm font-semibold tracking-wider transition-colors focus:outline-none ${
                isBrowseActive ? "text-primary" : "text-foreground/90 hover:text-primary"
              }`}
              aria-label="Browse menu"
            >
              BROWSE
              <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[28rem] rounded-none border-2 border-border bg-popover p-0"
            >
              <BrowseMegaMenu />
            </DropdownMenuContent>
          </DropdownMenu>
```

- [ ] **Step 3: Add BROWSE to the mobile menu**

In the mobile block, immediately **before** the Tools `<div className="mt-2 border-t border-border pt-3">` (around line 292), insert:

```tsx
            <div className="mt-2 border-t border-border pt-3">
              <div className="px-3 pb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground/70">
                Browse
              </div>
              <BrowseMegaMenu onNavigate={() => setMobileOpen(false)} />
            </div>
```

- [ ] **Step 4: Smoke test**

Run: `pnpm dev`. On desktop, hover/click BROWSE → mega-menu with Weapons/Gear/Containers columns; every link navigates correctly. On mobile width, open the hamburger → Browse section appears and links close the menu on tap.
Expected: all navigation works; BROWSE highlights when on any browse route.

- [ ] **Step 5: Type-check & lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/browse/BrowseMegaMenu.tsx src/components/Navbar.tsx
git commit -m "feat(browse): BROWSE navbar mega-dropdown (desktop + mobile)"
```

---

## Task 13: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `pnpm build`
Expected: build succeeds; the new routes appear in the route manifest; `generateStaticParams` prerenders collections/cases/weapons/knives/gloves detail pages without error.

- [ ] **Step 2: Lint the whole project**

Run: `pnpm lint`
Expected: PASS, no warnings introduced by new files.

- [ ] **Step 3: Final manual pass**

Run: `pnpm start` (or `pnpm dev`) and walk the full flow described in the spec's Testing section:
`/browse` → `/collections` → a collection → click a weapon name (up) → `/weapons/[base]` → click a skin name (down) → `/item/...`. Repeat via `/cases`, `/knives`, `/gloves`, `/agents`.
Expected: every hop resolves; images present; agent cards have no up-link; unknown slug (e.g. `/collections/not-real`) → 404.

- [ ] **Step 4: Commit (if any lint/build fixups were needed)**

```bash
git add -A
git commit -m "chore(browse): build/lint fixups"
```

---

## Self-Review Notes

- **Spec coverage:** routes (Tasks 5-11), two-link card (Task 4 `SkinCard` + `dedupToCards` in Task 2), derivation lib (Tasks 2-3), mega-dropdown (Task 12), `ItemOut` extension (Task 1), caching/`revalidate`/`generateStaticParams` (every page task), catalog-only/no-prices (no market snapshot imported anywhere). All covered.
- **Knives/Gloves exclusion from `/weapons`:** enforced two ways — `listWeapons` filters by `WEAPON_SUBTYPES` (which excludes Knives/Gloves), and the weapon detail page guards `subtitle === "Knives"|"Gloves" → notFound()`.
- **Type consistency:** `SkinCard`/`GroupSummary`/`DetailResult`/`AgentGroup` defined once in `taxonomy.ts` and imported everywhere; `loadBrowseIndex`/`list*`/`*Detail` signatures match their call sites in the pages.
- **No prices:** confirmed — only `getCachedItemsSnapshot` is used; no market/bids/prices snapshot import.
