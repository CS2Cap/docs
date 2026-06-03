import "server-only";

import type { ItemOut } from "@/lib/api/types";
import { buildItemPath, slugifyMarketHashName } from "@/lib/seo/itemSlug";
import { rarityRank, wearRank, groupByRarity, isSpecialCard } from "./rarity";

export { rarityRank, groupByRarity, isSpecialCard };
export type { RarityGroup } from "./rarity";

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
  topLabel: string | null; // small label above the title
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
      topLabel:
        rep.item_type === "Agent"
          ? rep.item_subtype ?? null // faction (CT/T) — unchanged for agents
          : rep.skin_name == null
            ? rep.item_subtype ?? null // collectibles/keys: subtype, not the name
            : rep.base_name ?? null,
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
