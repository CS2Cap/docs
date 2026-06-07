"use client";

import { useMemo, useState } from "react";
import type { SkinCard } from "@/lib/browse/taxonomy";
import { rarityRank } from "@/lib/browse/rarity";

export interface BrowseFacets {
  rarities: { name: string; color: string | null }[];
  subtypes: string[];
}

export interface BrowseFilters {
  rarities: Set<string>;
  subtypes: Set<string>;
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
  subtypes: new Set(),
  query: "",
};

// Order present subtype values by a canonical order; unknown values sorted last.
export function orderSubtypes(present: Set<string>, order?: readonly string[]): string[] {
  if (!order) return [...present].sort();
  const inOrder = order.filter((s) => present.has(s));
  const extras = [...present].filter((s) => !order.includes(s)).sort();
  return [...inOrder, ...extras];
}

export function useBrowseFilter(
  skins: SkinCard[],
  subtypeOrder?: readonly string[],
): BrowseFilterState {
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);

  const facets = useMemo<BrowseFacets>(() => {
    const rarityColors = new Map<string, string | null>();
    const subtypeSet = new Set<string>();
    for (const s of skins) {
      if (s.rarityName && !rarityColors.has(s.rarityName)) rarityColors.set(s.rarityName, s.rarityColor);
      if (s.subtype) subtypeSet.add(s.subtype);
    }
    const rarities = [...rarityColors.entries()]
      .map(([name, color]) => ({ name, color }))
      .sort((a, b) => rarityRank(b.name) - rarityRank(a.name));
    const subtypes = orderSubtypes(subtypeSet, subtypeOrder);
    return {
      rarities: rarities.length >= 2 ? rarities : [],
      subtypes: subtypes.length >= 2 ? subtypes : [],
    };
  }, [skins, subtypeOrder]);

  const matches = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return (s: SkinCard): boolean => {
      if (filters.rarities.size > 0 && (!s.rarityName || !filters.rarities.has(s.rarityName))) return false;
      if (filters.subtypes.size > 0 && (!s.subtype || !filters.subtypes.has(s.subtype))) return false;
      if (q && !`${s.skinName ?? ""} ${s.baseName}`.toLowerCase().includes(q)) return false;
      return true;
    };
  }, [filters]);

  const filtered = useMemo(() => skins.filter(matches), [skins, matches]);

  const active = filters.rarities.size > 0 || filters.subtypes.size > 0 || filters.query.trim() !== "";

  return { facets, filters, setFilters, filtered, matches, total: skins.length, active };
}
