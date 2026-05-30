"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import posthog from "posthog-js";
import { webApi } from "@/lib/api";
import { APIError } from "@/lib/api/shared";
import { steamIconUrl } from "@/lib/utils";
import type { InventoryValueToolResponse, ProviderInfo } from "@/lib/api/types";
import { InventoryStatsStrip } from "@/components/inventory/InventoryStatsStrip";
import { InventoryItemsTable } from "@/components/inventory/InventoryItemsTable";

const EXAMPLES = [
  "76561198153039097",
  "steamcommunity.com/id/anomaly",
  "anomaly",
];

function formatUsd(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function InventoryValueTool() {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InventoryValueToolResponse | null>(null);
  const [submittedTarget, setSubmittedTarget] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  useEffect(() => {
    let cancelled = false;

    webApi.getProviders()
      .then((data) => {
        if (!cancelled) setProviders(data);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function runLookup(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await webApi.valueSteamInventory({ steam_id: trimmed });
      setResult(data);
      setSubmittedTarget(trimmed);
      posthog.capture("inventory_valued", {
        total_value_cents: data.stats.total_value,
        currency: data.stats.currency,
        items_priced: data.stats.items_priced,
        items_unpriced: data.stats.items_unpriced,
        providers_queried: data.stats.providers_queried_count,
        cache_hit: data.meta.cache_hit,
      });
    } catch (err) {
      setResult(null);
      if (err instanceof APIError) {
        setError(typeof err.detail === "string" ? err.detail : "Something went wrong.");
      } else {
        setError("Couldn't reach the valuation service. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runLookup(input);
  }

  function handleExample(example: string) {
    setInput(example);
    void runLookup(example);
  }

  const showResults = !submitting && !error && result !== null;
  const isEmpty = showResults && result.items.length === 0 && result.unmatched_items.length === 0;

  return (
    <div className="container py-16 md:py-24">
      {/* Hero / search */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 border border-primary/30 px-3 py-1 font-mono text-xs tracking-widest text-primary">
          <span className="h-1.5 w-1.5 bg-primary animate-pulse-glow" />
          LIVE STEAM LOOKUP
        </div>
        <h1 className="display-heading text-4xl font-black tracking-tighter md:text-6xl">
          CS2 INVENTORY <span className="text-gradient-brand">VALUE</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
          Paste any Steam profile URL, SteamID64, or vanity name and price the
          inventory at the lowest current ask across40+ marketplaces. Live data,
          never stored.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Steam profile URL, SteamID64, or vanity name…"
                className="h-12 w-full border-2 border-border bg-card pl-10 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                spellCheck={false}
                autoComplete="off"
                maxLength={256}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || input.trim().length === 0}
              className="inline-flex h-12 items-center justify-center gap-2 border-2 border-primary bg-primary px-6 font-mono text-sm font-bold tracking-widest text-primary-foreground brutalist-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  VALUING…
                </>
              ) : (
                "VALUE INVENTORY"
              )}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>Examples:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => handleExample(ex)}
                disabled={submitting}
                className="text-foreground underline-offset-2 hover:text-primary hover:underline disabled:opacity-60"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Status / results */}
      {error ? (
        <div className="mx-auto mt-10 max-w-3xl border-2 border-destructive/40 bg-destructive/10 p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-destructive">
            Lookup failed
          </div>
          <p className="mt-2 font-mono text-sm text-foreground">{error}</p>
        </div>
      ) : null}

      {submitting && !result ? (
        <div className="mx-auto mt-12 flex max-w-3xl items-center justify-center gap-3 font-mono text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Fetching live inventory and pricing…
        </div>
      ) : null}

      {showResults && result ? (
        <div className="mt-12 space-y-8">
          {submittedTarget ? (
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Results for{" "}
              <span className="text-foreground normal-case tracking-normal">
                {submittedTarget}
              </span>
              {result.meta.cache_hit ? (
                <span className="ml-2 border border-border px-1.5 py-0.5 text-xs tracking-widest text-muted-foreground">
                  CACHED
                </span>
              ) : null}
            </div>
          ) : null}

          <InventoryStatsStrip
            stats={[
              {
                label: "TOTAL VALUE",
                value: formatUsd(result.stats.total_value, result.stats.currency),
                hint: `${formatCount(result.stats.units_total)} units`,
              },
              {
                label: "ITEMS PRICED",
                value: formatCount(result.stats.items_priced),
                hint: `${formatCount(result.meta.resolved_distinct_item_count)} distinct items`,
              },
              {
                label: "ITEMS UNPRICED",
                value: formatCount(result.stats.items_unpriced),
                hint:
                  result.unmatched_items.length > 0
                    ? `${formatCount(result.unmatched_items.length)} unmatched`
                    : "all matched",
              },
              {
                label: "PROVIDERS QUERIED",
                value: formatCount(result.stats.providers_queried_count),
                hint: "live market data",
              },
            ]}
          />

          {isEmpty ? (
            <div className="border-2 border-border bg-card p-8 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                No CS2 items found in this inventory.
              </p>
            </div>
          ) : (
            <>
              <InventoryItemsTable items={result.items} providers={providers} />

              {result.unmatched_items.length > 0 ? (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="group flex w-full items-center justify-between border-2 border-border bg-card px-4 py-3 text-left font-mono text-xs tracking-widest text-muted-foreground hover:bg-secondary/40"
                    >
                      <span>
                        UNMATCHED ITEMS ·{" "}
                        <span className="text-foreground">
                          {formatCount(result.unmatched_items.length)}
                        </span>
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="divide-y-2 divide-border border-x-2 border-b-2 border-border bg-card">
                      {result.unmatched_items.map((u, i) => (
                        <li
                          key={`${u.assetid}-${i}`}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          {(() => {
                            const src = steamIconUrl(u.icon_url);
                            if (!src) {
                              return <div className="h-9 w-9 border border-border bg-secondary" />;
                            }
                            return (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={src}
                                alt=""
                                width={36}
                                height={36}
                                loading="lazy"
                                className="h-9 w-9 border border-border bg-secondary object-contain"
                              />
                            );
                          })()}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-mono text-xs text-foreground">
                              {u.market_hash_name}
                              {u.phase ? (
                                <span className="ml-2 text-xs text-primary">
                                  ({u.phase})
                                </span>
                              ) : null}
                            </div>
                            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                              {unmatchedReasonLabel(u.reason)} · qty {u.quantity}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function unmatchedReasonLabel(reason: string): string {
  switch (reason) {
    case "valuation_missing":
      return "No live price returned";
    case "no_catalog_match":
    default:
      return "Not in CS2 catalog";
  }
}
