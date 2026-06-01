"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, BarChart3, Bell, Clock3, Heart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAlertEvents, useAlerts, useSession, useWatchlist } from "@/lib/api";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { buildItemPath } from "@/lib/seo/itemSlug";

function formatThreshold(value: string, currency?: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return currency ? `${currency} ${parsed.toLocaleString()}` : parsed.toLocaleString();
}

export default function DashboardPage() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: watchlist, isLoading: watchlistLoading } = useWatchlist({ limit: 5 });
  const { data: alerts, isLoading: alertsLoading } = useAlerts({ limit: 5 });
  const { data: events, isLoading: eventsLoading } = useAlertEvents({ limit: 5 });

  if (sessionLoading || watchlistLoading || alertsLoading || eventsLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-4 h-8 w-56 animate-pulse rounded bg-secondary/50" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded bg-secondary/30" />
          <div className="h-28 animate-pulse rounded bg-secondary/30" />
          <div className="h-28 animate-pulse rounded bg-secondary/30" />
        </div>
      </div>
    );
  }

  if (!session || !watchlist || !alerts || !events) {
    return null;
  }

  const displayName = session.display_name ?? session.email ?? "there";
  const stats = [
    {
      label: "Watching",
      value: watchlist.pagination.total.toLocaleString(),
      detail:
        watchlist.pagination.total === 1
          ? "1 tracked item"
          : `${watchlist.pagination.total} tracked items`,
      icon: Heart,
    },
    {
      label: "Active Alerts",
      value: alerts.pagination.total.toLocaleString(),
      detail: `${alerts.alerts.filter((alert) => alert.is_enabled).length} enabled on this page`,
      icon: Bell,
    },
    {
      label: "API Usage",
      value: session.usage.requests_this_month.toLocaleString(),
      detail: `of ${session.usage.requests_limit.toLocaleString()} this month`,
      icon: BarChart3,
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-10">
        <div className="font-mono text-xs tracking-widest text-primary mb-3">// DASHBOARD</div>
        <h1 className="display-heading text-4xl font-black leading-[0.96] tracking-tighter md:text-5xl lg:text-6xl">
          WELCOME BACK,
          <br />
          <span className="text-gradient-brand">{displayName.toUpperCase()}</span>
          <span className="text-primary">.</span>
        </h1>
        <div className="mt-6">
          <EmailVerificationBanner />
        </div>
      </div>

      <div className="mb-10 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-black tracking-tight text-foreground md:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                    {stat.detail}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-10">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Inventory</CardTitle>
                <CardDescription>Value your Steam inventory live</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory">
                Open
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Watchlist</CardTitle>
              <CardDescription>Items you&apos;re watching</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/watchlist">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {watchlist.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet. Search for items to start watching.</p>
            ) : (
              <div className="space-y-4">
                {watchlist.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <div>
                      <Link href={buildItemPath(item.item_id, item.market_hash_name)} className="text-sm font-medium text-foreground hover:text-primary">
                        {item.market_hash_name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {item.phase && <Badge variant="outline">{item.phase}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Alerts</CardTitle>
              <CardDescription>Alerts that have fired recently</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/alerts">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {events.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts have fired yet.</p>
            ) : (
              <div className="space-y-4">
                {events.events.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.item.market_hash_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.kind.replaceAll("_", " ")} at {formatThreshold(event.triggered_value, event.triggered_currency)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">API Usage This Month</CardTitle>
            <CardDescription>Requests used vs. your plan limit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Used
                </p>
                <p className="mt-2 font-mono text-3xl font-black text-foreground">
                  {session.usage.requests_this_month.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Limit
                </p>
                <p className="mt-2 font-mono text-3xl font-black text-foreground">
                  {session.usage.requests_limit.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Resets
                </p>
                <p className="mt-2 font-mono text-3xl font-black text-foreground">
                  {new Date(session.usage.reset_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
