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
