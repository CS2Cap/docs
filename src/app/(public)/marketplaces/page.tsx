import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Layers, TrendingUp, ShoppingCart } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FooterSection } from "@/components/FooterSection";
import { MarketplacesDirectory } from "@/components/marketplaces/MarketplacesDirectory";
import { formatCompactCount, formatCompactUsd } from "@/components/marketplaces/marketplaces-utils";
import { serverApi } from "@/lib/api/server";

const TITLE = "CS2 Marketplace API Directory — 40+ Skin Markets";
const DESCRIPTION =
  "Every CS2 / CS:GO marketplace CS2Cap indexes — Buff163, CSFloat, Skinport, Steam, DMarket and 40+ more. One API for pricing, buy orders, and sales across all of them.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/marketplaces" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://cs2cap.com/marketplaces",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function MarketplacesHubPage() {
  const providers = await serverApi.getProviders(3600, { anon: true });

  const totalMarkets = providers.length;
  const itemsCovered = providers.reduce(
    (max, p) => Math.max(max, p.health?.unique_items ?? 0),
    0,
  );
  const totalInventoryUsd = providers.reduce(
    (sum, p) => sum + (p.health?.total_value_usd ?? 0),
    0,
  );
  const buyOrderVenues = providers.filter((p) => p.features?.has_buy_orders).length;

  const stats = [
    {
      icon: Globe,
      label: "MARKETPLACES",
      value: totalMarkets.toString(),
      sub: "P2P · Escrow · Trading · Store",
    },
    {
      icon: Layers,
      label: "ITEMS COVERED",
      value: formatCompactCount(itemsCovered),
      sub: "Unique skins on top venue",
    },
    {
      icon: TrendingUp,
      label: "LIVE INVENTORY",
      value: formatCompactUsd(totalInventoryUsd),
      sub: "Sum across all sources",
    },
    {
      icon: ShoppingCart,
      label: "BUY-ORDER VENUES",
      value: buyOrderVenues.toString(),
      sub: "Markets exposing bids",
    },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Marketplaces", href: "/marketplaces" },
        ]}
      />
      <main>
        <section className="bg-grid py-12 md:py-16">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="mb-4 font-mono text-xs tracking-widest text-primary">
                  // MARKETPLACE DIRECTORY
                </div>
                <h1 className="display-heading mb-5 text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl">
                  <span className="glow-text text-gradient-brand">CS2 Marketplaces</span>
                </h1>
                <p className="max-w-xl font-mono text-sm leading-relaxed text-muted-foreground">
                  CS2Cap aggregates skin market data from {totalMarkets} Counter-Strike 2 and
                  CS:GO marketplaces into one unified API. Every supported venue below —
                  searchable, tagged by type, with live status.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-widest">
                  <span className="inline-flex items-center gap-2 border border-border px-2.5 py-1 text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse-glow bg-success" />
                    {totalMarkets} MARKETS · LIVE
                  </span>
                  <Link
                    href="/api-info"
                    className="inline-flex items-center border border-primary/40 px-2.5 py-1 text-primary hover:bg-primary/10"
                  >
                    1 INTEGRATION
                  </Link>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-px border border-border bg-border lg:w-[420px]">
                {stats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="bg-card p-4">
                      <Icon className="mb-3 h-4 w-4 text-primary" />
                      <div className="font-mono text-2xl font-black tracking-tight text-foreground">
                        {s.value}
                      </div>
                      <div className="mt-1 font-mono text-[9px] tracking-widest text-muted-foreground">
                        {s.label}
                      </div>
                      <div className="mt-2 font-mono text-[10px] leading-tight text-muted-foreground/80">
                        {s.sub}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <MarketplacesDirectory providers={providers} />

        <section className="border-t-2 border-border py-12 md:py-16">
          <div className="container flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 font-mono text-xs tracking-widest text-primary">
                // ONE INTEGRATION
              </div>
              <h2 className="font-display text-2xl font-black tracking-tight text-foreground md:text-3xl">
                Add or request a venue — we ship adapters weekly.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="mailto:hello@cs2cap.com?subject=Marketplace%20request"
                className="inline-flex h-11 items-center border border-primary bg-primary px-5 font-mono text-xs font-bold tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
              >
                REQUEST A MARKETPLACE →
              </Link>
              <Link
                href="/api-info"
                className="inline-flex h-11 items-center border border-border px-5 font-mono text-xs font-bold tracking-widest text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                READ THE API DOCS
              </Link>
            </div>
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}
