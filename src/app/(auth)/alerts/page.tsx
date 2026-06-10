"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Bell,
  BellOff,
  MoreHorizontal,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { DeliveryIntegrations } from "@/components/alerts/DeliveryIntegrations";
import { ItemSearchInput, type AlertItemSelection } from "@/components/alerts/ItemSearchInput";
import {
  useAlertEvents,
  useAlerts,
  useAccount,
  useCreateAlertMutation,
  useDeleteAlertMutation,
  useItem,
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

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const seedItemIdParam = searchParams.get("itemId");
  const seedItemId = seedItemIdParam && Number.isFinite(Number(seedItemIdParam))
    ? Number(seedItemIdParam)
    : null;
  const { data: alerts, isLoading: alertsLoading } = useAlerts({ limit: 100 });
  const { data: events, isLoading: eventsLoading } = useAlertEvents({ limit: 100 });
  const { data: account, isLoading: accountLoading } = useAccount();
  const { data: seedItem } = useItem(seedItemId);
  const createAlertMutation = useCreateAlertMutation();
  const updateAlertMutation = useUpdateAlertMutation();
  const deleteAlertMutation = useDeleteAlertMutation();

  // `undefined` = user hasn't touched the field, fall back to the deep-link
  // seed; an explicit value/null means the user picked or cleared it.
  const [userSelection, setUserSelection] = useState<AlertItemSelection | null | undefined>(
    undefined,
  );
  const [kind, setKind] = useState("price_below");
  const [thresholdValue, setThresholdValue] = useState("");
  const [thresholdCurrency, setThresholdCurrency] = useState("USD");

  const seededSelection: AlertItemSelection | null =
    seedItemId != null && seedItem?.market_hash_name
      ? { item_id: seedItemId, market_hash_name: seedItem.market_hash_name }
      : null;
  const selectedItem = userSelection !== undefined ? userSelection : seededSelection;

  const normalizedThresholdValue = thresholdValue.trim();
  const isItemValid = selectedItem != null;

  function handleCreateAlert() {
    if (!selectedItem || normalizedThresholdValue === "") {
      return;
    }

    createAlertMutation.mutate(
      {
        item_id: selectedItem.item_id,
        kind,
        threshold_value: normalizedThresholdValue,
        threshold_currency: kind === "spread_exceeds" ? undefined : thresholdCurrency,
        is_enabled: true,
      },
      {
        onSuccess: () => {
          posthog.capture(ANALYTICS_EVENTS.alertCreated, {
            item_id: selectedItem.item_id,
            kind,
            threshold_currency: kind === "spread_exceeds" ? undefined : thresholdCurrency,
          });
        },
      },
    );
  }

  if (alertsLoading || eventsLoading || accountLoading) {
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
  const allowedWebhookPlatforms = account?.capabilities.allowed_webhook_platforms ?? [];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      <Card className="mb-6 border-border/50 bg-card/50">
        <CardContent className="grid grid-cols-1 divide-y divide-border/50 p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-foreground">{enabledAlerts}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <BellOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Paused</p>
              <p className="text-2xl font-bold text-foreground">{pausedAlerts}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
              <AlertCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Triggered</p>
              <p className="text-2xl font-bold text-foreground">{events.events.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
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
                                    posthog.capture(ANALYTICS_EVENTS.alertToggled, {
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
                                      posthog.capture(ANALYTICS_EVENTS.alertDeleted, {
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

        <aside className="lg:sticky lg:top-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4 text-primary" />
                New Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert-item">Item</Label>
                <ItemSearchInput
                  id="alert-item"
                  value={selectedItem}
                  onSelect={(item) => setUserSelection(item)}
                />
              </div>
              <div className="space-y-2">
                <Label>Alert Type</Label>
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
              <div className="grid grid-cols-2 gap-3">
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
              <Button
                className="w-full"
                onClick={handleCreateAlert}
                disabled={createAlertMutation.isPending || !isItemValid || normalizedThresholdValue === ""}
              >
                {createAlertMutation.isPending ? "Creating…" : "Create Alert"}
              </Button>
              {createAlertMutation.error && (
                <p className="text-sm text-destructive">{createAlertMutation.error.message}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="mt-8">
        <DeliveryIntegrations allowedPlatforms={allowedWebhookPlatforms} />
      </div>
    </div>
  );
}
