"use client";

import type { BrowseFacets, BrowseFilters } from "./useBrowseFilter";
import { EMPTY_FILTERS } from "./useBrowseFilter";

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function chipClass(selected: boolean): string {
  return `border-2 px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
    selected
      ? "border-primary text-primary"
      : "border-border text-foreground/80 hover:border-primary/60"
  }`;
}

export function BrowseFilterBar({
  facets,
  filters,
  setFilters,
  shown,
  total,
  active,
}: {
  facets: BrowseFacets;
  filters: BrowseFilters;
  setFilters: (next: BrowseFilters) => void;
  shown: number;
  total: number;
  active: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-2 border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          placeholder="Filter by name..."
          className="h-8 w-48 border border-border bg-muted/50 px-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <span className="font-mono text-[11px] text-muted-foreground">
          {shown} of {total}
        </span>
        {active && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="ml-auto font-mono text-[11px] uppercase tracking-wider text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {facets.rarities.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Rarity
          </span>
          {facets.rarities.map((r) => {
            const selected = filters.rarities.has(r.name);
            return (
              <button
                key={r.name}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilters({ ...filters, rarities: toggle(filters.rarities, r.name) })}
                className={chipClass(selected)}
                style={
                  selected && r.color
                    ? { borderColor: `#${r.color}`, color: `#${r.color}` }
                    : r.color
                      ? { borderLeftColor: `#${r.color}` }
                      : undefined
                }
              >
                {r.name}
              </button>
            );
          })}
        </div>
      )}
      {facets.subtypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            Type
          </span>
          {facets.subtypes.map((s) => {
            const selected = filters.subtypes.has(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilters({ ...filters, subtypes: toggle(filters.subtypes, s) })}
                className={chipClass(selected)}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
