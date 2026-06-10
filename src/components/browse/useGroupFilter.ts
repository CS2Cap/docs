"use client";

import { useMemo, useState } from "react";
import type { GroupSummary } from "@/lib/browse/taxonomy";
import { EMPTY_FILTERS, orderSubtypes } from "./useBrowseFilter";
import type { BrowseFacets, BrowseFilters } from "./useBrowseFilter";

export interface GroupFilterState {
  facets: BrowseFacets;
  filters: BrowseFilters;
  setFilters: (next: BrowseFilters) => void;
  filtered: GroupSummary[];
  matches: (g: GroupSummary) => boolean;
  total: number;
  active: boolean;
}

// Group-card filter for index pages. Only the subtype facet applies (group
// cards span many rarities), so `facets.rarities` is always empty.
export function useGroupFilter(
  groups: GroupSummary[],
  subtypeOrder?: readonly string[],
): GroupFilterState {
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);

  const facets = useMemo<BrowseFacets>(() => {
    const subtypeSet = new Set<string>();
    for (const g of groups) for (const s of g.subtypes) subtypeSet.add(s);
    const subtypes = orderSubtypes(subtypeSet, subtypeOrder);
    return { rarities: [], subtypes: subtypes.length >= 2 ? subtypes : [] };
  }, [groups, subtypeOrder]);

  const matches = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return (g: GroupSummary): boolean => {
      if (filters.subtypes.size > 0 && !g.subtypes.some((s) => filters.subtypes.has(s))) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    };
  }, [filters]);

  const filtered = useMemo(() => groups.filter(matches), [groups, matches]);

  const active = filters.subtypes.size > 0 || filters.query.trim() !== "";

  return { facets, filters, setFilters, filtered, matches, total: groups.length, active };
}
