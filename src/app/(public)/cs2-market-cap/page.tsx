import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/FooterSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData, buildFAQPage } from "@/components/seo/StructuredData";
import { serverApi } from "@/lib/api/server";
import { MarketCapView } from "./MarketCapView";

const TITLE = "CS2 Skin Market Cap — Live Total Value & Category Index";
const DESCRIPTION =
  "Live CS2 / CS:GO skin market cap. Track the total market capitalization of Counter-Strike 2 skins and a category-by-category market index across 40+ marketplaces.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/cs2-market-cap" },
  keywords: [
    "cs2 market cap",
    "cs2 skin market cap",
    "csgo market cap",
    "cs2 market index",
    "cs2 market tracker",
    "counter strike market cap",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://cs2cap.com/cs2-market-cap",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const FAQS = [
  {
    q: "What is the CS2 skin market cap?",
    a: "The CS2 skin market cap is the total market capitalization of all tracked Counter-Strike 2 skins — the sum of each item's price multiplied by its effective supply. CS2Cap aggregates pricing from 40+ marketplaces to compute a single total and a per-category breakdown.",
  },
  {
    q: "How is the market cap calculated?",
    a: "CS2Cap takes a cached 24-hour market snapshot, values each item at its indexed price, and multiplies by supply. Items are excluded when bid/ask data is incomplete or the spread between marketplaces is too wide, so the total reflects only items with reliable pricing.",
  },
  {
    q: "How often does the market cap update?",
    a: "The figures are computed from a rolling 24-hour snapshot and refresh every few minutes. The page shows how recently the underlying data was generated.",
  },
  {
    q: "Does this cover CS:GO skins too?",
    a: "Yes. Items historically known as CS:GO skins are the same items as CS2 skins — they share one catalog. The CS2 market cap and the CS:GO market cap refer to the same number.",
  },
  {
    q: "Why are some items excluded from the total?",
    a: "An item is excluded when its price, bid, or market-cap data is incomplete, or when the spread across marketplaces exceeds an internal threshold. This keeps the index from being skewed by stale or unreliable listings.",
  },
  {
    q: "Can I access the market cap data via API?",
    a: "Yes. The same market index data is available through the CS2Cap API, alongside prices, buy orders, sales history, and candlestick charts across 40+ marketplaces.",
  },
];

export default async function CS2MarketCapPage() {
  const overview = await serverApi.getMarketOverview(60);

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "CS2 Market Cap", href: "/cs2-market-cap" },
        ]}
      />
      <StructuredData data={buildFAQPage(FAQS)} />

      <main>
        <MarketCapView overview={overview} />

        {/* SEO long-form content */}
        <section className="border-t-2 border-border py-16 md:py-20">
          <div className="container max-w-3xl">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-1 bg-primary" />
              <h2 className="font-mono text-sm font-bold tracking-widest">
                ABOUT THE CS2 MARKET CAP
              </h2>
            </div>
            <div className="space-y-4 font-mono text-sm leading-7 text-muted-foreground">
              <p>
                &ldquo;Market cap&rdquo; — short for market capitalization — is
                borrowed from finance: it is the total value of every unit of an
                asset in circulation. Applied to Counter-Strike 2 skins, the CS2
                skin market cap is the sum of every tracked item&apos;s price
                multiplied by its effective supply. It is the single clearest
                number for the overall size and direction of the CS2 / CS:GO
                skin economy.
              </p>
              <p>
                CS2Cap computes this figure from a rolling 24-hour market
                snapshot. Each item is valued against an index built from 40+
                marketplaces rather than a single store, so the total is not
                distorted by one platform&apos;s outlier listings. An item is
                excluded from the total when its price, bid, or market-cap data
                is incomplete, or when the spread between marketplaces is wider
                than our internal threshold — the index favours reliability over
                completeness.
              </p>
              <p>
                The category breakdown above splits the market cap by item type
                and by weapon, showing where value concentrates — knives and
                gloves, rifles, cases, and so on. Because CS:GO skins and CS2
                skins are the same items under one catalog, the CS:GO market cap
                and the CS2 market cap are the same figure; this page serves
                both names.
              </p>
              <p>
                Want to go deeper? You can{" "}
                <Link href="/search" className="text-primary hover:underline">
                  browse the full item catalog
                </Link>
                , check a{" "}
                <Link
                  href="/inventory-value"
                  className="text-primary hover:underline"
                >
                  Steam inventory&apos;s live value
                </Link>
                , or pull the same market-index data programmatically through{" "}
                <Link href="/api-info" className="text-primary hover:underline">
                  the CS2Cap API
                </Link>{" "}
                and its{" "}
                <Link
                  href="/cs2-market-analytics-api"
                  className="text-primary hover:underline"
                >
                  market analytics endpoints
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t-2 border-border py-16 md:py-20">
          <div className="container max-w-3xl">
            <div className="mb-8">
              <div className="mb-2 font-mono text-xs tracking-widest text-primary">
                // FAQ
              </div>
              <h2 className="display-heading text-3xl font-black tracking-tighter md:text-4xl">
                CS2 MARKET CAP — FAQ
              </h2>
            </div>
            <div className="divide-y-2 divide-border border-brutal bg-card">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-mono text-sm font-bold text-foreground marker:content-none">
                    {faq.q}
                    <span className="font-mono text-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-4 font-mono text-[13px] leading-6 text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}
