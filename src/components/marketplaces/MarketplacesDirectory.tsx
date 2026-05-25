"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ProviderInfo } from "@/lib/api";
import { MarketplaceCard } from "./MarketplaceCard";
import {
  MARKET_TYPE_FILTERS,
  normalizeMarketType,
  type MarketTypeKey,
} from "./marketplaces-utils";

type FilterKey = "ALL" | MarketTypeKey;

export function MarketplacesDirectory({ providers }: { providers: ProviderInfo[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const sorted = useMemo(
    () =>
      [...providers].sort((a, b) =>
        (a.name ?? a.key).localeCompare(b.name ?? b.key, undefined, { sensitivity: "base" }),
      ),
    [providers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((p) => {
      if (filter !== "ALL" && normalizeMarketType(p.market_type) !== filter) return false;
      if (!q) return true;
      const haystack = `${p.name ?? ""} ${p.code ?? ""} ${p.key}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sorted, query, filter]);

  return (
    <>
      <section className="border-t-2 border-border">
        <div className="container py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name (e.g. Buff, CSFloat, Skinport)…"
                className="w-full border border-border bg-card py-2.5 pl-9 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                aria-label="Filter marketplaces by name"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MARKET_TYPE_FILTERS.map((opt) => {
                const active = filter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className={`h-9 border px-3 font-mono text-[10px] tracking-widest transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t-2 border-border py-10 md:py-14">
        <div className="container">
          <div className="mb-6 flex items-end justify-between">
            <div className="font-mono text-xs tracking-widest text-primary">
              // {filter === "ALL" ? "ALL VENUES" : `${filter} VENUES`} · A-Z
            </div>
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
              {filtered.length} / {providers.length} VENUES
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="border border-border bg-card p-10 text-center font-mono text-xs text-muted-foreground">
              No marketplaces match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <MarketplaceCard key={p.key} provider={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
