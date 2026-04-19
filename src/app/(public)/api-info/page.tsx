import type { Metadata } from "next";
import Link from "next/link";
import {
  Code,
  Database,
  Shield,
  Clock,
  Activity,
  Terminal,
  Braces,
  Globe,
  BadgeDollarSign,
  CandlestickChart,
  Layers3,
  Zap,
  KeyRound,
  FileJson,
  PackageOpen,
  AlertTriangle,
  Gauge,
  BookOpen,
} from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { PricingPlans } from "@/components/PricingPlans";
import { StructuredData, buildBreadcrumbList, buildWebApplication } from "@/components/seo/StructuredData";
import { getApiInfoPageData } from "@/lib/api/compositions";
import { serverApi } from "@/lib/api/server";
import { getPagesByType } from "@/lib/seo/landing-pages";

export const metadata: Metadata = {
  title: "CS2 API Documentation — Endpoints, Pricing & Integration Guide",
  description:
    "Complete API reference for CS2Cap. REST endpoints for real-time prices, buy orders, sales, candlestick charts, and arbitrage detection across 39+ CS2 skin marketplaces.",
  alternates: { canonical: "/api-info" },
};

const useCases = [
  {
    icon: Terminal,
    title: "TRADING BOTS",
    desc: "Automate cross-marketplace trading with real-time price feeds and arbitrage detection.",
  },
  {
    icon: Activity,
    title: "ANALYTICS DASHBOARDS",
    desc: "Build custom dashboards with historical data, candlesticks, and technical indicators.",
  },
  {
    icon: Globe,
    title: "COMPARISON TOOLS",
    desc: "Show users the best deals across 39 marketplaces in your app or extension.",
  },
  {
    icon: Braces,
    title: "SPREADSHEETS & TRACKERS",
    desc: "Track inventory values over time with Steam integration and historical pricing.",
  },
] as const;

const developerHighlights = [
  {
    icon: KeyRound,
    title: "SIMPLE AUTH",
    desc: "Bearer token authentication. Get your key and start making requests in seconds.",
  },
  {
    icon: FileJson,
    title: "CONSISTENT FORMAT",
    desc: "Every endpoint returns clean, well-documented JSON with consistent naming conventions.",
  },
  {
    icon: PackageOpen,
    title: "BATCH & BULK REQUESTS",
    desc: "Fetch a full or targeted snapshot of the most recent market data. Cache what you need and serve it.",
  },
  {
    icon: AlertTriangle,
    title: "ERROR HANDLING",
    desc: "Structured error responses with codes, messages, and suggestions for resolution.",
  },
  {
    icon: Gauge,
    title: "RATE LIMIT HEADERS",
    desc: "Clear rate limit headers on every response so you always know your remaining quota.",
  },
  {
    icon: BookOpen,
    title: "SPEC-DRIVEN",
    desc: "Endpoint list generated from OpenAPI. What you see ships.",
  },
] as const;

const apiSectionIcons: Record<string, typeof Database> = {
  Pricing: BadgeDollarSign,
  Trading: CandlestickChart,
  "Market Intelligence": CandlestickChart,
  Catalog: Layers3,
  Other: Database,
};

export default async function ApiPage() {
  const [apiInfo, providers, metadata, plans] = await Promise.all([
    getApiInfoPageData(),
    serverApi.getProviders(300),
    serverApi.getItemsMetadata(300),
    serverApi.getBillingPlans(300),
  ]);

  return (
    <>
      <StructuredData
        data={buildBreadcrumbList([
          { name: "Home", url: "https://cs2cap.com" },
          { name: "API Reference", url: "https://cs2cap.com/api-info" },
        ])}
      />
      <StructuredData data={buildWebApplication()} />
      <section className="relative overflow-hidden bg-grid py-20 md:py-28">
        <div className="absolute top-20 right-20 h-40 w-40 rotate-12 border-2 border-primary/10" />
        <div className="absolute bottom-10 right-40 h-24 w-24 -rotate-6 border-2 border-primary/5" />
        <div className="absolute top-1/3 right-1/4 h-2 w-2 animate-pulse-glow bg-primary" />

        <div className="container relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex items-center gap-3 animate-fade-in-up-sm">
                <Code className="h-5 w-5 text-primary" />
                <span className="font-mono text-xs tracking-widest text-primary">// API</span>
              </div>
              <h1
                className="display-heading mb-6 text-5xl font-black tracking-tighter md:text-7xl animate-fade-in-up-sm"
                style={{ animationDelay: "0.05s", animationFillMode: "both" }}
              >
                <span className="text-foreground">BUILD WITH</span>
                <br />
                <span className="glow-text text-gradient-brand">CS2CAP</span>
              </h1>
              <p
                className="mb-8 max-w-lg font-mono text-sm leading-relaxed text-muted-foreground animate-fade-in-up-sm"
                style={{ animationDelay: "0.15s", animationFillMode: "both" }}
              >
                RESTful API delivering real-time market data from all CS2 marketplaces. Webhooks callbacks, streaming
                feed, candlestick charts, arbitrage detection, and full historical data. <br></br>One single
                integration.
              </p>

              <div
                className="mb-10 flex flex-wrap gap-3 animate-fade-in-up-sm"
                style={{ animationDelay: "0.25s", animationFillMode: "both" }}
              >
                <Link
                  href="/login"
                  className="border-2 border-primary bg-primary px-8 py-3 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover"
                >
                  GET ACCESS →
                </Link>
                <a
                  href="#endpoints"
                  className="border-brutal px-8 py-3 font-mono text-sm font-bold tracking-wider text-foreground brutalist-hover hover:border-primary transition-colors"
                >
                  EXPLORE ENDPOINTS
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border">
              {[
                {
                  icon: Zap,
                  value: "<50ms",
                  label: "ENDPOINTS",
                  sub: "In the spec",
                },
                {
                  icon: Database,
                  value: providers.length.toLocaleString(),
                  label: "MARKETPLACES",
                  sub: "CFloat, BUFF163, Youpin...",
                },
                {
                  icon: Shield,
                  value: "99.9%",
                  label: "UPTIME SLA",
                  sub: "Enterprise-grade reliability",
                },
                {
                  icon: Clock,
                  value: "5m",
                  label: "MIN INTERVAL",
                  sub: "Candlestick granularity",
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="bg-card p-5 md:p-6 animate-fade-in-up-sm"
                  style={{ animationDelay: `${0.3 + i * 0.08}s`, animationFillMode: "both" }}
                >
                  <stat.icon className="mb-3 h-4 w-4 text-primary" strokeWidth={1.5} />
                  <div className="font-mono text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="font-mono text-[10px] tracking-widest text-muted-foreground">{stat.label}</div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground/70">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t-2 border-border py-16">
        <div className="container">
          <div className="mb-2 font-mono text-xs tracking-widest text-primary">// USE CASES</div>
          <h2 className="mb-10 text-3xl font-black tracking-tighter md:text-4xl">
            WHAT YOU CAN <span className="text-primary">BUILD</span>
          </h2>

          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="bg-card p-6 transition-colors hover:bg-secondary/30">
                <useCase.icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="mb-2 font-mono text-xs font-bold tracking-wider text-foreground">{useCase.title}</h3>
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t-2 border-border py-16">
        <div className="container">
          <div className="mb-2 font-mono text-xs tracking-widest text-primary">// DEVELOPER EXPERIENCE</div>
          <h2 className="mb-10 text-3xl font-black tracking-tighter md:text-4xl">
            SIMPLE <span className="text-primary">INTEGRATION</span>
          </h2>

          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
            {developerHighlights.map((item) => (
              <div key={item.title} className="bg-card p-8 transition-colors hover:bg-secondary/30">
                <item.icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="mb-2 font-mono text-xs font-bold tracking-wider text-foreground">{item.title}</h3>
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="endpoints" className="border-t-2 border-border bg-grid-dense py-16">
        <div className="container">
          <div className="mb-2 font-mono text-xs tracking-widest text-primary">// EXAMPLES</div>
          <h2 className="mb-10 text-3xl font-black tracking-tighter md:text-4xl">
            API <span className="text-primary">REFERENCE</span>
          </h2>

          <div className="max-w-6xl space-y-6">
            {apiInfo.categories.map((category) => (
              <div key={category.title} className="border-brutal bg-card">
                <div className="flex items-center gap-3 border-b-2 border-border px-4 py-3">
                  {(() => {
                    const SectionIcon = apiSectionIcons[category.title] ?? Database;
                    return <SectionIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />;
                  })()}
                  <span className="font-mono text-[10px] tracking-widest text-foreground">
                    {category.title.toUpperCase()}
                  </span>
                </div>
                {category.endpoints.map((endpoint, index) => (
                  <div
                    key={`${endpoint.method}-${endpoint.path}`}
                    className={`px-4 py-4 ${index !== category.endpoints.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 bg-primary/20 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-primary">
                        {endpoint.method}
                      </span>
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-bold text-foreground">{endpoint.path}</div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{endpoint.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t-2 border-border bg-grid py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <div className="mb-2 font-mono text-xs tracking-widest text-primary">// PRICING</div>
            <h2 className="mb-4 text-3xl font-black tracking-tighter md:text-5xl">
              LIVE <span className="text-primary">PLANS</span>
            </h2>
            <p className="mx-auto max-w-lg font-mono text-sm text-muted-foreground">Pick a tier. Start building.</p>
          </div>

          {plans?.plans.length ? (
            <PricingPlans plans={plans.plans} />
          ) : (
            <div className="mx-auto max-w-2xl border-brutal bg-card p-8 text-center">
              <div className="font-mono text-sm text-muted-foreground">
                Sign in to see available plans and your current tier.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Internal SEO link sections */}
      <section className="border-t-2 border-border py-16">
        <div className="container space-y-12">
          <div>
            <div className="mb-2 font-mono text-xs tracking-widest text-primary">// FEATURES</div>
            <h2 className="mb-6 text-2xl font-black tracking-tighter md:text-3xl">
              FEATURE <span className="text-primary">APIs</span>
            </h2>
            <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
              {getPagesByType("feature").map((p) => (
                <Link
                  key={p.slug}
                  href={p.canonicalPath}
                  className="bg-card px-5 py-4 font-mono text-xs font-bold tracking-wider text-foreground transition-colors hover:bg-secondary/30 hover:text-primary"
                >
                  {p.h1} →
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-xs tracking-widest text-primary">// MARKETPLACES</div>
            <h2 className="mb-6 text-2xl font-black tracking-tighter md:text-3xl">
              MARKETPLACE <span className="text-primary">APIs</span>
            </h2>
            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
              {getPagesByType("market").map((p) => (
                <Link
                  key={p.slug}
                  href={p.canonicalPath}
                  className="bg-card px-4 py-3 font-mono text-[11px] tracking-wider text-muted-foreground transition-colors hover:bg-secondary/30 hover:text-primary"
                >
                  {p.h1}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t-2 border-border py-24">
        <div className="container text-center">
          <h2 className="mb-6 text-4xl font-black tracking-tighter md:text-6xl">
            READY TO
            <br />
            <span className="text-gradient-brand">INTEGRATE?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-md font-mono text-sm text-muted-foreground">
            {metadata?.catalog.total_items.toLocaleString() ?? 0} items, {providers.length} markets, one API.
          </p>
          <Link
            href="/login"
            className="inline-block border-2 border-primary bg-primary px-12 py-4 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover"
          >
            GET ACCESS →
          </Link>
        </div>
      </section>

      <FooterSection showApiLink={true} />
    </>
  );
}
