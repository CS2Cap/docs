"use client";

import type { SkinCard } from "@/lib/browse/taxonomy";
import { SkinGrid } from "./SkinGrid";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useBrowseFilter } from "./useBrowseFilter";

export function FilterableSkinGrid({ skins }: { skins: SkinCard[] }) {
  const { facets, filters, setFilters, filtered, total, active } = useBrowseFilter(skins);
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
      {filtered.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground">No items match these filters.</p>
      ) : (
        <SkinGrid skins={filtered} />
      )}
    </>
  );
}
