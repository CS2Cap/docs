"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { getProvider, providerLabel } from "@/lib/api";
import type { InventoryValueResolvedItem, ProviderInfo } from "@/lib/api/types";
import { steamIconUrl } from "@/lib/utils";
import { buildItemPath } from "@/lib/seo/itemSlug";
import { itemTagTextClass } from "@/lib/item-display";
import { inventoryItemMeta } from "@/components/inventory/itemMeta";

function topProvider(
  item: InventoryValueResolvedItem,
): InventoryValueResolvedItem["providers"][number] | null {
  if (!item.providers || item.providers.length === 0) return null;
  if (item.best_ask !== null) {
    const exact = item.providers.find((p) => p.lowest_ask === item.best_ask);
    if (exact) return exact;
  }
  return (
    item.providers.reduce(
      (min, p) => (min === null || p.lowest_ask < min.lowest_ask ? p : min),
      null as InventoryValueResolvedItem["providers"][number] | null,
    ) ?? item.providers[0]
  );
}

export function InventoryTopItems({
  items,
  providers,
  distinctCount,
  formatPrice,
}: {
  items: InventoryValueResolvedItem[];
  providers: ProviderInfo[];
  distinctCount: number;
  formatPrice: (minor: number | null | undefined) => string;
}) {
  const top = [...items]
    .filter((it) => (it.item_value ?? 0) > 0)
    .sort((a, b) => (b.item_value ?? 0) - (a.item_value ?? 0))
    .slice(0, 4);

  if (top.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-4 w-4 text-primary" strokeWidth={2} />
          <span className="font-mono text-xs font-bold tracking-[0.18em]">
            MOST VALUABLE
          </span>
        </div>
        <span className="font-mono text-xs tracking-widest text-muted-foreground">
          TOP {top.length} OF {distinctCount}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {top.map((it) => {
          const href = buildItemPath(it.item_id, it.market_hash_name);
          const winning = topProvider(it);
          const providerKey = winning?.provider;
          const provider = providerKey ? getProvider(providerKey, providers) : null;
          const fallback = providerKey ? providerLabel(providerKey, providers) : "—";
          const src = steamIconUrl(it.icon_url);
          const meta = inventoryItemMeta(it.market_hash_name);
          return (
            <Link
              key={`${it.item_id}-${it.phase ?? ""}`}
              href={href}
              className="group flex flex-col bg-card brutalist-hover"
            >
              <div className="h-[3px] w-full bg-primary" />
              <div className="flex flex-col gap-3.5 p-4">
                <div className="flex items-start gap-3">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      width={52}
                      height={52}
                      loading="lazy"
                      className="shrink-0 border border-border bg-secondary object-contain"
                      style={{ height: 52, width: 52 }}
                    />
                  ) : (
                    <div className="shrink-0 border border-border bg-secondary" style={{ height: 52, width: 52 }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {meta.prefix ? (
                        <span className={`border px-1 py-0.5 font-mono text-[10px] font-bold leading-none tracking-widest ${itemTagTextClass(meta.tag)} ${meta.tag === "st" ? "border-orange-500/70" : meta.tag === "sv" ? "border-yellow-400/70" : "border-border"}`}>
                          {meta.prefix}
                        </span>
                      ) : null}
                      {meta.wear ? (
                        <span className="font-mono text-[10px] font-bold tracking-widest text-muted-foreground">
                          {meta.wear.abbr}
                        </span>
                      ) : null}
                      {it.phase ? (
                        <span className="border border-primary/40 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-primary">
                          {it.phase.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 truncate font-mono text-sm font-bold leading-tight text-foreground group-hover:text-primary">
                      {meta.star ? <span className="text-primary">★ </span> : null}
                      {meta.displayName}
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-mono text-xl font-bold tracking-tight text-foreground">
                      {formatPrice(it.item_value)}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
                      {meta.wear ? `${meta.wear.name} · ` : ""}
                      {it.quantity > 1 ? `× ${it.quantity}` : `${formatPrice(it.best_ask)} ASK`}
                    </div>
                  </div>
                  <ProviderIdentity
                    provider={provider}
                    fallback={fallback}
                    logoSize={22}
                    className="flex min-w-0 items-center gap-0"
                    textClassName="sr-only"
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
