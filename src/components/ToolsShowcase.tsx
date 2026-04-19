import { Briefcase, Eye, Bell, TrendingUp } from "lucide-react";

const tools = [
  {
    icon: Briefcase,
    title: "PORTFOLIO MANAGEMENT",
    desc: "Group items, track combined value and P&L over time.",
    metrics: [
      { label: "TOTAL VALUE", value: "$4,231.50" },
      { label: "24H CHANGE", value: "+$127.30" },
      { label: "ITEMS", value: "342" },
    ],
  },
  {
    icon: Eye,
    title: "WATCHLIST",
    desc: "Save items, get notified when prices move.",
    metrics: [
      { label: "WATCHING", value: "28" },
      { label: "SIGNALS", value: "3 NEW" },
      { label: "MARKETS TRACKED", value: "CSFLOAT, BUFF163" },
    ],
  },
  {
    icon: Bell,
    title: "SMART ALERTS",
    desc: "Set a target. We ping you on Discord, email, or webhook.",
    metrics: [
      { label: "ACTIVE", value: "15" },
      { label: "TRIGGERED", value: "3 TODAY" },
      { label: "CHANNELS", value: "DISCORD" },
    ],
  },
  {
    icon: TrendingUp,
    title: "INVENTORY VALUATION",
    desc: "Link Steam. See what your inventory is worth, now and historically.",
    metrics: [
      { label: "NET WORTH", value: "$9.2K" },
      { label: "30D", value: "+8.4%" },
      { label: "MOST EXPENSIVE", value: "M4A4 | HOWL FT" },
    ],
  },
];

export function ToolsShowcase() {
  return (
    <section className="py-24 border-t-2 border-border">
      <div className="container">
        <div className="mb-16">
          <div className="font-mono text-xs tracking-widest text-primary mb-3">// YOUR EDGE</div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
            YOUR<br />
            <span className="text-gradient-brand">TOOLKIT</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mt-4 max-w-xl leading-relaxed">
            Built for traders who take it seriously.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
          {tools.map((tool) => (
            <div key={tool.title} className="bg-card p-8 group">
              <div className="flex items-start justify-between mb-6">
                <tool.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>

              <h3 className="font-mono text-sm font-bold tracking-wider mb-3">{tool.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{tool.desc}</p>

              {/* Mock metrics */}
              <div className="grid grid-cols-3 gap-px bg-border">
                {tool.metrics.map((m) => (
                  <div key={m.label} className="bg-secondary/50 p-3">
                    <div className="font-mono text-xs font-bold text-primary">{m.value}</div>
                    <div className="font-mono text-[8px] tracking-widest text-muted-foreground mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
