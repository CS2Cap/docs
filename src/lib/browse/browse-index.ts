import "server-only";

import { getCachedItemsSnapshot, type ItemsSnapshotData } from "@/lib/blob-snapshot-cache";
import type { ItemOut } from "@/lib/api/types";
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
import type { BrowseNavData, BrowseNavItem } from "./nav-types";

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
  crateSubtypes: Map<string, string>; // key: crate market_hash_name → item_subtype
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

let cache: BrowseIndex | null = null;

function firstImage(value: string | null | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

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

function buildIndex(snap: ItemsSnapshotData): BrowseIndex {
  if (cache && cache.timestamp === snap.timestamp) return cache;

  const collections = new Map<string, NamedGroup>();
  const cases = new Map<string, NamedGroup>();
  const bases = new Map<string, BaseGroup>();
  const agents = new Map<string, NamedGroup>();
  const stickers = new Map<string, NamedGroup>();
  const slabs = new Map<string, NamedGroup>();
  const charms = new Map<string, NamedGroup>();
  const graffiti = new Map<string, NamedGroup>();
  const musicKits: ItemOut[] = [];
  const patches: ItemOut[] = [];
  const collectibles: ItemOut[] = [];
  const crateSubtypes = new Map<string, string>();

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
    // Crates and collections are cross-cutting: stickers, patches, charms,
    // agents, etc. all belong to cases/capsules (crates) and named collections,
    // not just weapons. Index them for every item so /cases/<slug> and
    // /collections/<slug> resolve for all item types.
    if (item.collection) {
      upsertNamed(collections, item.collection, firstImage(item.collection_image), item);
    }
    const crates = item.crates ?? [];
    const crateImages = item.crates_images ?? [];
    for (let i = 0; i < crates.length; i++) {
      const crate = crates[i];
      if (crate) upsertNamed(cases, crate, firstImage(crateImages[i]), item);
    }

    if (item.item_type === "Weapon" && item.base_name) {
      let bg = bases.get(item.base_name);
      if (!bg) {
        bg = { base: item.base_name, subtype: item.item_subtype ?? "", items: [] };
        bases.set(item.base_name, bg);
      }
      bg.items.push(item);
    } else if (item.item_type === "Agent" && item.collection) {
      upsertNamed(agents, item.collection, firstImage(item.collection_image), item);
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
    } else if (item.item_type === "Crate") {
      if (item.market_hash_name && item.item_subtype) {
        crateSubtypes.set(item.market_hash_name, item.item_subtype);
      }
    }
  }

  cache = {
    timestamp: snap.timestamp,
    collections,
    cases,
    crateSubtypes,
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
}

export async function loadBrowseIndex(): Promise<BrowseIndex | null> {
  const cached = await getCachedItemsSnapshot();
  if (!cached) return null;
  return buildIndex(cached.snapshot);
}

// ── Index listings ───────────────────────────────────────────────────────────

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

export function listCollections(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.collections);
}

export function listCases(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.cases, (g) => {
    const st = ix.crateSubtypes.get(g.name);
    return st ? [st] : [];
  });
}

function listBases(ix: BrowseIndex, predicate: (subtype: string) => boolean): GroupSummary[] {
  return [...ix.bases.values()]
    .filter((b) => predicate(b.subtype))
    .map((b) => ({
      name: b.base,
      slug: slugifyName(b.base),
      image: b.items[0]?.image_url ?? null,
      count: dedupToCards(b.items).length,
      subtypes: b.subtype ? [b.subtype] : [],
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

// ── New category groupings (reuse toSummaries/namedDetail generics) ───────────

export function listStickerGroups(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.stickers, (g) => distinctSubtypes(g.items));
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

export function listGraffitiGroups(ix: BrowseIndex): GroupSummary[] {
  return toSummaries(ix.graffiti);
}
export function graffitiGroupDetail(ix: BrowseIndex, slug: string): DetailResult | null {
  return namedDetail(ix.graffiti, slug, "Graffiti");
}

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

// ── Browse-nav payload (mega-menu) ────────────────────────────────────────────

const NAV_CAP = 16;

function toNavItems(groups: GroupSummary[], base: string): BrowseNavItem[] {
  return groups.slice(0, NAV_CAP).map((g) => ({
    name: g.name,
    href: `${base}/${g.slug}`,
    image: g.image,
  }));
}

function flatNavItems(cards: SkinCard[], href: string): BrowseNavItem[] {
  return cards.slice(0, NAV_CAP).map((c) => ({
    name: c.skinName ?? c.baseName,
    href,
    image: c.image,
  }));
}

let navCache: { timestamp: string; data: BrowseNavData } | null = null;

// Compact catalog slice for the BROWSE mega-menu. Each list capped at NAV_CAP;
// the full set lives behind the menu's "View all" links. Memoized by snapshot
// timestamp so warm instances skip the full per-group dedup/sort on repeat calls.
export function buildBrowseNav(ix: BrowseIndex): BrowseNavData {
  if (navCache && navCache.timestamp === ix.timestamp) return navCache.data;
  const weapons = {} as Record<WeaponSubtype, BrowseNavItem[]>;
  for (const subtype of WEAPON_SUBTYPES) {
    weapons[subtype] = toNavItems(listWeapons(ix, subtype), "/weapons");
  }
  const data: BrowseNavData = {
    weapons,
    knives: toNavItems(listKnives(ix), "/knives"),
    gloves: toNavItems(listGloves(ix), "/gloves"),
    agents: listAgentGroups(ix)
      .slice(0, NAV_CAP)
      .map((g) => ({ name: g.name, href: "/agents", image: g.image })),
    cases: toNavItems(listCases(ix), "/cases"),
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
  };
  navCache = { timestamp: ix.timestamp, data };
  return data;
}
