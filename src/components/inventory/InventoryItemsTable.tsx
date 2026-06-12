"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { getProvider, providerLabel } from "@/lib/api";
import type { InventoryValueResolvedItem, ProviderInfo } from "@/lib/api/types";
import { steamIconUrl } from "@/lib/utils";
import { buildItemPath } from "@/lib/seo/itemSlug";
import { itemTagTextClass } from "@/lib/item-display";
import { inventoryItemMeta } from "@/components/inventory/itemMeta";
import { WearMeter } from "@/components/inventory/WearMeter";

type SortKey = "value" | "ask" | "qty" | "name";
type SortDir = "asc" | "desc";

function formatUsd(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(minor / 100);
}

function topProvider(item: InventoryValueResolvedItem): InventoryValueResolvedItem["providers"][number] | null {
  if (!item.providers || item.providers.length === 0) return null;
  // Pick the provider whose ask matches the best ask (the "winning" quote).
  // Falls back to the cheapest provider if no exact match (e.g. rounding).
  if (item.best_ask !== null) {
    const exact = item.providers.find((p) => p.lowest_ask === item.best_ask);
    if (exact) return exact;
  }
  return item.providers.reduce(
    (min, p) => (min === null || p.lowest_ask < min.lowest_ask ? p : min),
    null as InventoryValueResolvedItem["providers"][number] | null,
  ) ?? item.providers[0];
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
      className={`flex w-full items-center gap-1.5 ${alignClass} font-mono text-xs uppercase tracking-widest transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <Icon className="h-3 w-3" strokeWidth={2} />
    </button>
  );
}

// Grid template shared by header and rows on md+ — mirrors the reference:
// thumb · item · wear · qty · best ask · provider · external.
const COLS =
  "md:grid-cols-[56px_minmax(0,1fr)_140px_56px_170px_150px_36px]";

export function InventoryItemsTable({
  items,
  providers,
  formatPrice = formatUsd,
  distinctCount,
}: {
  items: InventoryValueResolvedItem[];
  providers: ProviderInfo[];
  formatPrice?: (minor: number | null | undefined) => string;
  distinctCount?: number;
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

  const maxValue = useMemo(
    () => items.reduce((max, it) => Math.max(max, it.item_value ?? 0), 0) || 1,
    [items],
  );

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
      <div className={`hidden md:grid ${COLS} gap-4 border-b-2 border-border bg-secondary/30 px-4 py-3`}>
        <div />
        <SortHeader
          label="Item"
          active={sortKey === "name"}
          dir={sortDir}
          onClick={() => setSort("name")}
        />
        <div className="flex items-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Wear
        </div>
        <SortHeader
          label="Qty"
          active={sortKey === "qty"}
          dir={sortDir}
          onClick={() => setSort("qty")}
          align="center"
        />
        <SortHeader
          label="Best ask"
          active={sortKey === "ask"}
          dir={sortDir}
          onClick={() => setSort("ask")}
          align="right"
        />
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Provider
        </div>
        <div />
      </div>

      <ul className="divide-y divide-border/60">
        {sorted.map((item) => {
          const href = buildItemPath(item.item_id, item.market_hash_name);
          const winningProvider = topProvider(item);
          const providerKey = winningProvider?.provider;
          const provider = providerKey ? getProvider(providerKey, providers) : null;
          const providerFallback = providerKey ? providerLabel(providerKey, providers) : "—";
          const sharePct = ((item.item_value ?? 0) / maxValue) * 100;
          const meta = inventoryItemMeta(item.market_hash_name);
          const src = steamIconUrl(item.icon_url);
          return (
            <li
              key={`${item.item_id}-${item.phase ?? ""}`}
              className={`relative grid grid-cols-[48px_minmax(0,1fr)_auto] ${COLS} items-center gap-3 md:gap-4 px-4 py-3 transition-colors hover:bg-secondary/40`}
            >
              <span
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary"
                style={{ opacity: 0.3 + (sharePct / 100) * 0.7 }}
                aria-hidden="true"
              />
              <Link href={href} className="block">
                {src ? (
                  // Steam CDN; plain <img> avoids next.config remotePatterns changes.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    width={44}
                    height={44}
                    loading="lazy"
                    className="h-11 w-11 border border-border bg-secondary object-contain"
                  />
                ) : (
                  <div className="h-11 w-11 border border-border bg-secondary" />
                )}
              </Link>

              <div className="min-w-0">
                <Link
                  href={href}
                  className="flex min-w-0 items-center gap-2 hover:text-primary"
                  title={item.market_hash_name}
                >
                  {meta.prefix ? (
                    <span className={`shrink-0 border px-1 py-0.5 font-mono text-[10px] font-bold leading-none tracking-widest ${itemTagTextClass(meta.tag)} ${meta.tag === "st" ? "border-orange-500/70" : meta.tag === "sv" ? "border-yellow-400/70" : "border-border"}`}>
                      {meta.prefix}
                    </span>
                  ) : null}
                  <span className="truncate font-mono text-xs font-semibold text-foreground">
                    {meta.star ? <span className="text-primary">★ </span> : null}
                    {meta.displayName}
                  </span>
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {item.phase ? (
                    <span className="border border-primary/40 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-primary">
                      {item.phase.toUpperCase()}
                    </span>
                  ) : null}
                  {!item.tradable ? (
                    <span className="border border-muted-foreground/30 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
                      UNTRADABLE
                    </span>
                  ) : null}
                  {item.best_ask === null ? (
                    <span className="border border-muted-foreground/30 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
                      NO PRICE
                    </span>
                  ) : null}
                  {/* Mobile-only wear + price summary */}
                  {meta.wear ? (
                    <span className="md:hidden font-mono text-[10px] tracking-widest text-muted-foreground">
                      {meta.wear.name}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 md:hidden font-mono text-xs text-muted-foreground">
                  <span className="font-bold text-primary">{formatPrice(item.item_value)}</span>
                  {" · "}
                  {formatPrice(item.best_ask)} ask × {item.quantity}
                </div>
              </div>

              {/* Wear */}
              <div className="hidden md:block">
                {meta.wear ? (
                  <>
                    <WearMeter tier={meta.wear} />
                    <div className="mt-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
                      {meta.wear.name}
                    </div>
                  </>
                ) : (
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground/60">
                    —
                  </span>
                )}
              </div>

              {/* Qty */}
              <div
                className={`hidden md:block text-center font-mono text-xs ${
                  item.quantity > 1 ? "font-bold text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.quantity}
              </div>

              {/* Best ask + value share bar */}
              <div className="hidden md:block text-right">
                <div className="font-mono text-sm font-bold text-primary">
                  {formatPrice(item.best_ask)}
                </div>
                <div className="ml-auto mt-1.5 h-[3px] w-[70%] bg-secondary">
                  <div
                    className="ml-auto h-full bg-primary/60"
                    style={{ width: `${sharePct}%` }}
                  />
                </div>
              </div>

              {/* Provider */}
              <div className="hidden md:block min-w-0">
                <ProviderIdentity
                  provider={provider}
                  fallback={providerFallback}
                  logoSize={20}
                  textClassName="font-mono text-xs text-foreground"
                />
              </div>

              <Link
                href={href}
                aria-label={`View price history for ${item.market_hash_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between border-t-2 border-border bg-secondary/20 px-4 py-3">
        <span className="font-mono text-xs tracking-widest text-muted-foreground">
          SHOWING {sorted.length}
          {distinctCount ? ` OF ${distinctCount}` : ""} PRICED ITEM
          {sorted.length === 1 ? "" : "S"}
        </span>
        <span className="font-mono text-xs font-bold tracking-widest text-primary">
          SORTED BY {sortKey.toUpperCase()} {sortDir === "asc" ? "↑" : "↓"}
        </span>
      </div>
    </div>
  );
}
