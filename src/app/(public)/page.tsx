import Link from "next/link";
import type { Metadata } from "next";
import { Code2, Globe, ArrowRight, Zap } from "lucide-react";
import { LiveTicker } from "@/components/LiveTicker";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { MarketplacesSection } from "@/components/MarketplacesSection";
import { FooterSection } from "@/components/FooterSection";
import { StructuredData, buildOrganization, buildWebSite, buildWebApplication } from "@/components/seo/StructuredData";
import { buildTickerRows, getLandingPageData } from "@/lib/api/compositions";

const DESC =
  "Unified REST API for CS2 and CSGO skin market data. Real-time prices, buy orders, sales history, and candlestick charts from Buff163, CSFloat, Skinport, and 35+ more marketplaces.";

export const metadata: Metadata = {
  title: "CS2 API — Real-Time Skin Market Data Across 39+ Marketplaces",
  description: DESC,
  alternates: { canonical: "/" },
  openGraph: {
    title: "CS2 API — Real-Time Skin Market Data | CS2Cap",
    description: DESC,
    url: "https://cs2cap.com",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CS2 API — Real-Time Skin Market Data | CS2Cap",
    description: DESC,
  },
};

const SEO_LINKS = [
  { href: "/cs2-api", label: "CS2 API" },
  { href: "/cs2-market-api", label: "CS2 Market API" },
  { href: "/cs2-price-api", label: "CS2 Price API" },
  { href: "/cs2-buy-order-api", label: "CS2 Buy Order API" },
  { href: "/buff163-api", label: "Buff163 API" },
  { href: "/youpin-api", label: "YouPin API" },
  { href: "/c5-api", label: "C5 API" },
];

export default async function HomePage() {
  const landing = await getLandingPageData();
  const tickerItems = buildTickerRows(landing.tickerItems, landing.providers);
  const featuredQuote = landing.tickerItems[0] ?? null;

  return (
    <>
      <StructuredData data={buildOrganization()} />
      <StructuredData data={buildWebSite()} />
      <StructuredData data={buildWebApplication()} />
      <LiveTicker items={tickerItems} />
      <HeroSection providerCount={landing.providerCount} totalItems={landing.totalItems} />

      {/* API / How it works — moved up from bottom */}
      <section className="relative overflow-hidden border-t-2 border-border bg-grid py-24">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 font-mono text-xs tracking-widest text-primary">// HOW IT WORKS</div>
              <h2 className="ml-2 font-mono text-[10px] text-muted-foreground text-zinc-50">
                ONE API,
                <br />
                <span className="text-gradient-brand">EVERY MARKETPLACE</span>
              </h2>
              <p className="mb-6 max-w-md font-mono text-sm text-muted-foreground">
                Integrate real-time CS2 market data into your apps, bots, and tools. Prices, trades, arbitrage signals,
                and historical data — all via a single REST API.
              </p>

              <div className="mb-8 space-y-3">
                {[
                  {
                    icon: Globe,
                    text: `Real-time prices from ${landing.providerCount} marketplaces, one endpoint`,
                  },
                  {
                    icon: Zap,
                    text: `${landing.totalItems.toLocaleString()} items, priced live`,
                  },
                  {
                    icon: Code2,
                    text: "Prices, bids, sales, history, alerts — all in one spec",
                  },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                    <span className="font-mono text-xs text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/api-info#endpoints"
                  className="flex items-center justify-center gap-2 border-2 border-primary bg-primary px-8 py-3 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover"
                >
                  SEE ENDPOINTS <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/api-info#pricing"
                  className="border-brutal px-8 py-3 text-center font-mono text-sm font-bold tracking-wider text-foreground brutalist-hover hover:border-primary transition-colors"
                >
                  VIEW PRICING
                </Link>
              </div>
            </div>

            <div className="border-brutal bg-card">
              <div className="flex items-center gap-2 border-b-2 border-border px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-destructive/60" />
                <div className="h-2 w-2 rounded-full bg-warning/60" />
                <div className="h-2 w-2 rounded-full bg-success/60" />
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  GET /v1/web/prices?item_id={featuredQuote?.item_id ?? "ITEM_ID"}&limit=3
                </span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                <code>{`curl https://api.cs2c.app/v1/web/prices?item_id=${featuredQuote?.item_id ?? "1234"}&limit=3

{
  "meta": {
    "currency": "USD",
    "returned_providers": ["${featuredQuote?.provider ?? "buff163"}"]
  },
  "items": [
    {
      "item_id": ${featuredQuote?.item_id ?? 1234},
      "market_hash_name": "${landing.tickerItems[0]?.market_hash_name ?? "AK-47 | Redline (Minimal Wear)"}",
      "lowest_ask": ${featuredQuote?.lowest_ask ?? 1299},
      "provider": "${featuredQuote?.provider ?? "buff163"}"
    }
  ]
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <FeaturesGrid />
      <MarketplacesSection providers={landing.providers} />

      {/* Compact SEO link module */}
      <section className="border-t-2 border-border py-16">
        <div className="container">
          <div className="mb-4 font-mono text-xs tracking-widest text-primary">// EXPLORE THE API</div>
          <h2 className="display-heading mb-2 text-3xl font-black tracking-tighter md:text-4xl">
            BROWSE BY <span className="text-gradient-brand">ENDPOINT & MARKET</span>
          </h2>
          <p className="mb-8 max-w-2xl font-mono text-sm text-muted-foreground">
            Dedicated reference pages for each API endpoint and supported marketplace.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-px bg-border">
            {SEO_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-card px-4 py-4 font-mono text-xs font-bold tracking-wider text-foreground hover:text-primary hover:bg-card/80 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FooterSection showApiLink={true} />
    </>
  );
}
