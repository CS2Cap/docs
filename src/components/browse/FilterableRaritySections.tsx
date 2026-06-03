"use client";

import { useMemo } from "react";
import type { SkinCard } from "@/lib/browse/taxonomy";
import { groupByRarity } from "@/lib/browse/rarity";
import { RaritySections } from "./RaritySections";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useBrowseFilter } from "./useBrowseFilter";

export function FilterableRaritySections({
  skins,
  specials,
}: {
  skins: SkinCard[];
  specials: SkinCard[];
}) {
  const all = useMemo(() => [...skins, ...specials], [skins, specials]);
  const { facets, filters, setFilters, filtered, total, active, matches } = useBrowseFilter(all);
  const filteredSkins = useMemo(() => skins.filter(matches), [skins, matches]);
  const filteredSpecials = useMemo(() => specials.filter(matches), [specials, matches]);
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
        <div className="flex flex-col gap-10">
          <RaritySections groups={groupByRarity(filteredSkins)} />
          {filteredSpecials.length > 0 && (
            <section>
              <h2 className="mb-4 font-mono text-lg font-bold">Knives &amp; Gloves</h2>
              <RaritySections groups={groupByRarity(filteredSpecials)} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
