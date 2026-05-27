"use client";

import Link from "next/link";
import { ArrowUpRight, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/api";

export function PlanUpgradeCard({ highlight = false }: { highlight?: boolean }) {
  const { data: session } = useSession();
  if (!session) return null;

  const tierName = session.tier_info?.display_name ?? "Free";
  const used = session.usage.requests_this_month;
  const limit = session.usage.requests_limit || 1;
  const pct = Math.min(100, (used / limit) * 100);

  return (
    <Card
      className={`border-border/50 bg-card/50 ${highlight ? "border-primary/50 ring-1 ring-primary/30" : ""}`}
    >
      <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Current plan
            </span>
            <span className="font-mono text-xs font-bold text-foreground">{tierName.toUpperCase()}</span>
            {highlight && (
              <span className="ml-2 border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-xs tracking-widest text-primary">
                UPGRADE RECOMMENDED
              </span>
            )}
          </div>
          <div className="mt-2 max-w-md">
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground mb-1">
              <span>{used.toLocaleString()} / {limit.toLocaleString()} req</span>
              <span>{pct.toFixed(0)}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/pricing"
            className="inline-flex h-10 items-center border-brutal px-4 font-mono text-xs font-bold tracking-wider text-foreground brutalist-hover hover:border-primary transition-colors"
          >
            VIEW PLANS
          </Link>
          <Link
            href="/account/billing"
            className="inline-flex h-10 items-center gap-1.5 border-2 border-primary bg-primary px-4 font-mono text-xs font-bold tracking-wider text-primary-foreground brutalist-hover"
          >
            UPGRADE
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
