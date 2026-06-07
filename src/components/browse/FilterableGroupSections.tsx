"use client";

import { useMemo } from "react";
import type { GroupSummary } from "@/lib/browse/taxonomy";
import { GroupGrid } from "./GroupGrid";
import { BrowseFilterBar } from "./BrowseFilterBar";
import { useGroupFilter } from "./useGroupFilter";

export function FilterableGroupSections({
  sections,
  hrefBase,
  subtypeOrder,
}: {
  sections: { subtype: string; groups: GroupSummary[] }[];
  hrefBase: string;
  subtypeOrder?: readonly string[];
}) {
  const all = useMemo(() => sections.flatMap((s) => s.groups), [sections]);
  const { facets, filters, setFilters, filtered, total, active, matches } = useGroupFilter(
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
            const groups = section.groups.filter(matches);
            if (groups.length === 0) return null;
            return (
              <section
                key={section.subtype}
                id={section.subtype.toLowerCase()}
                className="scroll-mt-20"
              >
                <h2 className="mb-3 font-mono text-lg font-semibold text-primary">
                  {section.subtype}
                </h2>
                <GroupGrid groups={groups} hrefBase={hrefBase} />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
