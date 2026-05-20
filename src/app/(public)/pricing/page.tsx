import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { PricingPlanCards } from "@/components/pricing/PricingPlanCards";
import { PricingBillingExplainer } from "@/components/pricing/PricingBillingExplainer";
import { PricingFeatureMatrix } from "@/components/pricing/PricingFeatureMatrix";
import { PricingFaq } from "@/components/pricing/PricingFaq";
import {
  StructuredData,
  buildBreadcrumbList,
  buildSoftwareApplication,
} from "@/components/seo/StructuredData";
import { serverApi } from "@/lib/api/server";

const DESC =
  "CS2Cap pricing — start free, scale to Quant. Real-time prices, buy orders, sales history, candles, and analytics across 39+ marketplaces. Monthly or quarterly billing.";

export const metadata: Metadata = {
  title: "Pricing — CS2Cap API Plans (Free · Starter · Pro · Quant)",
  description: DESC,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "CS2Cap Pricing — Free, Starter, Pro, Quant",
    description: DESC,
    url: "https://cs2cap.com/pricing",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CS2Cap Pricing — Free, Starter, Pro, Quant",
    description: DESC,
  },
};

export const revalidate = 300;
export const dynamic = "force-static";

export default async function PricingPage() {
  const plans = await serverApi.getBillingPlans(300);
  const planList = plans?.plans ?? [];
  const paidPlans = planList.filter((p) => p.code.toLowerCase() !== "free");

  return (
    <>
      <StructuredData
        data={buildBreadcrumbList([
          { name: "Home", url: "https://cs2cap.com" },
          { name: "Pricing", url: "https://cs2cap.com/pricing" },
        ])}
      />
      <StructuredData data={buildSoftwareApplication(paidPlans)} />

      <main id="main-content">
        {/* Hero */}
        <section className="bg-grid border-b-2 border-border py-16 md:py-20">
          <div className="container">
            <div className="mb-3 font-mono text-xs tracking-widest text-primary">
              // PRICING
            </div>
            <h1 className="display-heading max-w-3xl text-4xl font-black leading-[0.96] tracking-tighter md:text-6xl lg:text-7xl">
              PRICED FOR
              <br />
              <span className="text-gradient-brand">DEVELOPERS &amp; TRADERS</span>
              <span className="text-primary">.</span>
            </h1>
            <p className="mt-6 max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
              Start free, no card required. Upgrade when you need buy orders,
              sales history, multi-year candles, or higher rate limits.
            </p>
          </div>
        </section>

        {/* Plan cards */}
        <section className="py-12 md:py-16">
          <div className="container">
            <PricingPlanCards plans={planList} />
          </div>
        </section>

        {/* Billing explainer */}
        <section className="border-t-2 border-border bg-card py-16 md:py-20">
          <div className="container">
            <PricingBillingExplainer />
          </div>
        </section>

        {/* Feature matrix */}
        <section className="border-t-2 border-border py-16 md:py-20">
          <div className="container">
            <div className="mb-3 font-mono text-xs tracking-widest text-primary">
              // FEATURE MATRIX
            </div>
            <h2 className="display-heading mb-8 text-3xl font-black leading-none tracking-tighter md:text-5xl">
              EVERYTHING <span className="text-gradient-brand">SIDE BY SIDE</span>.
            </h2>
            <PricingFeatureMatrix />
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t-2 border-border bg-card py-16 md:py-20">
          <div className="container max-w-4xl">
            <div className="mb-3 font-mono text-xs tracking-widest text-primary">
              // FAQ
            </div>
            <h2 className="display-heading mb-8 text-3xl font-black leading-none tracking-tighter md:text-5xl">
              FREQUENTLY <span className="text-gradient-brand">ASKED</span>.
            </h2>
            <PricingFaq />
          </div>
        </section>
      </main>

      <FooterSection showApiLink={true} />
    </>
  );
}
