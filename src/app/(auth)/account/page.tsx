"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Mail,
  Calendar,
  Key,
  BarChart3,
  CreditCard,
  Settings,
  ArrowRight,
} from "lucide-react";
import { useAccount } from "@/lib/api";

const accountLinks = [
  {
    href: "/account/api-keys",
    icon: Key,
    title: "API Keys",
    description: "Create and manage keys",
  },
  {
    href: "/account/usage",
    icon: BarChart3,
    title: "Usage",
    description: "API usage this month",
  },
  {
    href: "/account/billing",
    icon: CreditCard,
    title: "Billing",
    description: "Subscription and payments",
  },
  {
    href: "/account/settings",
    icon: Settings,
    title: "Settings",
    description: "Preferences and security",
  },
];

export default function AccountPage() {
  const { data: account, isLoading } = useAccount();

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-secondary/50 rounded animate-pulse mb-4" />
        <div className="h-64 bg-secondary/30 rounded animate-pulse" />
      </div>
    );
  }

  if (!account) {
    return null;
  }

  const displayName = account.display_name ?? account.email ?? "Unknown";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const avatarUrl = account.linked_providers[0]?.avatar_url ?? null;
  const memberSince = new Date(account.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const resetDate = new Date(account.usage.reset_date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const monthlyPrice =
    account.tier_info.monthly_price_cents === 0
      ? "Free"
      : `$${(account.tier_info.monthly_price_cents / 100).toFixed(0)}/month`;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="font-mono text-xs tracking-widest text-primary mb-2">// ACCOUNT</div>
        <h1 className="text-3xl font-black tracking-tighter">OVERVIEW</h1>
        <p className="mt-2 text-sm text-muted-foreground">Account settings and preferences.</p>
      </div>

      <Card className="bg-card/50 border-border/50 mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
                <Badge>{account.tier_info.display_name}</Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {account.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {account.email}
                    {!account.email_verified_at && (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10 text-xs">
                        Unverified
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Member since {memberSince}
                </div>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/account/settings">Edit Preferences</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50 mb-8">
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
          <CardDescription>Plan and usage this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-foreground">{account.tier_info.display_name}</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                  Active
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {monthlyPrice} · Resets {resetDate}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/account/billing">Manage</Link>
              </Button>
              {account.upgrade_options.length > 0 && (
                <Button asChild>
                  <Link href="/pricing">Upgrade</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">API requests this month</span>
              <span className="font-medium text-foreground">
                {account.usage.requests_this_month.toLocaleString()} /{" "}
                {account.usage.requests_limit.toLocaleString()}
              </span>
            </div>
            <Progress value={account.usage.percentage_used} className="h-2" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-border/50">
            <div>
              <div className="text-sm text-muted-foreground">Watchlist</div>
              <div className="text-lg font-semibold text-foreground">
                {account.limits.max_watchlist_items === -1
                  ? "Unlimited"
                  : account.limits.max_watchlist_items}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active Alerts</div>
              <div className="text-lg font-semibold text-foreground">
                {account.limits.max_active_alerts === -1
                  ? "Unlimited"
                  : account.limits.max_active_alerts}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Extra API Keys</div>
              <div className="text-lg font-semibold text-foreground">
                {account.limits.max_child_api_keys == null || account.limits.max_child_api_keys === -1
                  ? "Unlimited"
                  : account.limits.max_child_api_keys}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Analytics</div>
              <div className="text-lg font-semibold text-foreground">
                {account.tier_info.can_access_analytics ? "Included" : "Upgrade"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {accountLinks.map((link) => (
          <Link key={link.href} href={link.href} className="group">
            <Card className="h-full bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <link.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
