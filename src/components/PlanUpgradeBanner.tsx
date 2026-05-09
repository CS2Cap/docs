"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, X, Zap } from "lucide-react";
import { useSession } from "@/lib/api";

const DISMISS_KEY = "plan-upgrade-banner-dismissed";

export function PlanUpgradeBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!session || dismissed) return null;

  const tierName = session.tier_info?.display_name ?? "Free";
  const used = session.usage.requests_this_month;
  const limit = session.usage.requests_limit || 1;
  const pct = Math.min(100, (used / limit) * 100);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="relative flex items-center gap-3 border border-border/50 bg-card/30 px-3 py-2 text-xs">
      <Zap className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.5} />
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Plan
      </span>
      <span className="font-mono text-[11px] font-bold text-foreground">
        {tierName.toUpperCase()}
      </span>
      <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
        {used.toLocaleString()} / {limit.toLocaleString()} req · {pct.toFixed(0)}%
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <Link
          href="/api-info#pricing"
          className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          PLANS
        </Link>
        <Link
          href="/account/billing"
          className="inline-flex items-center gap-1 border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-primary hover:bg-primary/20 transition-colors"
        >
          UPGRADE
          <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="ml-1 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
