import { formatItemDisplay, parseWearTier, type ItemNameTag, type WearTier } from "@/lib/item-display";

export interface InventoryItemMeta {
  /** Clean display name with wear/StatTrak/Souvenir/★ stripped. */
  displayName: string;
  /** Leading ★ for knives/gloves. */
  star: boolean;
  /** "ST" | "SV" | null badge prefix. */
  prefix: string | null;
  /** StatTrak / Souvenir tag for coloring. */
  tag: ItemNameTag;
  /** Parsed wear tier, or null for wear-less items (cases, agents…). */
  wear: WearTier | null;
}

/** Derives display metadata for an inventory item purely from its market hash name. */
export function inventoryItemMeta(marketHashName: string): InventoryItemMeta {
  const { star, prefix, name, tag } = formatItemDisplay(marketHashName);
  return {
    displayName: name,
    star,
    prefix,
    tag,
    wear: parseWearTier(marketHashName),
  };
}
