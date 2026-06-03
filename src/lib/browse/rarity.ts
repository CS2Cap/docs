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
