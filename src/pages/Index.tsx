import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { Search, TrendingUp, BarChart3, ArrowRight, Bell, Eye } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Search,
    title: "Item Search",
    description: "Browse and search across thousands of CS2 items with filters for wear, rarity, weapon type, and more.",
  },
  {
    icon: TrendingUp,
    title: "Price Tracking",
    description: "Track price movements across major marketplaces. View historical candle data and spot trends early.",
  },
  {
    icon: BarChart3,
    title: "Market Analytics",
    description: "Aggregated market data from multiple providers. Compare asks, bids, and recent sales in one place.",
  },
  {
    icon: Eye,
    title: "Watchlists",
    description: "Save items to your watchlist and monitor price changes at a glance from your dashboard.",
  },
  {
    icon: Bell,
    title: "Price Alerts",
    description: "Set alerts for specific items and get notified when prices cross your thresholds.",
  },
];

const stats = [
  { label: "Items Tracked", value: "80,000+" },
  { label: "Providers", value: "5+" },
  { label: "Daily Data Points", value: "2M+" },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(187_85%_53%/0.06)_0%,transparent_60%)]" />
        <div className="container relative py-24 lg:py-36">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              CS2 Market Data
              <span className="block text-gradient">& Analytics</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Search items, track prices, compare providers, and explore the CS2 marketplace — all in one place.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Search size={16} />
                Explore Items
              </Link>
              <Link
                to="/docs/getting-started"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-6 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
              >
                View Docs
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="container py-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Everything you need to navigate the CS2 market</h2>
          <p className="mt-3 text-muted-foreground">
            From casual browsing to serious price tracking, CS2Cap gives you the tools to stay informed.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/20"
            >
              <feature.icon size={24} className="text-primary" />
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Market Preview */}
      <section className="border-t border-border bg-card/30">
        <div className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Live market overview</h2>
            <p className="mt-3 text-muted-foreground">
              A snapshot of trending items and recent price movements across the CS2 marketplace.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "AK-47 | Redline", wear: "Field-Tested", price: "$12.34", change: "+2.1%" },
              { name: "AWP | Asiimov", wear: "Battle-Scarred", price: "$28.90", change: "-0.8%" },
              { name: "M4A4 | Howl", wear: "Minimal Wear", price: "$4,120.00", change: "+5.3%" },
              { name: "Glock-18 | Fade", wear: "Factory New", price: "$890.50", change: "+1.2%" },
            ].map((item) => (
              <Link
                key={item.name}
                to="/search"
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/20"
              >
                <div className="mb-2 h-20 rounded-md bg-secondary/50" />
                <h4 className="text-sm font-semibold">{item.name}</h4>
                <p className="text-xs text-muted-foreground">{item.wear}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{item.price}</span>
                  <span className={`text-xs font-medium ${item.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                    {item.change}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Developer CTA */}
      <section className="container py-20">
        <div className="rounded-xl border border-border bg-card p-8 text-center lg:p-12">
          <h2 className="text-2xl font-bold lg:text-3xl">
            Building something with CS2 data?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            CS2Cap offers a developer API with programmatic access to item data, pricing, and market analytics. Check out the API docs to get started.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/api"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Explore the API
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
