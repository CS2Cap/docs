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

interface EndpointEntry {
  method: EndpointMethod;
  path: string;
  summary: string;
  auth?: "public" | "key" | "session";
}

interface EndpointGroup {
  heading: string;
  blurb: string;
  endpoints: EndpointEntry[];
}

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    heading: "PRICES",
    blurb: "Live ask data, batch lookup, and historical price series across every supported marketplace.",
    endpoints: [
      { method: "GET", path: "/v1/prices", summary: "Lowest ask and quantity per provider for one or more items.", auth: "key" },
      { method: "POST", path: "/v1/prices", summary: "Same data as GET — useful when query strings would overflow." },
      { method: "POST", path: "/v1/prices/batch", summary: "Bulk prices for up to several hundred items in one call. Cheapest way to fetch a portfolio." },
      { method: "GET", path: "/v1/prices/history", summary: "Historical price snapshots over a time range." },
      { method: "GET", path: "/v1/prices/candles", summary: "OHLCV candlestick data with intervals from 5m up to 1d." },
    ],
  },
  {
    heading: "BUY ORDERS",
    blurb: "Highest bids and order book depth from the 11 marketplaces that expose buy-order data.",
    endpoints: [
      { method: "GET", path: "/v1/bids", summary: "Highest bid and bid count per provider." },
      { method: "POST", path: "/v1/bids", summary: "POST variant for long item-id lists." },
      { method: "POST", path: "/v1/bids/batch", summary: "Bulk bid lookup for many items." },
    ],
  },
  {
    heading: "SALES",
    blurb: "Recent completed sales — price, float, paint seed where available.",
    endpoints: [
      { method: "GET", path: "/v1/sales", summary: "Recent sale records filtered by item, provider, or time window." },
    ],
  },
  {
    heading: "MARKET ANALYTICS",
    blurb: "Cross-marketplace spreads, arbitrage, liquidity, volume, indexes, and momentum indicators.",
    endpoints: [
      { method: "GET", path: "/v1/market/arbitrage", summary: "Profitable price gaps across providers after fees." },
      { method: "GET", path: "/v1/market/indexes", summary: "Aggregate market indexes and basket prices." },
      { method: "GET", path: "/v1/market/items", summary: "Per-item analytics summary across providers (liquidity, spread, 24h volume)." },
      { method: "GET", path: "/v1/market/items/{item_id}", summary: "Same analytics scoped to a single item." },
      { method: "GET", path: "/v1/market/indicators", summary: "Technical indicators (RSI, MA, volatility) computed on price series." },
    ],
  },
  {
    heading: "ITEMS",
    blurb: "Full CS2 / CS:GO item catalog with metadata, wear, rarity, and collection.",
    endpoints: [
      { method: "GET", path: "/v1/items", summary: "Paginated item list with filters by collection, weapon, wear, rarity." },
      { method: "GET", path: "/v1/items/metadata", summary: "Schema metadata: collections, weapons, wear bands, rarities." },
    ],
  },
  {
    heading: "PROVIDERS",
    blurb: "The marketplaces CS2Cap aggregates — fees, currency, supported features.",
    endpoints: [
      { method: "GET", path: "/v1/providers", summary: "List every supported marketplace with metadata and capabilities." },
    ],
  },
  {
    heading: "FX",
    blurb: "Foreign-exchange rates we use to normalize prices into a common currency.",
    endpoints: [
      { method: "GET", path: "/v1/fx", summary: "Current FX rates for every currency CS2Cap quotes." },
    ],
  },
  {
    heading: "INVENTORY",
    blurb: "Steam inventory lookups for portfolio valuation flows.",
    endpoints: [
      { method: "GET", path: "/v1/inventory/steam", summary: "Fetch a public Steam inventory by Steam ID." },
      { method: "GET", path: "/v1/inventory/steam/lookup", summary: "Resolve a vanity URL or profile link to a Steam ID." },
    ],
  },
  {
    heading: "PORTFOLIO",
    blurb: "Authenticated portfolios — track holdings, value over time, and transaction history.",
    endpoints: [
      { method: "GET", path: "/v1/portfolio", summary: "List portfolios for the authenticated account.", auth: "key" },
      { method: "POST", path: "/v1/portfolio", summary: "Create a portfolio.", auth: "key" },
      { method: "DELETE", path: "/v1/portfolio/{id}", summary: "Delete a portfolio.", auth: "key" },
      { method: "POST", path: "/v1/portfolio/{id}/import", summary: "Bulk import items from a Steam inventory or CSV.", auth: "key" },
      { method: "GET", path: "/v1/portfolio/{id}/items", summary: "List items currently held in a portfolio.", auth: "key" },
      { method: "POST", path: "/v1/portfolio/{id}/items", summary: "Add an item to a portfolio.", auth: "key" },
      { method: "DELETE", path: "/v1/portfolio/{id}/items/{item_id}", summary: "Remove an item from a portfolio.", auth: "key" },
      { method: "GET", path: "/v1/portfolio/{id}/history", summary: "Value-over-time series for a portfolio.", auth: "key" },
      { method: "GET", path: "/v1/portfolio/{id}/value", summary: "Current valuation snapshot for a portfolio.", auth: "key" },
      { method: "POST", path: "/v1/portfolio/value", summary: "Value an arbitrary basket of items without persisting it.", auth: "key" },
      { method: "GET", path: "/v1/portfolio/{id}/transactions", summary: "Transaction log for a portfolio.", auth: "key" },
      { method: "POST", path: "/v1/portfolio/{id}/transactions", summary: "Record a transaction.", auth: "key" },
      { method: "PATCH", path: "/v1/portfolio/{id}/transactions/{tx_id}", summary: "Edit a transaction.", auth: "key" },
      { method: "DELETE", path: "/v1/portfolio/{id}/transactions/{tx_id}", summary: "Delete a transaction.", auth: "key" },
    ],
  },
  {
    heading: "ACCOUNT — WATCHLIST & ALERTS",
    blurb: "Per-user watchlist and price-alert primitives.",
    endpoints: [
      { method: "GET", path: "/v1/account/watchlist", summary: "List items the account is watching.", auth: "key" },
      { method: "POST", path: "/v1/account/watchlist", summary: "Add an item to the watchlist.", auth: "key" },
      { method: "DELETE", path: "/v1/account/watchlist/{item_id}", summary: "Remove an item from the watchlist.", auth: "key" },
      { method: "GET", path: "/v1/account/alerts", summary: "List configured price alerts.", auth: "key" },
      { method: "POST", path: "/v1/account/alerts", summary: "Create a price alert.", auth: "key" },
      { method: "POST", path: "/v1/account/alerts/batch", summary: "Create many alerts in one call.", auth: "key" },
      { method: "PATCH", path: "/v1/account/alerts/{id}", summary: "Edit an existing alert.", auth: "key" },
      { method: "DELETE", path: "/v1/account/alerts/{id}", summary: "Delete an alert.", auth: "key" },
      { method: "GET", path: "/v1/account/alerts/events", summary: "Recent alert-trigger events.", auth: "key" },
    ],
  },
  {
    heading: "ACCOUNT — WEBHOOKS",
    blurb: "Outbound webhooks for alert and account events with rotation + delivery logs.",
    endpoints: [
      { method: "GET", path: "/v1/account/webhooks", summary: "List configured webhook endpoints.", auth: "key" },
      { method: "POST", path: "/v1/account/webhooks", summary: "Register a webhook endpoint.", auth: "key" },
      { method: "PATCH", path: "/v1/account/webhooks/{id}", summary: "Update a webhook endpoint.", auth: "key" },
      { method: "DELETE", path: "/v1/account/webhooks/{id}", summary: "Remove a webhook endpoint.", auth: "key" },
      { method: "POST", path: "/v1/account/webhooks/{id}/rotate-secret", summary: "Rotate the signing secret.", auth: "key" },
      { method: "GET", path: "/v1/account/webhooks/deliveries", summary: "Recent webhook delivery attempts.", auth: "key" },
      { method: "GET", path: "/v1/account/webhooks/deliveries/{id}", summary: "Single delivery attempt with payload + response.", auth: "key" },
    ],
  },
  {
    heading: "ACCOUNT — SUB-KEYS",
    blurb: "Issue scoped API keys — useful for multiple environments or delegated access.",
    endpoints: [
      { method: "GET", path: "/v1/account/sub-keys", summary: "List sub-keys on the account.", auth: "key" },
      { method: "POST", path: "/v1/account/sub-keys", summary: "Create a sub-key.", auth: "key" },
      { method: "GET", path: "/v1/account/sub-keys/{id}", summary: "Inspect a single sub-key.", auth: "key" },
      { method: "PATCH", path: "/v1/account/sub-keys/{id}", summary: "Update a sub-key (label, scopes).", auth: "key" },
      { method: "DELETE", path: "/v1/account/sub-keys/{id}", summary: "Revoke a sub-key.", auth: "key" },
      { method: "POST", path: "/v1/account/sub-keys/{id}/reissue", summary: "Reissue a sub-key's secret.", auth: "key" },
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
              <Link href="/api-info" className="text-primary underline-offset-2 hover:underline">
                API docs
              </Link>
              .
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/api-info"
                className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-4 py-2 font-mono text-xs font-bold tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                READ THE DOCS <ArrowRight className="h-3 w-3" />
              </Link>
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
              <div className="mb-2 font-mono text-xs font-bold tracking-widest text-primary">
                {group.heading}{" "}
                <span className="text-muted-foreground">({group.endpoints.length})</span>
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
                      className={`inline-flex w-fit items-center justify-center border px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest ${methodClasses(ep.method)}`}
                    >
                      {ep.method}
                    </span>
                    <code className="font-mono text-xs text-foreground md:text-sm">
                      {ep.path}
                    </code>
                    <p className="font-sans text-sm text-muted-foreground">
                      {ep.summary}
                    </p>
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground md:text-right">
                      {ep.auth === "key" ? "API KEY" : "PUBLIC"}
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
