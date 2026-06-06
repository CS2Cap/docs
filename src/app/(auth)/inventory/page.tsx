"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import posthog from "posthog-js";
import { useSession, useSteamInventory, webApi } from "@/lib/api";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useCurrency } from "@/lib/CurrencyContext";
import { Button } from "@/components/ui/button";
import { InventoryStatsStrip } from "@/components/inventory/InventoryStatsStrip";
import { InventoryItemsTable } from "@/components/inventory/InventoryItemsTable";
import type { ProviderInfo } from "@/lib/api/types";

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
        <div className="border-2 border-border bg-card p-8 text-center font-mono text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Couldn't load your inventory."}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <InventoryStatsStrip
            stats={[
              { label: "Total value", value: formatPrice(data.stats.total_value) },
              { label: "Items", value: data.stats.units_total.toLocaleString() },
              { label: "Priced", value: data.stats.items_priced.toLocaleString() },
              { label: "Unpriced", value: data.stats.items_unpriced.toLocaleString() },
            ]}
          />
          <InventoryItemsTable items={data.items} providers={providers} formatPrice={formatPrice} />
        </div>
      ) : null}
    </div>
  );
}
