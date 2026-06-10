"use client";

import { useMemo } from "react";
import type { SkinCard } from "@/lib/browse/taxonomy";
import { SkinGrid } from "./SkinGrid";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useBrowseFilter } from "./useBrowseFilter";

export function FilterableSubtypeSections({
  sections,
  subtypeOrder,
}: {
  sections: { title: string; skins: SkinCard[] }[];
  subtypeOrder?: readonly string[];
}) {
  const all = useMemo(() => sections.flatMap((s) => s.skins), [sections]);
  const { facets, filters, setFilters, filtered, total, active, matches } = useBrowseFilter(
    all,
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
      {filtered.length === 0 ? (
        <p className="font-mono text-sm text-muted-foreground">No items match these filters.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map((section) => {
            const skins = section.skins.filter(matches);
            if (skins.length === 0) return null;
            return (
              <section key={section.title}>
                <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{section.title}</h2>
                <SkinGrid skins={skins} />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
