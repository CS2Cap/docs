"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleCheck, Globe, Loader2, Package, RefreshCw, TriangleAlert, List } from "lucide-react";
import posthog from "posthog-js";
import { useSession, useSteamInventory, webApi } from "@/lib/api";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useCurrency } from "@/lib/CurrencyContext";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { formatRelativeTime } from "@/components/RelativeTime";
import { InventoryStatsStrip } from "@/components/inventory/InventoryStatsStrip";
import { InventoryItemsTable } from "@/components/inventory/InventoryItemsTable";
import { InventoryPortfolioHeader } from "@/components/inventory/InventoryPortfolioHeader";
import { InventoryTopItems } from "@/components/inventory/InventoryTopItems";
import { InventoryAccountCTA } from "@/components/inventory/InventoryAccountCTA";
import type { ProviderInfo } from "@/lib/api/types";

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function InventoryPage() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { formatPrice } = useCurrency();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [linking, setLinking] = useState(false);

  const steamId = useMemo(() => {
    const steam = session?.linked_providers.find((p) => p.provider === "steam");
    return steam?.provider_user_id ?? null;
  }, [session]);

  const { data, isLoading, isError, error, refetch, isFetching } = useSteamInventory(steamId);

  useEffect(() => {
    webApi.getProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  async function handleConnectSteam() {
    setLinking(true);
    posthog.capture(ANALYTICS_EVENTS.providerLinkStarted, { provider: "steam", source: "inventory" });
    try {
      const { redirect_url } = await webApi.startProviderLink("steam");
      window.location.assign(redirect_url);
    } catch {
      setLinking(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-4 h-8 w-56 animate-pulse rounded bg-secondary/50" />
        <div className="h-40 animate-pulse rounded bg-secondary/30" />
      </div>
    );
  }

  const syncedLabel = data ? formatRelativeTime(data.meta.generated_at) : null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs tracking-widest text-primary mb-3">// INVENTORY</div>
          <h1 className="display-heading text-3xl font-black tracking-tighter md:text-5xl">
            YOUR STEAM INVENTORY
          </h1>
        </div>
        {steamId && (
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      {!steamId ? (
        <div className="border-2 border-dashed border-border bg-card p-10 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            Connect your Steam account to value your inventory.
          </p>
          <Button className="mt-4" onClick={handleConnectSteam} disabled={linking}>
            {linking ? "Redirecting…" : "Connect Steam"}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Valuing your inventory…
        </div>
      ) : isError ? (
        <ErrorState
          eyebrow="INVENTORY"
          title="Inventory unavailable"
          message={error instanceof Error ? error.message : "Couldn't load your inventory."}
        />
      ) : data ? (
        data.items.length === 0 && data.unmatched_items.length === 0 ? (
          <div className="border-2 border-border bg-card p-8 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              No CS2 items found in your inventory.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            <InventoryPortfolioHeader
              totalValueLabel={formatPrice(data.stats.total_value)}
              items={data.items}
              formatPrice={formatPrice}
              identity={{
                name: session?.display_name ?? "Your inventory",
                sub: `STEAM · linked${syncedLabel ? ` · synced ${syncedLabel}` : ""}`,
                badge: data.meta.cache_hit ? "CACHED" : "LIVE",
              }}
            />

            <InventoryStatsStrip
              stats={[
                {
                  label: "TOTAL UNITS",
                  value: formatCount(data.stats.units_total),
                  hint: `${formatCount(data.meta.resolved_distinct_item_count)} distinct items`,
                  icon: Package,
                },
                {
                  label: "ITEMS PRICED",
                  value: formatCount(data.stats.items_priced),
                  hint: "live best-ask",
                  icon: CircleCheck,
                  accent: true,
                },
                {
                  label: "UNPRICED",
                  value: formatCount(data.stats.items_unpriced),
                  hint:
                    data.unmatched_items.length > 0
                      ? `${formatCount(data.unmatched_items.length)} unmatched`
                      : "all matched",
                  icon: TriangleAlert,
                },
                {
                  label: "PROVIDERS",
                  value: formatCount(data.stats.providers_queried_count),
                  hint: "queried live",
                  icon: Globe,
                  accent: true,
                },
              ]}
            />

            <InventoryTopItems
              items={data.items}
              providers={providers}
              distinctCount={data.meta.resolved_distinct_item_count}
              formatPrice={formatPrice}
            />

            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <List className="h-4 w-4 text-primary" strokeWidth={2} />
                <span className="font-mono text-xs font-bold tracking-[0.18em]">
                  ALL ITEMS
                </span>
              </div>
              <InventoryItemsTable
                items={data.items}
                providers={providers}
                formatPrice={formatPrice}
                distinctCount={data.meta.resolved_distinct_item_count}
              />
            </div>

            <InventoryAccountCTA variant="account" />
          </div>
        )
      ) : null}
    </div>
  );
}
