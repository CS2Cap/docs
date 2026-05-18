import type { Metadata } from "next";
import Link from "next/link";
import {
  Code,
  Database,
  Shield,
  Clock,
  Activity,
  Terminal,
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
  Braces,
  CheckCircle2,
} from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { PricingPlans } from "@/components/PricingPlans";
import { StructuredData, buildBreadcrumbList, buildSoftwareApplication } from "@/components/seo/StructuredData";
import { getApiInfoPageData } from "@/lib/api/compositions";
import { serverApi } from "@/lib/api/server";
import { getPagesByType } from "@/lib/seo/landing-pages";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function PypiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.007 2.752h5.814v.826H3.898S0 5.789 0 11.969c0 6.18 3.403 5.963 3.403 5.963h2.031v-2.867s-.109-3.402 3.35-3.402h5.769s3.24.052 3.24-3.131V3.129S18.28 0 11.914 0zm-3.21 1.809a1.039 1.039 0 110 2.078 1.039 1.039 0 010-2.078z" />
      <path d="M12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.007-2.752h-5.814v-.826h8.123S24 18.211 24 12.031c0-6.18-3.403-5.963-3.403-5.963h-2.031v2.867s.109 3.402-3.35 3.402H9.447s-3.24-.052-3.24 3.131v5.403S5.72 24 12.086 24zm3.21-1.809a1.039 1.039 0 110-2.078 1.039 1.039 0 010 2.078z" />
    </svg>
  );
}

function NpmMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 7" fill="currentColor" className={className} aria-hidden="true">
      <path d="M0 0h18v6H9V1H7v5H0zm1 5h2V1H1v4zm3-4v4h2V2h1v3h1V1H4zm8 0v4h2V1h-2zm-1 3V1H9v5h4V4h-2z" />
    </svg>
  );
}

export const metadata: Metadata = {
  title: "CS2 API Docs — Endpoints, Pricing & Free Tier",
  description:
    "The full CS2Cap API reference: REST endpoints for CS2 & CS:GO skin prices, buy orders, sales, and arbitrage across 39+ marketplaces. Free tier included.",
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

  const paidPlans = plans?.plans.filter((p) => p.code.toLowerCase() !== "free") ?? [];

  return (
    <>
      <StructuredData
        data={buildBreadcrumbList([
          { name: "Home", url: "https://cs2cap.com" },
          { name: "API Reference", url: "https://cs2cap.com/api-info" },
        ])}
      />
      <StructuredData data={buildSoftwareApplication(paidPlans)} />
      <section className="relative overflow-hidden bg-grid py-20 md:py-28">
        <div className="absolute top-20 right-20 h-40 w-40 rotate-12 border-2 border-primary/10" />
        <div className="absolute bottom-10 right-40 h-24 w-24 -rotate-6 border-2 border-primary/5" />
        <div className="absolute top-1/3 right-1/4 h-2 w-2 animate-pulse-glow bg-primary" />

        <div className="container relative z-10">
          <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex items-center gap-3 animate-fade-in-up-sm">
                <Code className="h-5 w-5 text-primary" />
                <span className="font-mono text-xs tracking-widest text-primary">// API</span>
              </div>
              <h1
                className="display-heading mb-6 text-4xl sm:text-5xl font-black tracking-tighter md:text-7xl animate-fade-in-up-sm"
                style={{ animationDelay: "0.05s", animationFillMode: "both" }}
              >
                <span className="text-foreground">BUILD WITH</span>
                <br />
                <span className="glow-text text-gradient-brand">CS2CAP</span>
              </h1>
              <p
                className="mb-8 max-w-lg font-mono text-base leading-relaxed text-foreground animate-fade-in-up-sm"
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
                  className="w-full sm:w-auto text-center border-2 border-primary bg-primary px-8 py-3 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover"
                >
                  GET ACCESS →
                </Link>
                <a
                  href="#endpoints"
                  className="w-full sm:w-auto text-center border-brutal px-8 py-3 font-mono text-sm font-bold tracking-wider text-foreground brutalist-hover hover:border-primary transition-colors"
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
                  label: "AVG LATENCY",
                  sub: "Global edge network",
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
                  label: "TARGET UPTIME",
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
                  className="bg-card p-4 md:p-6 animate-fade-in-up-sm"
                  style={{ animationDelay: `${0.3 + i * 0.08}s`, animationFillMode: "both" }}
                >
                  <stat.icon className="mb-3 h-4 w-4 text-primary" strokeWidth={1.5} />
                  <div className="font-mono text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
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
                <p className="font-mono text-xs leading-relaxed text-foreground">{useCase.desc}</p>
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
                <p className="font-mono text-xs leading-relaxed text-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sdks" className="border-t-2 border-border py-16">
        <div className="container">
          <div className="mb-2 font-mono text-xs tracking-widest text-primary">// OFFICIAL SDKs</div>
          <h2 className="mb-3 text-3xl font-black tracking-tighter md:text-4xl">
            SHIP FASTER WITH OUR <span className="text-primary">LIBRARIES</span>
          </h2>
          <p className="mb-10 max-w-xl font-mono text-sm leading-relaxed text-foreground">
            Skip the boilerplate. Type-safe clients for Python and TypeScript, both maintained in our open-source{" "}
            <a
              href="https://github.com/CS2Cap/SDKs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CS2Cap/SDKs
            </a>{" "}
            monorepo.
          </p>

          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
            {[
              {
                icon: PypiMark,
                title: "PYTHON SDK",
                desc: "Type-safe client for Python 3.9+. Sync and async support, full coverage of every endpoint.",
                install: "pip install cs2cap",
                href: "https://pypi.org/project/cs2cap/",
                label: "VIEW ON PYPI →",
              },
              {
                icon: NpmMark,
                title: "TYPESCRIPT SDK",
                desc: "Fully typed client for Node.js and the browser. Tree-shakeable, zero-config, ESM-first.",
                install: "npm install cs2cap",
                href: "https://www.npmjs.com/package/cs2cap",
                label: "VIEW ON NPM →",
              },
            ].map((sdk) => (
              <div key={sdk.title} className="bg-card p-8 transition-colors hover:bg-secondary/30">
                <sdk.icon className="mb-4 h-5 w-5 text-primary" />
                <h3 className="mb-2 font-mono text-xs font-bold tracking-wider text-foreground">{sdk.title}</h3>
                <p className="mb-5 font-mono text-xs leading-relaxed text-foreground">{sdk.desc}</p>

                <div className="mb-5 border border-border bg-secondary/50 px-3 py-2 font-mono text-xs text-foreground">
                  <span className="text-muted-foreground">$</span> {sdk.install}
                </div>

                <a
                  href={sdk.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-5 py-2.5 font-mono text-[11px] font-bold tracking-wider text-primary-foreground brutalist-hover"
                >
                  {sdk.label}
                </a>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://github.com/CS2Cap/SDKs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-foreground transition-colors hover:text-primary"
            >
              <GithubMark className="h-3.5 w-3.5" />
              VIEW THE FULL CS2CAP/SDKS REPO ON GITHUB →
            </a>
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

          {paidPlans.length ? (
            <>
              <PricingPlans plans={paidPlans} />
              <div className="mx-auto mt-10 max-w-3xl">
                <div className="flex flex-col items-center gap-4 border-2 border-dashed border-border bg-card/50 px-6 py-6 text-center md:flex-row md:justify-between md:px-8 md:text-left">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" strokeWidth={2} />
                    <div>
                      <div className="font-mono text-xs font-bold tracking-wider text-foreground">
                        FREE TIER INCLUDED
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        API access is free. No credit card required to start building.
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/login"
                    className="shrink-0 border-brutal px-5 py-2.5 font-mono text-[11px] font-bold tracking-wider text-foreground brutalist-hover hover:border-primary transition-colors"
                  >
                    GET STARTED FREE →
                  </Link>
                </div>
              </div>
            </>
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
