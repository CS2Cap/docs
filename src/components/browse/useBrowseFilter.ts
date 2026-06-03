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
