"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { formatCompact } from "@/lib/api";
import type { PlanInfo } from "@/lib/api/types";

type BillingCycle = "monthly" | "quarterly";

const QUARTERLY_DISCOUNT = 0.16;

const TIER_ACCENT: Record<string, string> = {
  free: "text-foreground",
  starter: "text-success",
  pro: "text-primary",
  quant: "text-warning",
};

const TIER_TAGLINE: Record<string, string> = {
  free: "Try the API, build a prototype.",
  starter: "Serious hobbyist — current prices, bids, batch.",
  pro: "Full market data for trading tools and bots.",
  quant: "Market-makers, arbitrage desks, indicators.",
};

function quarterlyTotalCents(monthlyCents: number) {
  return Math.round(monthlyCents * 3 * (1 - QUARTERLY_DISCOUNT));
}

// Display price with no trailing .00 for whole amounts.
// Free → "$0", $19.00 → "$19", $19.50 → "$19.50".
function formatPriceDisplay(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function sortPlans(plans: PlanInfo[]): PlanInfo[] {
  const order: Record<string, number> = { free: 0, starter: 1, pro: 2, quant: 3 };
  return [...plans].sort(
    (a, b) =>
      (order[a.code.toLowerCase()] ?? 99) - (order[b.code.toLowerCase()] ?? 99),
  );
}

function planFeatures(plan: PlanInfo): string[] {
  const feats: string[] = [];
  const code = plan.code.toLowerCase();

  if (code === "free") {
    feats.push("Live Prices · All marketplaces");
    feats.push("Items metadata catalog");
    feats.push("30d price history (daily avg)");
  }
  if (code === "starter") {
    feats.push("Everything in FREE");
    feats.push("Buy orders data");
    feats.push("Batch price & bids searches");
    feats.push("Basic Discord support");
  }
  if (code === "pro") {
    feats.push("Everything in STARTER");
    feats.push("STREAMED Prices & Bids");
    feats.push("Full candlesticks · all intervals");
    feats.push("Recent Sales (+ float, seed, etc.)");
    feats.push("Analytics snapshots (liquidity, volatility, etc.)");
    if (plan.can_access_analytics) feats.push("Bulk snapshots · listing URLs");
  }
  if (code === "quant") {
    feats.push("Everything in PRO");
    feats.push("Arbitrage Scanner");
    feats.push("Technical Analysis (SMA, RSI, etc)");
    feats.push("Market Cap & Indexes");
    feats.push("API Key Subleasing");
    if (plan.can_access_webhooks) feats.push("Webhooks Support");
    if (plan.support_sla_hours != null) {
      feats.push(`Priority Support · ${plan.support_sla_hours}h SLA`);
    }
  }
  return feats;
}

export function PricingPlanCards({ plans }: { plans: PlanInfo[] }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const sorted = sortPlans(plans);

  return (
    <>
      {/* Billing cycle toggle */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex border-2 border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 font-mono text-xs font-bold tracking-wider transition-colors ${
              cycle === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            MONTHLY
          </button>
          <button
            type="button"
            onClick={() => setCycle("quarterly")}
            className={`relative px-5 py-2 font-mono text-xs font-bold tracking-wider transition-colors ${
              cycle === "quarterly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            3 MONTHS
            <span className="ml-2 inline-block bg-success/20 px-1.5 py-0.5 font-mono text-xs tracking-wider text-success">
              -16%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {sorted.map((plan) => (
          <PlanCard key={plan.code} plan={plan} cycle={cycle} />
        ))}
      </div>

      <p className="mt-7 text-center font-mono text-sm leading-6 text-muted-foreground">
        Need more than QUANT?{" "}
        <Link href="mailto:contact@cs2cap.com" className="text-primary underline hover:no-underline">
          Talk to us
        </Link>
        .
      </p>
    </>
  );
}

function PlanCard({ plan, cycle }: { plan: PlanInfo; cycle: BillingCycle }) {
  const code = plan.code.toLowerCase();
  const isFree = code === "free";
  const isPro = code === "pro";
  const accent = TIER_ACCENT[code] ?? "text-foreground";
  const tagline = TIER_TAGLINE[code] ?? plan.description;

  const isQuarterly = cycle === "quarterly" && !isFree;
  const totalCents = isQuarterly
    ? quarterlyTotalCents(plan.monthly_price_cents)
    : plan.monthly_price_cents;
  const perMonthCents = isQuarterly
    ? Math.round(totalCents / 3)
    : plan.monthly_price_cents;

  const features = planFeatures(plan);

  return (
    <article
      className={`relative flex flex-col gap-5 bg-card p-6 ${
        isPro ? "border-2 border-primary" : "border-2 border-border"
      }`}
    >
      {isPro && (
        <div
          className="absolute -left-0.5 -right-0.5 -top-0.5 bg-primary px-3 py-1.5 text-center font-mono text-xs font-black tracking-widest text-primary-foreground"
        >
          MOST POPULAR
        </div>
      )}

      <div className={`flex items-center gap-3.5 ${isPro ? "mt-5" : ""}`}>
        <Image
          src={`https://cdn.cs2c.app/assets/${code}-tier.png`}
          alt=""
          width={52}
          height={52}
          className="h-13 w-13 shrink-0"
        />
        <div>
          <div className={`font-sans text-xl font-black tracking-tight ${accent}`}>
            {plan.display_name.toUpperCase()}
          </div>
          <div className="mt-1 font-mono text-sm leading-6 text-muted-foreground">
            {tagline}
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-baseline gap-1.5">
          <span className="font-sans text-5xl font-black tracking-tighter text-foreground">
            {formatPriceDisplay(perMonthCents, plan.currency)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">/mo</span>
        </div>
        <div className="mt-2 font-mono text-sm leading-6 text-muted-foreground">
          {isFree
            ? "Always free · no card required"
            : isQuarterly
            ? `${formatPriceDisplay(totalCents, plan.currency)} billed every 3 months`
            : "Billed monthly · USD"}
        </div>
      </div>

      <div className="border border-border bg-background px-4 py-3">
        <div className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Monthly quota
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`font-mono text-2xl font-bold leading-none ${accent}`}>
            {formatCompact(plan.quota_requests_per_month)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            requests / month
          </span>
        </div>
        <div className="mt-1.5 font-mono text-sm text-muted-foreground">
          {plan.rate_requests_per_minute.toLocaleString()} req/min rate limit
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" strokeWidth={2.5} />
            <span className="font-mono text-sm leading-6 text-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/account/billing"
        className={`text-center font-mono text-xs font-bold tracking-wider brutalist-hover ${
          isPro
            ? "border-2 border-primary bg-primary px-4 py-3 text-primary-foreground"
            : "border-brutal px-4 py-3 text-foreground hover:border-primary transition-colors"
        }`}
      >
        {isFree
          ? "GET STARTED · FREE"
          : isQuarterly
          ? `SUBSCRIBE · ${plan.display_name.toUpperCase()} · 3 MO`
          : `SUBSCRIBE · ${plan.display_name.toUpperCase()}`}
      </Link>
    </article>
  );
}
