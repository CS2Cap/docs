"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { formatPriceMinor, planFeatureList } from "@/lib/api";
import type { PlanInfo } from "@/lib/api/types";

type BillingCycle = "monthly" | "quarterly";

const QUARTERLY_DISCOUNT = 0.16; // 16% off vs 3 × monthly

function quarterlyTotalCents(monthlyCents: number) {
  // 16% cheaper than 3 × monthly. Round to nearest cent.
  return Math.round(monthlyCents * 3 * (1 - QUARTERLY_DISCOUNT));
}

export function PricingPlans({ plans }: { plans: PlanInfo[] }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

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
            <span className="ml-2 inline-block bg-success/20 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-success">
              -16%
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px bg-border md:grid-cols-3">
        {plans.map((plan) => {
          const isQuarterly = cycle === "quarterly" && plan.billing_price_quarterly_id != null;
          const showCycle = cycle === "quarterly" && plan.monthly_price_cents > 0;
          const totalCents = showCycle
            ? quarterlyTotalCents(plan.monthly_price_cents)
            : plan.monthly_price_cents;
          const perMonthCents = showCycle
            ? Math.round(totalCents / 3)
            : plan.monthly_price_cents;

          const hasPrice = plan.billing_price_monthly_id != null;
          const isPro = plan.code.toLowerCase() === "pro";

          return (
            <div
              key={plan.code}
              className={`flex flex-col bg-card p-8 ${isPro ? "border-2 border-primary" : ""}`}
            >
              <div className="mb-4 font-mono text-[10px] tracking-widest text-muted-foreground">
                {plan.display_name.toUpperCase()}
              </div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground">
                  {formatPriceMinor(perMonthCents, plan.currency)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">/mo</span>
              </div>
              {showCycle ? (
                <div className="mb-2 font-mono text-[11px] text-muted-foreground">
                  {formatPriceMinor(totalCents, plan.currency)} billed every 3 months
                </div>
              ) : (
                <div className="mb-2 font-mono text-[11px] text-muted-foreground">
                  Billed monthly
                </div>
              )}
              <p className="mb-6 text-xs text-muted-foreground">{plan.description}</p>

              <ul className="mb-8 flex-1 space-y-2">
                {planFeatureList(plan).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3 w-3 shrink-0 text-primary" />
                    <span className="font-mono text-[11px] text-secondary-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/account/billing"
                className={`text-center font-mono text-xs font-bold tracking-wider brutalist-hover ${
                  hasPrice
                    ? "border-2 border-primary bg-primary px-6 py-3 text-primary-foreground"
                    : "border-brutal px-6 py-3 text-foreground hover:border-primary transition-colors"
                }`}
              >
                {hasPrice
                  ? isQuarterly
                    ? "SIGN IN TO SUBSCRIBE (3 MONTHS)"
                    : "SIGN IN TO SUBSCRIBE"
                  : "SIGN IN TO LEARN MORE"}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
