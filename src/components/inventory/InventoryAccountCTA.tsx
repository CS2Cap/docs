import Link from "next/link";
import { Activity, Bell, LayoutList, ListPlus, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Benefit {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const PUBLIC_BENEFITS: Benefit[] = [
  { icon: Bell, title: "PRICE ALERTS", desc: "Get pinged the moment an item crosses your target price." },
  { icon: LayoutList, title: "WATCHLIST", desc: "Keep your highest-value skins one click away." },
  { icon: TrendingUp, title: "MARKET DATA", desc: "Open any item for full price history, buy orders, and sales." },
];

const ACCOUNT_BENEFITS: Benefit[] = [
  { icon: Bell, title: "SET ALERTS", desc: "Watch any item here and get notified on price moves." },
  { icon: ListPlus, title: "ADD TO WATCHLIST", desc: "Keep your highest-value skins one click away." },
  { icon: Activity, title: "OPEN DASHBOARD", desc: "Portfolio overview and market signals in one place." },
];

export function InventoryAccountCTA({
  variant = "public",
}: {
  variant?: "public" | "account";
}) {
  const isPublic = variant === "public";
  const benefits = isPublic ? PUBLIC_BENEFITS : ACCOUNT_BENEFITS;

  return (
    <section className="relative overflow-hidden border-2 border-border bg-grid">
      <div
        className="pointer-events-none absolute -right-20 -top-28 h-80 w-80"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div className="relative p-7 md:p-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-primary/35 px-3 py-1.5">
              <span className="h-1.5 w-1.5 bg-primary animate-pulse-glow" />
              <span className="font-mono text-xs font-semibold tracking-[0.22em] text-primary">
                {isPublic ? "FREE ACCOUNT" : "YOUR TOOLKIT"}
              </span>
            </div>
            <h2 className="display-heading text-3xl font-black tracking-tighter md:text-4xl">
              {isPublic ? (
                <>
                  DON&apos;T LOSE TRACK OF
                  <br />
                  <span className="text-gradient-brand">THIS INVENTORY.</span>
                </>
              ) : (
                <>
                  PUT THIS INVENTORY
                  <br />
                  <span className="text-gradient-brand">TO WORK.</span>
                </>
              )}
            </h2>
            <p className="mt-4 max-w-md font-mono text-sm leading-relaxed text-muted-foreground">
              {isPublic
                ? "This lookup is live and never stored. Create a free CS2Cap account to watch items, set price alerts, and dig into the market data behind every skin."
                : "You're signed in — set alerts on your most valuable skins, add them to your watchlist, and follow the market from your dashboard."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={isPublic ? "/login" : "/alerts"}
                className="inline-flex items-center justify-center border-2 border-primary bg-primary px-6 py-3 font-mono text-xs font-bold tracking-widest text-primary-foreground brutalist-hover"
              >
                {isPublic ? "CREATE A FREE ACCOUNT →" : "SET UP ALERTS →"}
              </Link>
              <Link
                href={isPublic ? "/marketplaces" : "/dashboard"}
                className="inline-flex items-center justify-center border-brutal px-6 py-3 font-mono text-xs font-bold tracking-widest text-foreground brutalist-hover"
              >
                {isPublic ? "EXPLORE THE MARKET" : "OPEN DASHBOARD"}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px border border-border bg-border">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex items-start gap-4 bg-card p-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/40 bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold tracking-widest text-foreground">
                      {b.title}
                    </div>
                    <div className="mt-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
                      {b.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
