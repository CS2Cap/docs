import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const TITLE = "CS2 API Endpoint Directory — Every Route, Method, and Use";
const DESCRIPTION =
  "Every endpoint in the CS2Cap API: prices, buy orders, sales, candles, items, providers, market analytics, portfolio, inventory, and account.";

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

type EndpointMethod = "GET" | "POST" | "PATCH" | "DELETE";
type EndpointTier = "free" | "starter" | "pro" | "quant";

interface EndpointEntry {
  method: EndpointMethod;
  path: string;
  summary: string;
  tier: EndpointTier;
}

interface EndpointGroup {
  heading: string;
  blurb: string;
  docsUrl: string;
  endpoints: EndpointEntry[];
}

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    heading: "PRICES",
    blurb: "Live ask data, batch lookup, and historical price series across every supported marketplace.",
    docsUrl: "https://docs.cs2cap.com/api-reference/prices",
    endpoints: [
      { method: "GET", path: "/v1/prices", summary: "Lowest ask and quantity per provider.", tier: "free" },
      { method: "POST", path: "/v1/prices", summary: "Stream the entire price feed in one request. Rate limited every 5 minutes. [LARGE RESPONSE]", tier: "pro" },
      { method: "POST", path: "/v1/prices/batch", summary: "Bulk prices for up to 100 items in one call.", tier: "starter" },
      { method: "GET", path: "/v1/prices/history", summary: "Historical price snapshots over a time range.", tier: "pro" },
      { method: "GET", path: "/v1/prices/candles", summary: "OHLCV candlestick data with intervals from 5m up to 1d.", tier: "free" },
    ],
  },
  {
    heading: "BUY ORDERS",
    blurb: "Highest bids and order book depth from the 11 marketplaces that expose buy-order data.",
    docsUrl: "https://docs.cs2cap.com/api-reference/bids",
    endpoints: [
      { method: "GET", path: "/v1/bids", summary: "Highest buy order and bid count per provider.", tier: "starter" },
      { method: "POST", path: "/v1/bids", summary: "Stream the entire buy orders feed in one request. Rate limited every 5 minutes. [LARGE RESPONSE]", tier: "pro" },
      { method: "POST", path: "/v1/bids/batch", summary: "Bulk bid lookup for many items.", tier: "starter" },
    ],
  },
  {
    heading: "SALES",
    blurb: "Recent completed sales — price, float, paint seed where available.",
    docsUrl: "https://docs.cs2cap.com/api-reference/sales",
    endpoints: [
        { method: "GET", path: "/v1/sales", summary: "Recent sales records for an item including timestamp, float value, paint seed, stickers/charms, and inspect link.", tier: "pro" },
      ],
  },
  {
    heading: "MARKET ANALYTICS",
    blurb: "Cross-marketplace spreads, arbitrage, liquidity, volume, indexes, and momentum indicators.",
    docsUrl: "https://docs.cs2cap.com/api-reference/market-analytics",
    endpoints: [
      { method: "GET", path: "/v1/market/arbitrage", summary: "Profitable price gaps across providers after fees.", tier: "quant" },
      { method: "GET", path: "/v1/market/indexes", summary: "Aggregate market indexes and basket prices.", tier: "quant" },
      { method: "GET", path: "/v1/market/items", summary: "Per-item analytics summary across providers (liquidity, spread, 24h volume).", tier: "pro" },
      { method: "GET", path: "/v1/market/items/{item_id}", summary: "Same analytics scoped to a single item.", tier: "pro" },
      { method: "GET", path: "/v1/market/indicators", summary: "Technical indicators (RSI, MA, volatility) computed on price series.", tier: "quant" },
    ],
  },
  {
    heading: "ITEMS",
    blurb: "Full CS2 / CS:GO item catalog with metadata, wear, rarity, and collection.",
    docsUrl: "https://docs.cs2cap.com/api-reference/catalog",
    endpoints: [
      { method: "GET", path: "/v1/items", summary: "Paginated item list with filters by collection, weapon, wear, rarity.", tier: "free" },
      { method: "GET", path: "/v1/items/metadata", summary: "Schema metadata: collections, weapons, wear bands, rarities.", tier: "free" },
    ],
  },
  {
    heading: "PROVIDERS",
    blurb: "The marketplaces CS2Cap aggregates — fees, currency, supported features.",
    docsUrl: "https://docs.cs2cap.com/reference/providers",
    endpoints: [
      { method: "GET", path: "/v1/providers", summary: "List every supported marketplace with metadata and capabilities.", tier: "free" },
    ],
  },
  {
    heading: "FX",
    blurb: "Foreign-exchange rates we use to normalize prices into a common currency.",
    docsUrl: "https://docs.cs2cap.com/fx-currencies.json",
    endpoints: [
      { method: "GET", path: "/v1/fx", summary: "Current FX rates for every currency CS2Cap quotes.", tier: "free" },
    ],
  },
  {
    heading: "INVENTORY",
    blurb: "Steam inventory lookups for portfolio valuation flows.",
    docsUrl: "https://docs.cs2cap.com/api-reference/inventory",
    endpoints: [
      { method: "GET", path: "/v1/inventory/steam", summary: "Fetch a public Steam inventory by Steam ID.", tier: "free" },
      { method: "GET", path: "/v1/inventory/steam/lookup", summary: "Resolve a vanity URL or profile link to a Steam ID.", tier: "free" },
    ],
  },
  {
    heading: "PORTFOLIO",
    blurb: "Authenticated portfolios — track holdings, value over time, and transaction history.",
    docsUrl: "https://docs.cs2cap.com/api-reference/portfolio",
    endpoints: [
      { method: "GET", path: "/v1/portfolio", summary: "List portfolios for the authenticated account.", tier: "free" },
      { method: "POST", path: "/v1/portfolio", summary: "Create a portfolio.", tier: "free" },
      { method: "DELETE", path: "/v1/portfolio/{id}", summary: "Delete a portfolio.", tier: "free" },
      { method: "POST", path: "/v1/portfolio/{id}/import", summary: "Bulk import items from a Steam inventory or CSV.", tier: "free" },
      { method: "GET", path: "/v1/portfolio/{id}/items", summary: "List items currently held in a portfolio.", tier: "free" },
      { method: "POST", path: "/v1/portfolio/{id}/items", summary: "Add an item to a portfolio.", tier: "free" },
      { method: "DELETE", path: "/v1/portfolio/{id}/items/{item_id}", summary: "Remove an item from a portfolio.", tier: "free" },
      { method: "GET", path: "/v1/portfolio/{id}/history", summary: "Value-over-time series for a portfolio.", tier: "free" },
      { method: "GET", path: "/v1/portfolio/{id}/value", summary: "Current valuation snapshot for a portfolio.", tier: "free" },
      { method: "POST", path: "/v1/portfolio/value", summary: "Value an arbitrary basket of items without persisting it.", tier: "free" },
      { method: "GET", path: "/v1/portfolio/{id}/transactions", summary: "Transaction log for a portfolio.", tier: "free" },
      { method: "POST", path: "/v1/portfolio/{id}/transactions", summary: "Record a transaction.", tier: "free" },
      { method: "PATCH", path: "/v1/portfolio/{id}/transactions/{tx_id}", summary: "Edit a transaction.", tier: "free" },
      { method: "DELETE", path: "/v1/portfolio/{id}/transactions/{tx_id}", summary: "Delete a transaction.", tier: "free" },
    ],
  },
  {
    heading: "ACCOUNT — ALERTS",
    blurb: "Per-user price-alert primitives.",
    docsUrl: "https://docs.cs2cap.com/api-reference/alerts",
    endpoints: [
      { method: "GET", path: "/v1/account/alerts", summary: "List configured price alerts.", tier: "pro" },
      { method: "POST", path: "/v1/account/alerts", summary: "Create a price alert.", tier: "pro" },
      { method: "POST", path: "/v1/account/alerts/batch", summary: "Create many alerts in one call.", tier: "pro" },
      { method: "PATCH", path: "/v1/account/alerts/{id}", summary: "Edit an existing alert.", tier: "pro" },
      { method: "DELETE", path: "/v1/account/alerts/{id}", summary: "Delete an alert.", tier: "pro" },
      { method: "GET", path: "/v1/account/alerts/events", summary: "Recent alert-trigger events.", tier: "pro" },
    ],
  },
  {
    heading: "ACCOUNT — WEBHOOKS",
    blurb: "Outbound webhooks for alert and account events with rotation + delivery logs.",
    docsUrl: "https://docs.cs2cap.com/api-reference/webhooks",
    endpoints: [
      { method: "GET", path: "/v1/account/webhooks", summary: "List configured webhook endpoints.", tier: "quant" },
      { method: "POST", path: "/v1/account/webhooks", summary: "Register a webhook endpoint.", tier: "quant" },
      { method: "PATCH", path: "/v1/account/webhooks/{id}", summary: "Update a webhook endpoint.", tier: "quant" },
      { method: "DELETE", path: "/v1/account/webhooks/{id}", summary: "Remove a webhook endpoint.", tier: "quant" },
      { method: "POST", path: "/v1/account/webhooks/{id}/rotate-secret", summary: "Rotate the signing secret.", tier: "quant" },
      { method: "GET", path: "/v1/account/webhooks/deliveries", summary: "Recent webhook delivery attempts.", tier: "quant" },
      { method: "GET", path: "/v1/account/webhooks/deliveries/{id}", summary: "Single delivery attempt with payload + response.", tier: "quant" },
    ],
  },
  {
    heading: "ACCOUNT — SUB-KEYS",
    blurb: "Issue scoped API keys — useful for multiple environments or delegated access.",
    docsUrl: "https://docs.cs2cap.com/api-reference/sub-keys",
    endpoints: [
      { method: "GET", path: "/v1/account/sub-keys", summary: "List sub-keys on the account.", tier: "quant" },
      { method: "POST", path: "/v1/account/sub-keys", summary: "Create a sub-key.", tier: "quant" },
      { method: "GET", path: "/v1/account/sub-keys/{id}", summary: "Inspect a single sub-key.", tier: "quant" },
      { method: "PATCH", path: "/v1/account/sub-keys/{id}", summary: "Update a sub-key (label, scopes).", tier: "quant" },
      { method: "DELETE", path: "/v1/account/sub-keys/{id}", summary: "Revoke a sub-key.", tier: "quant" },
      { method: "POST", path: "/v1/account/sub-keys/{id}/reissue", summary: "Reissue a sub-key's secret.", tier: "quant" },
    ],
  },
];

function methodClasses(method: EndpointMethod): string {
  switch (method) {
    case "GET":
      return "bg-primary/10 text-primary border-primary/30";
    case "POST":
      return "bg-success/10 text-success border-success/30";
    case "PATCH":
      return "bg-warning/10 text-warning border-warning/30";
    case "DELETE":
      return "bg-destructive/10 text-destructive border-destructive/30";
  }
}

const TIER_LABEL: Record<EndpointTier, string> = {
  free: "FREE",
  starter: "STARTER",
  pro: "PRO",
  quant: "QUANT",
};

function tierClasses(tier: EndpointTier): string {
  switch (tier) {
    case "free":
      return "text-muted-foreground";
    case "starter":
      return "text-success";
    case "pro":
      return "text-primary";
    case "quant":
      return "text-warning";
  }
}

const totalEndpoints = ENDPOINT_GROUPS.reduce((acc, g) => acc + g.endpoints.length, 0);

export default function ApisDirectoryPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "APIs", href: "/apis" },
        ]}
      />
      <main>
        <section className="bg-grid py-16 md:py-20">
          <div className="container">
            <div className="mb-6 font-mono text-xs tracking-widest text-primary">
              // API DIRECTORY
            </div>
            <h1 className="display-heading mb-6 text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl">
              <span className="glow-text text-gradient-brand">CS2 API Directory</span>
            </h1>
            <p className="max-w-2xl font-sans text-base leading-relaxed text-muted-foreground">
              Every endpoint in the CS2Cap API, grouped by domain. {totalEndpoints} routes across{" "}
              {ENDPOINT_GROUPS.length} categories. Full schemas, parameters, and examples live in the{" "}
              <a
                href="https://docs.cs2cap.com/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                API docs
              </a>
              .
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://docs.cs2cap.com/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-4 py-2 font-mono text-xs font-bold tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                READ THE DOCS <ArrowRight className="h-3 w-3" />
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 border-2 border-border bg-card px-4 py-2 font-mono text-xs font-bold tracking-widest text-foreground hover:bg-secondary"
              >
                PRICING
              </Link>
            </div>
          </div>
        </section>

        {ENDPOINT_GROUPS.map((group) => (
          <section
            key={group.heading}
            className="border-t-2 border-border py-12 md:py-16"
          >
            <div className="container">
              <div className="mb-2 flex flex-wrap items-center gap-3 font-mono text-xs font-bold tracking-widest text-primary">
                <span>
                  {group.heading}{" "}
                  <span className="text-muted-foreground">({group.endpoints.length})</span>
                </span>
                <a
                  href={group.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs tracking-widest text-primary hover:border-primary hover:bg-primary/20"
                >
                  VIEW DOCS <ArrowRight className="h-3 w-3" />
                </a>
              </div>
              <p className="mb-6 max-w-2xl font-sans text-sm text-muted-foreground">
                {group.blurb}
              </p>
              <div className="border-2 border-border bg-card divide-y-2 divide-border">
                {group.endpoints.map((ep) => (
                  <div
                    key={`${ep.method} ${ep.path}`}
                    className="grid items-center gap-3 px-4 py-3 md:grid-cols-[64px_minmax(0,1fr)_minmax(0,2fr)_72px]"
                  >
                    <span
                      className={`inline-flex w-fit items-center justify-center border px-2 py-0.5 font-mono text-xs font-bold tracking-widest ${methodClasses(ep.method)}`}
                    >
                      {ep.method}
                    </span>
                    <code className="font-mono text-xs text-foreground md:text-sm">
                      {ep.path}
                    </code>
                    <p className="font-sans text-sm text-muted-foreground">
                      {ep.summary}
                    </p>
                    <span
                      className={`font-mono text-xs font-bold tracking-widest md:text-right ${tierClasses(ep.tier)}`}
                    >
                      {TIER_LABEL[ep.tier]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>

      <FooterSection />
    </>
  );
}
