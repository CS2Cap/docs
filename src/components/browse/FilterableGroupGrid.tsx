"use client";

import type { GroupSummary } from "@/lib/browse/taxonomy";
import { GroupGrid } from "./GroupGrid";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useGroupFilter } from "./useGroupFilter";

export function FilterableGroupGrid({
  groups,
  hrefBase,
  noun,
  subtypeOrder,
}: {
  groups: GroupSummary[];
  hrefBase: string;
  noun?: string;
  subtypeOrder?: readonly string[];
}) {
  const { facets, filters, setFilters, filtered, total, active } = useGroupFilter(
    groups,
    subtypeOrder,
  );
  return (
    <>
      <BrowseFilterBar
        facets={facets}
        filters={filters}
        setFilters={setFilters}
        shown={filtered.length}
        total={total}
        active={active}
      />
      <GroupGrid groups={filtered} hrefBase={hrefBase} noun={noun} />
    </>
  );
}
