"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Bell,
  BellOff,
  ExternalLink,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  Table2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import posthog from "posthog-js";
import {
  useAlertEvents,
  useAlerts,
  useCreateAlertMutation,
  useDeleteAlertMutation,
  useUpdateAlertMutation,
} from "@/lib/api";
import { buildItemPath } from "@/lib/seo/itemSlug";

function getAlertTypeIcon(type: string) {
  switch (type) {
    case "price_below":
      return TrendingDown;
    case "price_above":
      return TrendingUp;
    default:
      return AlertCircle;
  }
}

function getAlertTypeBadge(type: string) {
  switch (type) {
    case "price_below":
      return <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400">Price Below</Badge>;
    case "price_above":
      return <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-400">Price Above</Badge>;
    case "spread_exceeds":
      return <Badge variant="outline" className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400">Spread Exceeds</Badge>;
    default:
      return <Badge variant="outline">{type.replaceAll("_", " ")}</Badge>;
  }
}

function formatThreshold(value: string, currency?: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return currency ? `${currency} ${parsed.toLocaleString()}` : parsed.toLocaleString();
}

const alertIntegrations = [
  { label: "Discord", icon: MessageCircle },
  { label: "Telegram", icon: Send },
  { label: "Google Sheets", icon: Table2 },
  { label: "Custom webhook", icon: Webhook },
];

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const searchItemId = searchParams.get("itemId") ?? "";
  const { data: alerts, isLoading: alertsLoading } = useAlerts({ limit: 100 });
  const { data: events, isLoading: eventsLoading } = useAlertEvents({ limit: 100 });
  const createAlertMutation = useCreateAlertMutation();
  const updateAlertMutation = useUpdateAlertMutation();
  const deleteAlertMutation = useDeleteAlertMutation();

  const [itemIdOverride, setItemIdOverride] = useState<string | null>(null);
  const [kind, setKind] = useState("price_below");
  const [thresholdValue, setThresholdValue] = useState("");
  const [thresholdCurrency, setThresholdCurrency] = useState("USD");

  const itemId = itemIdOverride ?? searchItemId;
  const normalizedItemId = itemId.trim();
  const normalizedThresholdValue = thresholdValue.trim();
  const parsedItemId = Number(normalizedItemId);
  const isItemIdValid = normalizedItemId !== "" && Number.isFinite(parsedItemId);

  function handleCreateAlert() {
    if (!isItemIdValid || normalizedThresholdValue === "") {
      return;
    }

    createAlertMutation.mutate(
      {
        item_id: parsedItemId,
        kind,
        threshold_value: normalizedThresholdValue,
        threshold_currency: kind === "spread_exceeds" ? undefined : thresholdCurrency,
        is_enabled: true,
      },
      {
        onSuccess: () => {
          posthog.capture("alert_created", {
            item_id: parsedItemId,
            kind,
            threshold_currency: kind === "spread_exceeds" ? undefined : thresholdCurrency,
          });
        },
      },
    );
  }

  if (alertsLoading || eventsLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-secondary/50" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded bg-secondary/30" />
          <div className="h-28 animate-pulse rounded bg-secondary/30" />
          <div className="h-28 animate-pulse rounded bg-secondary/30" />
        </div>
      </div>
    );
  }

  if (!alerts || !events) {
    return null;
  }

  const enabledAlerts = alerts.alerts.filter((alert) => alert.is_enabled).length;
  const pausedAlerts = alerts.alerts.length - enabledAlerts;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-xs tracking-widest text-primary mb-2">// ALERTS</div>
          <h1 className="text-3xl font-black tracking-tighter">YOUR ALERTS</h1>
        </div>
        <Button asChild>
          <Link href="/search">
            <Plus className="mr-2 h-4 w-4" />
            Add From Search
          </Link>
        </Button>
      </div>

      <Card className="mb-8 border-border/50 bg-card/50">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="itemId">Item ID</Label>
              <Input
                id="itemId"
                value={itemId}
                onChange={(event) => setItemIdOverride(event.target.value)}
                placeholder="12345"
              />
            </div>
            <div className="space-y-2">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_below">Price Below</SelectItem>
                  <SelectItem value="price_above">Price Above</SelectItem>
                  <SelectItem value="spread_exceeds">Spread Exceeds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold</Label>
              <Input
                id="threshold"
                value={thresholdValue}
                onChange={(event) => setThresholdValue(event.target.value)}
                placeholder="10.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={thresholdCurrency} onValueChange={setThresholdCurrency} disabled={kind === "spread_exceeds"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleCreateAlert}
              disabled={createAlertMutation.isPending || !isItemIdValid || normalizedThresholdValue === ""}
            >
              {createAlertMutation.isPending ? "Creating…" : "Create Alert"}
            </Button>
            {createAlertMutation.error && (
              <p className="text-sm text-destructive">{createAlertMutation.error.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 border-border/50 bg-card/50">
        <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              {alertIntegrations.map(({ label, icon: Icon }) => (
                <Badge key={label} variant="outline" className="gap-1.5 border-primary/20 bg-primary/5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Badge>
              ))}
            </div>
            <h2 className="text-lg font-semibold text-foreground">Delivery Integrations</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Send fired alerts to Discord, Telegram, Google Sheets, or your own webhook receiver.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
            <Link href="https://docs.cs2cap.com/guides/webhooks-alerts" target="_blank" rel="noreferrer">
              Set up integrations
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-foreground">{enabledAlerts}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paused Alerts</p>
                <p className="text-2xl font-bold text-foreground">{pausedAlerts}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Triggered Events</p>
                <p className="text-2xl font-bold text-foreground">{events.events.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <AlertCircle className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Alert Rules</TabsTrigger>
          <TabsTrigger value="triggered">Fire History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="space-y-3">
            {alerts.alerts.length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No alerts set up yet. Find an item and set your price target.
                </CardContent>
              </Card>
            ) : (
              alerts.alerts.map((alert) => {
                const Icon = getAlertTypeIcon(alert.kind);

                return (
                  <Card key={alert.id} className="border-border/50 bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Link href={buildItemPath(alert.item.item_id, alert.item.market_hash_name)} className="font-medium text-foreground hover:text-primary">
                              {alert.item.market_hash_name}
                            </Link>
                            {getAlertTypeBadge(alert.kind)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Threshold: {formatThreshold(alert.threshold_value, alert.threshold_currency)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Updated {formatDistanceToNow(new Date(alert.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={alert.is_enabled}
                            onCheckedChange={(checked) => {
                              updateAlertMutation.mutate(
                                { alertId: alert.id, data: { is_enabled: checked } },
                                {
                                  onSuccess: () => {
                                    posthog.capture("alert_toggled", {
                                      alert_id: alert.id,
                                      item_id: alert.item.item_id,
                                      kind: alert.kind,
                                      enabled: checked,
                                    });
                                  },
                                },
                              );
                            }}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  deleteAlertMutation.mutate(alert.id, {
                                    onSuccess: () => {
                                      posthog.capture("alert_deleted", {
                                        alert_id: alert.id,
                                        item_id: alert.item.item_id,
                                        kind: alert.kind,
                                      });
                                    },
                                  })
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="triggered" className="mt-6">
          <div className="space-y-3">
            {events.events.length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  None of your alerts have fired yet.
                </CardContent>
              </Card>
            ) : (
              events.events.map((event) => (
                <Card key={event.id} className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                        <AlertCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-medium text-foreground">{event.item.market_hash_name}</span>
                          <Badge variant="secondary">{event.kind.replaceAll("_", " ")}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Triggered at {formatThreshold(event.triggered_value, event.triggered_currency)}
                        </p>
                        {event.reason && (
                          <p className="mt-1 text-xs text-muted-foreground">{event.reason}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {event.deliveries.length} {event.deliveries.length === 1 ? "delivery" : "deliveries"}
                          </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
