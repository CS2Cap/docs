import { PublicLayout } from "@/components/PublicLayout";
import { Link } from "react-router-dom";
import { ArrowRight, Code, Zap, Database, Lock } from "lucide-react";

const endpointCategories = [
  { title: "Items", description: "Search, filter, and retrieve item data across the CS2 catalog.", count: "6 endpoints" },
  { title: "Pricing", description: "Current and historical price data from multiple providers.", count: "4 endpoints" },
  { title: "Market", description: "Aggregated market stats including volume, asks, bids, and sales.", count: "5 endpoints" },
  { title: "Providers", description: "Provider-specific data and availability info.", count: "3 endpoints" },
];

export default function ApiLanding() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(187_85%_53%/0.06)_0%,transparent_50%)]" />
        <div className="container relative py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Code size={12} className="text-primary" />
              Developer API
            </div>
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
              CS2 market data,
              <span className="text-gradient"> delivered via API</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Programmatic access to item search, pricing, and market analytics. Build tools, bots, or dashboards on top of CS2Cap data.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/docs/getting-started"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Get Started
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/30">
        <div className="container py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, title: "Fast Responses", desc: "Low-latency JSON API with consistent response times." },
              { icon: Database, title: "Comprehensive Data", desc: "80,000+ items with pricing from multiple providers." },
              { icon: Lock, title: "Authenticated Access", desc: "API key-based auth with usage-based rate limits." },
              { icon: Code, title: "Simple Integration", desc: "RESTful design with clear, predictable endpoints." },
            ].map((f) => (
              <div key={f.title} className="flex gap-3">
                <f.icon size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request example */}
      <section className="container py-16">
        <div className="grid gap-8 lg:grid-cols-2 items-start">
          <div>
            <h2 className="text-2xl font-bold">Simple request, structured response</h2>
            <p className="mt-3 text-muted-foreground">
              Retrieve item data with a single API call. Responses are structured JSON with consistent field naming.
            </p>
            <div className="mt-6 space-y-3">
              {endpointCategories.map((cat) => (
                <div key={cat.title} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{cat.title}</h3>
                    <span className="text-xs text-muted-foreground">{cat.count}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">GET</span>
              <code className="text-xs text-muted-foreground">/api/v1/items/ak47-redline</code>
            </div>
            <pre className="overflow-x-auto p-4 text-xs text-muted-foreground">
{`{
  "id": "ak47-redline",
  "name": "AK-47 | Redline",
  "weapon": "AK-47",
  "skin": "Redline",
  "rarity": "Classified",
  "wear": "Field-Tested",
  "prices": {
    "lowest_ask": 12.50,
    "highest_bid": 11.80,
    "last_sale": 12.34
  },
  "volume_24h": 2690,
  "updated_at": "2026-03-30T12:00:00Z"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold">Ready to build?</h2>
          <p className="mt-3 text-muted-foreground">
            Sign up, grab an API key, and start making requests in minutes.
          </p>
          <div className="mt-6">
            <Link
              to="/docs/getting-started"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Read the Quickstart
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
