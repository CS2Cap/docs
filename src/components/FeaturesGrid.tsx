import {
  Activity,
  BarChart3,
  TrendingUp,
  Search,
  Layers,
  LineChart,
  Zap,
  GitCompare
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "REAL-TIME PRICES",
    desc: "Lowest ask and highest bid across every market, at a glance.",
    tag: "LIVE",
  },
  {
    icon: Layers,
    title: "DOPPLER PHASES",
    desc: "Each phase priced separately. No mixing Ruby with Black Pearl.",
    tag: "DATA",
  },
  {
    icon: Activity,
    title: "RECENT SALES",
    desc: "What items actually sold for — not just asking prices.",
    tag: "LIVE",
  },
  {
    icon: BarChart3,
    title: "CANDLESTICK CHARTS",
    desc: "5-minute candles down to the moment of every case drop and update.",
    tag: "CHARTS",
  },
  {
    icon: TrendingUp,
    title: "HISTORICAL DATA",
    desc: "A year+ of price history across every release and patch.",
    tag: "365D+",
  },
  {
    icon: Search,
    title: "ITEM ANALYTICS",
    desc: "Float, pattern index, stickers, paint seed — all the detail that matters.",
    tag: "ANALYSIS",
  },
  {
    icon: LineChart,
    title: "TECHNICAL INDICATORS",
    desc: "SMA, EMA, RSI, MACD, Bollinger — applied to skin price data.",
    tag: "TA",
  },
  {
    icon: GitCompare,
    title: "ARBITRAGE SCANNER",
    desc: "Cross-market gaps surfaced automatically. Set your filters.",
    tag: "LIVE",
  }
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 bg-grid">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10">
          {/* Section header */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="mb-3 font-mono text-xs tracking-widest text-primary">
              // WHAT YOU GET
            </div>
            <h2 className="display-heading text-5xl font-black tracking-tighter md:text-6xl xl:text-7xl">
              EVERY TOOL
              <br />
              <span className="text-gradient-brand">YOU NEED</span>
            </h2>
            <p className="mt-7 max-w-sm font-mono text-sm leading-7 text-muted-foreground">
              Live market reads, execution signals, and price structure in one trading surface.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative min-h-38 bg-card px-5 py-4 transition-colors hover:bg-secondary/50"
              >
                {/* Tag */}
                <div className="absolute right-4 top-3.5">
                  <span className="border border-primary/50 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-primary">
                    {f.tag}
                  </span>
                </div>

                <f.icon className="mb-4 h-4 w-4 text-primary" strokeWidth={1.5} />
                <h3 className="mb-2 pr-14 font-mono text-xs font-bold tracking-[0.14em]">
                  {f.title}
                </h3>
                <p className="pr-10 text-[13px] leading-6 text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
