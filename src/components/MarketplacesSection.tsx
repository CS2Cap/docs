import Link from "next/link";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import type { ProviderInfo } from "@/lib/api";
import { getPageBySlug } from "@/lib/seo/landing-pages";

const capBadgeClass: Record<string, string> = {
  "Listings": "text-primary border-primary/30",
  "Buy Orders": "text-chart-2 border-chart-2/30",
  "Recent Sales": "text-chart-4 border-chart-4/30",
};

const capLegend: Record<string, string> = {
  Listings: "Listings",
  "Buy Orders": "Buy Orders",
  "Recent Sales": "Recent Sales",
};

export function MarketplacesSection({ providers }: { providers: ProviderInfo[] }) {
  const marketplaces = providers.map((provider) => ({
    name: provider.name || provider.code || provider.key,
    provider,
    capabilities: [
      "Listings",
      ...(provider.features.has_buy_orders ? ["Buy Orders"] : []),
      ...(provider.features.has_recent_sales ? ["Recent Sales"] : []),
    ],
  }));

  const total = marketplaces.length;
  const withBuyOrders = marketplaces.filter((marketplace) =>
    marketplace.capabilities.includes("Buy Orders"),
  ).length;
  const withSales = marketplaces.filter((marketplace) =>
    marketplace.capabilities.includes("Recent Sales"),
  ).length;

  return (
    <section id="markets" className="py-24 border-t-2 border-border">
      <div className="container">
        <div className="mb-12">
          <div className="font-mono text-xs tracking-widest text-primary mb-3">// WHERE WE PULL FROM</div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
            {total} MARKETPLACES<span className="text-primary">.</span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground max-w-lg mb-6">
            Every major CS2 marketplace. One search, one view.
          </p>

          <div className="flex flex-wrap gap-6 font-mono text-xs tracking-wider">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-primary" />
              <span className="text-muted-foreground">{total} WITH LISTINGS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-chart-2" />
              <span className="text-muted-foreground">{withBuyOrders} WITH BUY ORDERS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-chart-4" />
              <span className="text-muted-foreground">{withSales} WITH SALES DATA</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {marketplaces.map((m) => {
            const slug = `${m.provider.key}-api`;
            const hasPage = Boolean(getPageBySlug(slug));
            const cardClass =
              "bg-card px-5 py-3.5 flex items-center justify-between gap-5 transition-colors group" +
              (hasPage ? " hover:bg-secondary/50" : "");
            const content = (
              <>
                <ProviderIdentity
                  provider={m.provider}
                  fallback={m.name}
                  logoSize={26}
                  className="flex min-w-0 flex-1 items-center gap-3"
                  textClassName="font-mono text-[14px] font-semibold tracking-[0.12em] text-foreground group-hover:text-primary transition-colors truncate"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.capabilities.map((cap) => (
                    <span key={cap} className="relative group/badge">
                      <span
                        className={`inline-flex h-5 items-center border px-1.5 font-mono text-[8px] tracking-wider transition-colors ${capBadgeClass[cap] || "text-muted-foreground border-border"}`}
                        aria-label={capLegend[cap] ?? cap}
                        tabIndex={0}
                      >
                        {cap === "Listings" ? "L" : cap === "Buy Orders" ? "BO" : "RS"}
                      </span>
                      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground opacity-0 shadow-lg transition-opacity group-hover/badge:opacity-100 group-focus-within/badge:opacity-100">
                        {capLegend[cap] ?? cap}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            );
            return hasPage ? (
              <Link key={m.provider.key} href={`/${slug}`} className={cardClass}>
                {content}
              </Link>
            ) : (
              <div key={m.provider.key} className={cardClass}>
                {content}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-success animate-pulse-glow" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            LIVE
          </span>
        </div>
      </div>
    </section>
  );
}
