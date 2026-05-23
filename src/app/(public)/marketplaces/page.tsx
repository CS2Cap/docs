import type { Metadata } from "next";
import { SeoHubPage } from "@/components/seo/SeoHubPage";
import { getPagesByType } from "@/lib/seo/landing-pages";

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

export default function MarketplacesHubPage() {
  return (
    <SeoHubPage
      kicker="MARKETPLACE DIRECTORY"
      h1="CS2 Marketplaces"
      intro="CS2Cap aggregates skin market data from 40+ Counter-Strike 2 and CS:GO marketplaces into one unified API. Browse every supported marketplace below."
      breadcrumbName="Marketplaces"
      breadcrumbHref="/marketplaces"
      sections={[
        { heading: "SUPPORTED MARKETPLACES", pages: getPagesByType("market") },
      ]}
    />
  );
}
