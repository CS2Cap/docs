"use client";

import { useMemo, useState } from "react";
import type { SkinCard } from "@/lib/browse/taxonomy";
import { rarityRank } from "@/lib/browse/rarity";

export interface BrowseFacets {
  rarities: { name: string; color: string | null }[];
}

export interface BrowseFilters {
  rarities: Set<string>;
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
  query: "",
};

export function useBrowseFilter(skins: SkinCard[]): BrowseFilterState {
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);

  const facets = useMemo<BrowseFacets>(() => {
    const rarityColors = new Map<string, string | null>();
    for (const s of skins) {
      if (s.rarityName && !rarityColors.has(s.rarityName)) rarityColors.set(s.rarityName, s.rarityColor);
    }
    const rarities = [...rarityColors.entries()]
      .map(([name, color]) => ({ name, color }))
      .sort((a, b) => rarityRank(b.name) - rarityRank(a.name));
    return { rarities: rarities.length >= 2 ? rarities : [] };
  }, [skins]);

  const matches = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return (s: SkinCard): boolean => {
      if (filters.rarities.size > 0 && (!s.rarityName || !filters.rarities.has(s.rarityName))) return false;
      if (q && !`${s.skinName ?? ""} ${s.baseName}`.toLowerCase().includes(q)) return false;
      return true;
    };
  }, [filters]);

  const filtered = useMemo(() => skins.filter(matches), [skins, matches]);

  const active = filters.rarities.size > 0 || filters.query.trim() !== "";

  return { facets, filters, setFilters, filtered, matches, total: skins.length, active };
}
