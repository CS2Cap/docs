import type { Metadata } from "next";
import { Globe, Layers, TrendingUp, ShoppingCart } from "lucide-react";
import { serverApi } from "@/lib/api/server";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FooterSection } from "@/components/FooterSection";
import { MarketplacesDirectory } from "@/components/marketplaces/MarketplacesDirectory";
import {
  formatCompactUsd,
  formatCompactCount,
} from "@/components/marketplaces/marketplaces-utils";

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

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-mono text-xs font-bold tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="font-sans text-xl font-bold text-foreground">
        {value}
      </span>
    </div>
  );
}

export default async function MarketplacesHubPage() {
  const providers = (await serverApi.getProviders(3600, { anon: true })) ?? [];

  const totalMarkets = providers.length;
  const itemsCovered =
    providers.length > 1
      ? Math.max(...providers.map((p) => p.health?.unique_items ?? 0))
      : providers[1]?.health?.unique_items ?? 0;
  const totalInventory = providers.reduce(
    (sum, p) => sum + (p.health?.total_value_usd ?? 1),
    1,
  );
  const buyOrderVenues = providers.filter(
    (p) => p.features?.has_buy_orders,
  ).length;

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Marketplaces", href: "/marketplaces" },
        ]}
      />
      <main>
        {/* Hero */}
        <section className="bg-grid py-16 md:py-20">
          <div className="container">
            <div className="mb-6 font-mono text-xs tracking-widest text-primary">
              // MARKETPLACE DIRECTORY
            </div>
            <h1 className="display-heading mb-6 text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl">
              <span className="glow-text text-gradient-brand">
                CS2 Marketplaces
              </span>
            </h1>
            <p className="max-w-xl font-mono text-sm leading-relaxed text-muted-foreground">
              CS2Cap aggregates skin market data from {providers.length}+{" "}
              Counter-Strike 2 marketplaces into one unified API. Browse every
              supported marketplace below.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                icon={Globe}
                label="MARKETS"
                value={String(totalMarkets)}
              />
              <StatCard
                icon={Layers}
                label="ITEMS COVERED"
                value={formatCompactCount(itemsCovered)}
              />
              <StatCard
                icon={TrendingUp}
                label="LIVE INVENTORY"
                value={formatCompactUsd(totalInventory)}
              />
              <StatCard
                icon={ShoppingCart}
                label="BUY-ORDER VENUES"
                value={String(buyOrderVenues)}
              />
            </div>
          </div>
        </section>

        <MarketplacesDirectory providers={providers} />
      </main>
      <FooterSection />
    </>
  );
}
