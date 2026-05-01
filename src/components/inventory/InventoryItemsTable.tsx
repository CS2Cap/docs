"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import type { InventoryValueResolvedItem } from "@/lib/api/types";
import { steamIconUrl } from "@/lib/utils";

type SortKey = "value" | "ask" | "qty" | "name";
type SortDir = "asc" | "desc";

function formatUsd(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(minor / 100);
}

function topProviderLabel(item: InventoryValueResolvedItem): string {
  if (!item.providers || item.providers.length === 0) return "—";
  // Pick the provider whose ask matches the best ask (the "winning" quote).
  // Falls back to the cheapest provider if no exact match (e.g. rounding).
  if (item.best_ask !== null) {
    const exact = item.providers.find((p) => p.lowest_ask === item.best_ask);
    if (exact) return exact.provider;
  }
  const cheapest = item.providers.reduce(
    (min, p) => (min === null || p.lowest_ask < min.lowest_ask ? p : min),
    null as InventoryValueResolvedItem["providers"][number] | null,
  );
  return (cheapest ?? item.providers[0]).provider;
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right" | "center";
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const alignClass =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 ${alignClass} font-mono text-[10px] uppercase tracking-widest transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <Icon className="h-3 w-3" strokeWidth={2} />
    </button>
  );
}

export function InventoryItemsTable({
  items,
}: {
  items: InventoryValueResolvedItem[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function setSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...items];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case "value":
          return ((a.item_value ?? 0) - (b.item_value ?? 0)) * dir;
        case "ask":
          return ((a.best_ask ?? -1) - (b.best_ask ?? -1)) * dir;
        case "qty":
          return (a.quantity - b.quantity) * dir;
        case "name":
          return a.market_hash_name.localeCompare(b.market_hash_name) * dir;
      }
    });
    return copy;
  }, [items, sortKey, sortDir]);

  if (items.length === 0) {
    return (
      <div className="border-2 border-border bg-card p-8 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          No CS2 items could be resolved against the catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[64px_minmax(0,1fr)_80px_120px_140px_120px_40px] gap-3 border-b-2 border-border bg-secondary/30 px-4 py-3">
        <div />
        <SortHeader
          label="Item"
          active={sortKey === "name"}
          dir={sortDir}
          onClick={() => setSort("name")}
        />
        <SortHeader
          label="Qty"
          active={sortKey === "qty"}
          dir={sortDir}
          onClick={() => setSort("qty")}
          align="right"
        />
        <SortHeader
          label="Best ask"
          active={sortKey === "ask"}
          dir={sortDir}
          onClick={() => setSort("ask")}
          align="right"
        />
        <SortHeader
          label="Line value"
          active={sortKey === "value"}
          dir={sortDir}
          onClick={() => setSort("value")}
          align="right"
        />
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Provider
        </div>
        <div />
      </div>

      <ul className="divide-y-2 divide-border">
        {sorted.map((item) => {
          const href = `/item/${item.item_id}`;
          const provider = topProviderLabel(item);
          return (
            <li
              key={`${item.item_id}-${item.phase ?? ""}`}
              className="grid grid-cols-[56px_minmax(0,1fr)_auto] md:grid-cols-[64px_minmax(0,1fr)_80px_120px_140px_120px_40px] items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40"
            >
              <Link href={href} className="block">
                {(() => {
                  const src = steamIconUrl(item.icon_url);
                  if (!src) {
                    return <div className="h-12 w-12 border border-border bg-secondary" />;
                  }
                  return (
                    // Steam CDN; plain <img> avoids next.config remotePatterns changes.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      className="h-12 w-12 border border-border bg-secondary object-contain"
                    />
                  );
                })()}
              </Link>

              <div className="min-w-0">
                <Link
                  href={href}
                  className="block truncate font-mono text-xs font-semibold text-foreground hover:text-primary"
                  title={item.market_hash_name}
                >
                  {item.market_hash_name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {item.phase ? (
                    <span className="border border-primary/30 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-primary">
                      {item.phase.toUpperCase()}
                    </span>
                  ) : null}
                  {!item.tradable ? (
                    <span className="border border-muted-foreground/30 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground">
                      UNTRADABLE
                    </span>
                  ) : null}
                  {item.best_ask === null ? (
                    <span className="border border-muted-foreground/30 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground">
                      NO PRICE
                    </span>
                  ) : null}
                  <span className="md:hidden font-mono text-[10px] text-muted-foreground">
                    × {item.quantity}
                  </span>
                </div>
                <div className="mt-1 md:hidden font-mono text-[11px] text-muted-foreground">
                  {formatUsd(item.best_ask)} × {item.quantity} ={" "}
                  <span className="text-foreground">{formatUsd(item.item_value)}</span>
                </div>
              </div>

              <div className="hidden md:block text-right font-mono text-xs text-foreground">
                {item.quantity}
              </div>
              <div className="hidden md:block text-right font-mono text-xs text-foreground">
                {formatUsd(item.best_ask)}
              </div>
              <div className="hidden md:block text-right font-mono text-xs font-bold text-primary">
                {formatUsd(item.item_value)}
              </div>
              <div className="hidden md:block truncate font-mono text-[11px] text-muted-foreground">
                {provider}
              </div>

              <Link
                href={href}
                aria-label={`View price history for ${item.market_hash_name}`}
                className="ml-auto text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
