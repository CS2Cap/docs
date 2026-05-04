"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";
import { useAccountUsageStats } from "@/lib/api";
import { PlanUpgradeCard } from "@/components/PlanUpgradeCard";

export default function AccountUsagePage() {
  const { data: usage, isLoading } = useAccountUsageStats();

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-secondary/50 rounded animate-pulse mb-4" />
        <div className="h-64 bg-secondary/30 rounded animate-pulse" />
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const resetDate = new Date(usage.reset_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const avgDaily = Math.round(usage.projection.avg_requests_per_day_7d);
  const last7 = usage.daily_usage.slice(-7);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="font-mono text-xs tracking-widest text-primary mb-2">// USAGE</div>
        <h1 className="text-3xl font-black tracking-tighter">API USAGE</h1>
      </div>

      <Card className="bg-card/50 border-border/50 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Billing Period</CardTitle>
              <CardDescription>Resets {resetDate}</CardDescription>
            </div>
            {usage.projection.upgrade_recommended && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10">
                Upgrade recommended
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">API Requests</span>
              <span className="font-medium text-foreground">
                {usage.requests_this_month.toLocaleString()} / {usage.requests_limit.toLocaleString()}
              </span>
            </div>
            <Progress value={usage.percentage_used} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {usage.percentage_used.toFixed(1)}% used · {usage.requests_remaining.toLocaleString()} remaining
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Daily Requests</CardTitle>
            <CardDescription>Last {last7.length} days</CardDescription>
          </CardHeader>
          <CardContent>
            {last7.length > 0 ? (
              <>
                <div className="h-48 rounded-md bg-secondary/30 flex items-end gap-1 px-2 pb-2 border border-border/30">
                  {(() => {
                    const max = Math.max(...last7.map((day) => day.request_count), 1);
                    return last7.map((day) => (
                      <div
                        key={day.date}
                        className="flex-1 bg-primary/60 rounded-sm min-h-0.5"
                        style={{ height: `${(day.request_count / max) * 100}%` }}
                        title={`${day.date}: ${day.request_count} requests`}
                      />
                    ));
                  })()}
                </div>
                <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: `repeat(${last7.length}, 1fr)` }}>
                  {last7.map((day) => (
                    <div key={day.date} className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(day.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                      </div>
                      <div className="text-sm font-medium text-foreground">{day.request_count}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 rounded-md bg-secondary/30 flex items-center justify-center border border-border/30">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">No usage data yet</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Endpoint Usage</CardTitle>
            <CardDescription>Requests by endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.top_endpoints.length > 0 ? (
              <div className="space-y-4">
                {usage.top_endpoints.map((endpoint) => (
                  <div key={endpoint.endpoint}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <code className="text-xs text-muted-foreground">{endpoint.endpoint}</code>
                      <span className="font-medium text-foreground">{endpoint.request_count.toLocaleString()}</span>
                    </div>
                    <Progress value={endpoint.share_pct} className="h-1.5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No endpoint data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mt-6">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Requests</div>
            <div className="text-2xl font-bold text-foreground">{usage.requests_this_month.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">This period</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Daily Average</div>
            <div className="text-2xl font-bold text-foreground">{avgDaily.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Last 7 days</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className="text-2xl font-bold text-foreground">{usage.requests_remaining.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">This period</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Days Until Limit</div>
            <div className="text-2xl font-bold text-foreground">
              {usage.projection.estimated_days_to_limit === null
                ? "N/A"
                : usage.projection.estimated_days_to_limit}
            </div>
            <div className="text-xs text-muted-foreground mt-1">At current pace</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
