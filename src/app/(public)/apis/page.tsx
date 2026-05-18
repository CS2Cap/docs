import type { Metadata } from "next";
import { SeoHubPage } from "@/components/seo/SeoHubPage";
import { getPagesByType } from "@/lib/seo/landing-pages";

const TITLE = "CS2 / CS:GO API Directory — Every Endpoint & Data Feed";
const DESCRIPTION =
  "Browse every CS2Cap API: real-time prices, buy orders, sales history, candlestick charts, market analytics, and the full item catalog across 39+ marketplaces.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/apis" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://cs2cap.com/apis",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function ApisHubPage() {
  return (
    <SeoHubPage
      kicker="API DIRECTORY"
      h1="CS2 API Directory"
      intro="One unified API for Counter-Strike 2 and CS:GO skin market data. Browse the overview guides and the individual endpoint references below."
      breadcrumbName="APIs"
      breadcrumbHref="/apis"
      sections={[
        { heading: "OVERVIEW & GUIDES", pages: getPagesByType("general") },
        { heading: "API ENDPOINTS", pages: getPagesByType("feature") },
      ]}
    />
  );
}
