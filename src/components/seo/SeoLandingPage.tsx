import Link from "next/link";
import {
  Database,
  Clock,
  BarChart3,
  FileJson,
  HelpCircle,
  Terminal,
  Globe,
  Braces,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Layers,
  Filter,
  Receipt,
  CandlestickChart,
  Package,
  Boxes,
  Activity,
  Wallet,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  StructuredData,
  buildFAQPage,
} from "@/components/seo/StructuredData";
import type { SeoPageConfig, SeoDataPoint, SeoUseCase, SeoFaqItem } from "@/lib/seo/landing-pages";
import { getPageBySlug, getPagesByType } from "@/lib/seo/landing-pages";
import { getSeoCodeExample } from "@/lib/seo/code-examples";
import { serverApi } from "@/lib/api/server";
import { formatCompact } from "@/lib/api";
import type { ProviderInfo } from "@/lib/api/types";
import { RelativeTime } from "@/components/RelativeTime";
import {
  pickPrimaryFee,
  formatFee,
  FEE_LABELS,
  normalizeMarketType,
  statusDotClass,
} from "@/components/marketplaces/marketplaces-utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Database,
  Clock,
  BarChart3,
  FileJson,
  Terminal,
  Globe,
  Braces,
  DollarSign,
  TrendingUp,
  Layers,
  Filter,
  Receipt,
  CandlestickChart,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Database;
}

function deriveProviderKey(slug: string): string {
  return slug.replace(/-api$/, "");
}

function findProvider(providers: ProviderInfo[], key: string): ProviderInfo | undefined {
  const lower = key.toLowerCase();
  return providers.find(
    (p) => (p.key ?? "").toLowerCase() === lower || (p.code ?? "").toLowerCase() === lower,
  );
}

// Deterministic, order-preserving window over `arr`. The start offset is
// derived from `seed` so different source pages link to different (but stable)
// neighbours, spreading internal link equity without random shuffling.
function rotatedSlice<T>(arr: T[], seed: string, count: number): T[] {
  if (arr.length === 0) return [];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  const offset = Math.abs(h) % arr.length;
  const out: T[] = [];
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    out.push(arr[(offset + i) % arr.length]);
  }
  return out;
}

function formatUsdCents(valueCents: number | null | undefined): string {
  if (valueCents == null) return "N/A";
  // API returns total_value_usd in cents.
  const dollars = valueCents / 100;
  if (dollars >= 1000) {
    return "$" + formatCompact(dollars);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(dollars);
}

function formatPct(value: number | null | undefined): string {
  if (value == null) return "N/A";
  // API returns market_coverage already as a percent (0-100).
  return `${value.toFixed(1)}%`;
}

/* ---------- Default fallback content ---------- */

const defaultDataPoints: SeoDataPoint[] = [
  { icon: "Database", label: "REAL-TIME PRICING" },
  { icon: "Clock", label: "HISTORICAL DATA" },
  { icon: "BarChart3", label: "MARKET ANALYTICS" },
  { icon: "FileJson", label: "ITEM CATALOG" },
];

const defaultUseCases: SeoUseCase[] = [
  { icon: "Terminal", title: "TRADING AUTOMATION", desc: "Build bots and tools that respond to market data in real time." },
  { icon: "Globe", title: "PRICE COMPARISON", desc: "Compare prices across marketplaces in a single query." },
  { icon: "Braces", title: "DATA ANALYSIS", desc: "Analyze historical trends, spreads, and volume over time." },
  { icon: "BarChart3", title: "PORTFOLIO TRACKING", desc: "Track inventory values and monitor market movements." },
];

const defaultFaqs: SeoFaqItem[] = [
  { q: "How do I get started?", a: "Sign up for a free account, generate an API key, and start making requests. Full documentation is available in the API reference." },
  { q: "What data formats are supported?", a: "All endpoints return JSON. Request and response schemas are documented in the OpenAPI specification." },
  { q: "Is there a free tier?", a: "Yes. Sign in to see available plans and rate limits for each tier." },
];

export async function SeoLandingPage({ config }: { config: SeoPageConfig }) {
  const content = config.content;
  const introText = content?.intro ?? config.description;
  const dataPoints = content?.dataPoints ?? defaultDataPoints;
  const useCases = content?.useCases ?? defaultUseCases;
  const faqs = content?.faqs ?? defaultFaqs;
  const hasRichContent = !!content;


  const relatedProviderPages = content?.relatedProviders
    ?.map((slug) => getPageBySlug(slug))
    .filter((p): p is SeoPageConfig => p != null);

  // For "general" SEO pages, surface a randomized set of feature + market pages
  // as a bottom CTA for internal linking.
  const generalCtaFeaturePages =
    config.type === "general"
      ? rotatedSlice(getPagesByType("feature"), config.slug + ":f", 6)
      : [];
  const generalCtaMarketPages =
    config.type === "general"
      ? rotatedSlice(getPagesByType("market"), config.slug + ":m", 8)
      : [];

  // For market pages, surface other market pages for internal linking.
  const otherMarketPages =
    config.type === "market"
      ? rotatedSlice(
          getPagesByType("market").filter((p) => p.slug !== config.slug),
          config.slug + ":om",
          12,
        )
      : [];

  // For market pages, fetch live provider health stats for the hero panel.
  let providerHealth: ProviderInfo | undefined;
  if (config.type === "market") {
    try {
      const providers = await serverApi.getProviders(300);
      providerHealth = findProvider(providers, deriveProviderKey(config.slug));
    } catch {
      providerHealth = undefined;
    }
  }

  const primaryFee = providerHealth ? pickPrimaryFee(providerHealth.fees) : null;

  const heroStats: { icon: LucideIcon; value: string; label: string; sub?: string }[] | null =
    providerHealth
      ? [
          {
            icon: Package,
            value: formatCompact(providerHealth.health.total_offers),
            label: "TOTAL OFFERS",
          },
          {
            icon: Boxes,
            value: formatCompact(providerHealth.health.unique_items),
            label: "UNIQUE ITEMS",
          },
          {
            icon: Activity,
            value: formatPct(providerHealth.health.market_coverage),
            label: "MARKET COVERAGE",
          },
          {
            icon: Wallet,
            value: formatUsdCents(providerHealth.health.total_value_usd),
            label: "TOTAL VALUE",
          },
          // Fee + market-type tiles are appended as a pair so the 2-col grid stays even.
          ...(primaryFee
            ? [
                {
                  icon: Receipt,
                  value: formatFee(primaryFee.value),
                  label: FEE_LABELS[primaryFee.key].toUpperCase(),
                  sub: `YOU KEEP ${formatFee(1 - primaryFee.value)}`,
                },
                {
                  icon: Layers,
                  value: normalizeMarketType(providerHealth.market_type),
                  label: "MARKET TYPE",
                },
              ]
            : []),
        ]
      : null;

  // For feature pages, render an OpenAPI-derived code example in the hero.
  const codeExample = config.type === "feature" ? getSeoCodeExample(config.slug) : undefined;

  const hasHeroAside = Boolean(heroStats || codeExample);

  const hub =
    config.type === "market"
      ? { name: "Marketplaces", href: "/marketplaces" }
      : { name: "APIs", href: "/apis" };

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          hub,
          { name: config.h1, href: config.canonicalPath },
        ]}
      />
      {faqs.length > 0 && <StructuredData data={buildFAQPage(faqs)} />}
      {/* Hero */}
      <section className="relative overflow-x-clip bg-grid pb-20 pt-10 md:pb-28 md:pt-12">
        <div className="absolute top-20 right-20 h-40 w-40 rotate-12 border-2 border-primary/10" />
        <div className="absolute top-1/3 right-1/4 h-2 w-2 animate-pulse-glow bg-primary" />
        <div className="container relative z-10">
          <div className={hasHeroAside ? "grid items-center gap-12 lg:grid-cols-2" : ""}>
            <div className={hasHeroAside ? "" : "max-w-2xl"}>
              <div className="mb-6 flex items-center gap-3 animate-fade-in-up-sm">
                <Database className="h-5 w-5 text-primary" />
                <span className="font-mono text-xs tracking-widest text-primary">
                  // {config.type.toUpperCase()}
                </span>
              </div>
              <h1 className="display-heading mb-6 text-4xl font-black tracking-tighter sm:text-5xl md:text-7xl animate-fade-in-up-sm" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
                {(() => {
                  const words = config.h1.trim().split(/\s+/);
                  if (words.length === 1) {
                    return <span className="glow-text text-gradient-brand">{words[0]}</span>;
                  }
                  const lead = words.slice(0, -1).join(" ");
                  const last = words[words.length - 1];
                  return (
                    <>
                      <span className="text-foreground">{lead} </span>
                      <span className="glow-text text-gradient-brand">{last}</span>
                    </>
                  );
                })()}
              </h1>
              <p className="mb-8 max-w-lg font-mono text-sm leading-relaxed text-muted-foreground animate-fade-in-up-sm" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
                {introText}
              </p>
              <div className="flex flex-col gap-3 animate-fade-in-up-sm sm:flex-row sm:flex-wrap" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
                {content?.heroCtaUrl ? (
                  <a
                    href={content.heroCtaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-primary bg-primary px-8 py-3 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover inline-flex items-center justify-center gap-2"
                  >
                    VIEW API REFERENCE
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-label="Opens in new tab" />
                  </a>
                ) : (
                  <Link
                    href="/api-info"
                    className="border-2 border-primary bg-primary px-8 py-3 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover text-center"
                  >
                    VIEW API REFERENCE →
                  </Link>
                )}
                <Link
                  href="/account"
                  className="border-brutal px-8 py-3 font-mono text-sm font-bold tracking-wider text-foreground brutalist-hover hover:border-primary transition-colors text-center"
                >
                  GET ACCESS
                </Link>
              </div>
            </div>

            {heroStats && (
              <div>
                <div className="grid grid-cols-2 gap-px bg-border">
                  {heroStats.map((stat, i) => (
                    <div
                      key={stat.label}
                      className="bg-card p-5 md:p-6 animate-fade-in-up-sm"
                      style={{ animationDelay: `${0.3 + i * 0.08}s`, animationFillMode: "both" }}
                    >
                      <stat.icon className="mb-3 h-4 w-4 text-primary" strokeWidth={1.5} />
                      <div className="font-mono text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="font-mono text-xs tracking-widest text-muted-foreground">
                        {stat.label}
                      </div>
                      {stat.sub && (
                        <div className="mt-1 font-mono text-[10px] tracking-wider text-muted-foreground/70">
                          {stat.sub}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {providerHealth?.health?.last_checked_at && (
                  <div className="mt-3 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(providerHealth.health.status)}`}
                    />
                    <span>synced</span>
                    <RelativeTime value={providerHealth.health.last_checked_at} />
                  </div>
                )}
              </div>
            )}

            {codeExample && (
              <div
                className="min-w-0 border-brutal bg-card animate-fade-in-up-sm"
                style={{ animationDelay: "0.3s", animationFillMode: "both" }}
              >
                <div className="flex min-w-0 items-center gap-2 border-b-2 border-border px-4 py-2">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-destructive/60" />
                  <div className="h-2 w-2 shrink-0 rounded-full bg-warning/60" />
                  <div className="h-2 w-2 shrink-0 rounded-full bg-success/60" />
                  <span className="ml-2 min-w-0 truncate font-mono text-xs text-muted-foreground">
                    {codeExample.method} {codeExample.path}
                  </span>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-muted-foreground">
                  <code>{`curl https://api.cs2c.app${codeExample.path}\n\n${codeExample.response}`}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Purpose (rich pages only) */}
      {hasRichContent && content.purposeHeading && (
        <section className="border-t-2 border-border py-16">
          <div className="container">
            <div className="mb-2 font-mono text-xs tracking-widest text-primary">
              // OVERVIEW
            </div>
            <h2 className="mb-6 text-3xl font-black tracking-tighter md:text-4xl">
              {(() => {
                const words = content.purposeHeading.trim().split(/\s+/);
                if (words.length === 1) {
                  return <span className="text-primary">{words[0]}</span>;
                }
                const lead = words.slice(0, -1).join(" ");
                const last = words[words.length - 1];
                return (
                  <>
                    {lead} <span className="text-primary">{last}</span>
                  </>
                );
              })()}
            </h2>
            <p className="max-w-3xl font-mono text-sm leading-relaxed text-muted-foreground">
              {content.purposeText}
            </p>
          </div>
        </section>
      )}

      {/* Supported Data */}
      <section className="border-t-2 border-border py-16">
        <div className="container">
          <div className="mb-2 font-mono text-xs tracking-widest text-primary">
            // SUPPORTED DATA
          </div>
          <h2 className="mb-10 text-3xl font-black tracking-tighter md:text-4xl">
            WHAT&apos;S <span className="text-primary">INCLUDED</span>
          </h2>
          <div className={`grid grid-cols-1 gap-px bg-border md:grid-cols-2 ${dataPoints.length > 4 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            {dataPoints.map((item) => {
              const Icon = resolveIcon(item.icon);
              return (
                <div
                  key={item.label}
                  className="bg-card p-6 transition-colors hover:bg-secondary/30"
                >
                  <Icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
                  <h3 className="font-mono text-xs font-bold tracking-wider text-foreground">
                    {item.label}
                  </h3>
                  {item.description && (
                    <p className="mt-2 font-mono text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t-2 border-border py-16">
        <div className="container">
          <div className="mb-2 font-mono text-xs tracking-widest text-primary">
            // USE CASES
          </div>
          <h2 className="mb-10 text-3xl font-black tracking-tighter md:text-4xl">
            WHAT YOU CAN <span className="text-primary">BUILD</span>
          </h2>
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
            {useCases.map((item) => {
              const Icon = resolveIcon(item.icon);
              return (
                <div
                  key={item.title}
                  className="bg-card p-6 transition-colors hover:bg-secondary/30"
                >
                  <Icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
                  <h3 className="mb-2 font-mono text-xs font-bold tracking-wider text-foreground">
                    {item.title}
                  </h3>
                  <p className="font-mono text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t-2 border-border bg-grid-dense py-16">
        <div className="container">
          <div className="mb-2 font-mono text-xs tracking-widest text-primary">// FAQ</div>
          <h2 className="mb-10 text-3xl font-black tracking-tighter md:text-4xl">
            COMMON <span className="text-primary">QUESTIONS</span>
          </h2>
          <div className="max-w-3xl space-y-px bg-border">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-card p-6">
                <div className="mb-2 flex items-start gap-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                  <h3 className="font-mono text-sm font-bold text-foreground">{faq.q}</h3>
                </div>
                <p className="pl-7 font-mono text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related providers (rich pages only) */}
      {relatedProviderPages && relatedProviderPages.length > 0 && (
        <section className="border-t-2 border-border py-16">
          <div className="container">
            <div className="mb-2 font-mono text-xs tracking-widest text-primary">
              // MARKETPLACES
            </div>
            <h2 className="mb-6 text-2xl font-black tracking-tighter md:text-3xl">
              RELATED <span className="text-primary">PROVIDERS</span>
            </h2>
            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
              {relatedProviderPages.map((p) => (
                <Link
                  key={p.slug}
                  href={p.canonicalPath}
                  className="bg-card px-4 py-3 font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:bg-secondary/30 hover:text-primary"
                >
                  {p.h1}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.type === "general" && (generalCtaFeaturePages.length > 0 || generalCtaMarketPages.length > 0) && (
        <section className="border-t-2 border-border py-16">
          <div className="container space-y-10">
            {generalCtaFeaturePages.length > 0 && (
              <div>
                <div className="mb-2 font-mono text-xs tracking-widest text-primary">
                  // EXPLORE
                </div>
                <h2 className="mb-6 text-2xl font-black tracking-tighter md:text-3xl">
                  FEATURE <span className="text-primary">APIs</span>
                </h2>
                <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
                  {generalCtaFeaturePages.map((p) => (
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
            )}

            {generalCtaMarketPages.length > 0 && (
              <div>
                <div className="mb-2 font-mono text-xs tracking-widest text-primary">
                  // MARKETPLACES
                </div>
                <h2 className="mb-6 text-2xl font-black tracking-tighter md:text-3xl">
                  MARKETPLACE <span className="text-primary">APIs</span>
                </h2>
                <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
                  {generalCtaMarketPages.map((p) => (
                    <Link
                      key={p.slug}
                      href={p.canonicalPath}
                      className="bg-card px-4 py-3 font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:bg-secondary/30 hover:text-primary"
                    >
                      {p.h1}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {otherMarketPages.length > 0 && (
        <section className="border-t-2 border-border py-16">
          <div className="container">
            <div className="mb-2 font-mono text-xs tracking-widest text-primary">
              // EXPLORE
            </div>
            <h2 className="mb-6 text-2xl font-black tracking-tighter md:text-3xl">
              OTHER <span className="text-primary">MARKETPLACES</span>
            </h2>
            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 lg:grid-cols-4">
              {otherMarketPages.map((p) => (
                <Link
                  key={p.slug}
                  href={p.canonicalPath}
                  className="bg-card px-4 py-3 font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:bg-secondary/30 hover:text-primary"
                >
                  {p.h1}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t-2 border-border py-24">
        <div className="container text-center">
          <h2 className="mb-6 text-4xl font-black tracking-tighter md:text-6xl">
            READY TO
            <br />
            <span className="text-gradient-brand">INTEGRATE?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-md font-mono text-sm text-muted-foreground">
            Explore the full API reference, endpoints, and pricing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/api-info"
              className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-12 py-4 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover"
            >
              API REFERENCE <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/account"
              className="border-brutal px-12 py-4 font-mono text-sm font-bold tracking-wider text-foreground brutalist-hover hover:border-primary transition-colors"
            >
              GET ACCESS
            </Link>
          </div>
        </div>
      </section>

      <FooterSection />
    </>
  );
}
