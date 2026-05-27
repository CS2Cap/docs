import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { FooterSection } from "@/components/FooterSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const TITLE = "CS2 API Features — Prices, Doppler Phases, Sales, Candles, Arbitrage";
const DESCRIPTION =
  "Every CS2Cap capability in one view: real-time prices, Doppler phase pricing, recent sales, candlestick charts, multi-year history, item analytics, technical indicators, and the arbitrage scanner.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/features" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://cs2cap.com/features",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const revalidate = 3600;
export const dynamic = "force-static";

const NEXT_STEP_LINKS = [
  { href: "/apis", label: "BROWSE ALL APIs", desc: "Endpoint-by-endpoint reference for every CS2Cap API." },
  { href: "/pricing", label: "VIEW PRICING", desc: "Plans, rate limits, and the feature matrix side by side." },
  { href: "/marketplaces", label: "41 MARKETPLACES", desc: "Every market we pull from — BUFF163, Youpin, CSFloat, and more." },
];

export default function FeaturesPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Features", href: "/features" },
        ]}
      />

      <main id="main-content">
        {/* Hero */}
        <section className="bg-grid border-b-2 border-border py-16 md:py-20">
          <div className="container">
            <div className="mb-3 font-mono text-xs tracking-widest text-primary">
              // FEATURES
            </div>
            <h1 className="display-heading max-w-3xl text-4xl font-black leading-[0.96] tracking-tighter md:text-6xl lg:text-7xl">
              EVERY CAPABILITY,
              <br />
              <span className="text-gradient-brand">ONE API</span>
              <span className="text-primary">.</span>
            </h1>
            <p className="mt-6 max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
              Real-time prices, Doppler phase data, recent sales, multi-year
              candlesticks, item analytics, technical indicators, and an
              arbitrage scanner — all behind one REST API across 40+
              marketplaces.
            </p>
          </div>
        </section>

        {/* The 8-card features grid */}
        <FeaturesGrid />

        {/* Next-step links */}
        <section className="border-t-2 border-border py-16 md:py-20">
          <div className="container">
            <div className="mb-3 font-mono text-xs tracking-widest text-primary">
              // NEXT STEPS
            </div>
            <h2 className="display-heading mb-10 text-3xl font-black leading-none tracking-tighter md:text-5xl">
              KEEP <span className="text-gradient-brand">EXPLORING</span>.
            </h2>
            <div className="grid grid-cols-1 gap-px bg-border border-2 border-border md:grid-cols-3">
              {NEXT_STEP_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex flex-col gap-3 bg-card p-6 transition-colors hover:bg-secondary/40"
                >
                  <span className="font-mono text-sm font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
                    {l.label}
                  </span>
                  <p className="font-mono text-sm leading-6 text-muted-foreground">
                    {l.desc}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider text-primary">
                    EXPLORE
                    <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterSection showApiLink={true} />
    </>
  );
}
