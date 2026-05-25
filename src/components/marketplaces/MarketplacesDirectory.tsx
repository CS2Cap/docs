"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ProviderInfo } from "@/lib/api";
import { MarketplaceCard } from "./MarketplaceCard";
import { normalizeMarketType, MARKET_TYPE_FILTERS } from "./marketplaces-utils";

interface Props {
  providers: ProviderInfo[];
}

export function MarketplacesDirectory({ providers }: Props) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    let list = [...providers];

    if (activeFilter !== "ALL") {
      list = list.filter(
        (p) => normalizeMarketType(p.market_type) === activeFilter,
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.code ?? "").toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) =>
      (a.name ?? a.code ?? "").localeCompare(b.name ?? b.code ?? ""),
    );
  }, [providers, search, activeFilter]);

  return (
    <TooltipProvider delayDuration={100}>
      <section className="py-12 md:py-16">
        <div className="container">
          {/* Search and filters */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search marketplaces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {MARKET_TYPE_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`border px-3 py-1.5 font-mono text-[10px] tracking-wider transition-colors ${
                    activeFilter === filter
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((provider) => (
                <MarketplaceCard
                  key={provider.code ?? provider.key}
                  provider={provider}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                No marketplaces match your filters.
              </p>
            </div>
          )}
        </div>
      </section>
    </TooltipProvider>
  );
}
