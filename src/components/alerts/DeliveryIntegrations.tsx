"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Copy,
  Lock,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useRotateWebhookSecretMutation,
  useUpdateWebhookMutation,
  useWebhooks,
} from "@/lib/api";
import type { WebhookEndpointSummary, WebhookPlatform } from "@/lib/api/types";

type BrandIcon = ComponentType<{ className?: string }>;

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function GoogleSheetsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6h6l-6-6zm1.363 10.636h-3.41v1.91h3.41v-1.91zm0 3.273h-3.41v1.91h3.41v-1.91zM20.727 6.5v15.864c0 .904-.732 1.636-1.636 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.318v6.5h6.5zm-3.273 2.773H6.545v7.909h10.91v-7.91zm-6.136 4.636H7.91v1.91h3.41v-1.91z" />
    </svg>
  );
}

const PLATFORMS: Array<{
  id: WebhookPlatform;
  label: string;
  icon: BrandIcon;
  hint: string;
  urlPlaceholder: string;
  color?: string;
}> = [
  {
    id: "discord",
    label: "Discord",
    icon: DiscordIcon,
    hint: "Discord channel webhook URL",
    urlPlaceholder: "https://discord.com/api/webhooks/000000000000000000/AbCdEf…",
    color: "#5865F2",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: TelegramIcon,
    hint: "Telegram bot URL with chat_id",
    urlPlaceholder: "https://api.telegram.org/bot<token>/sendMessage?chat_id=123456789",
    color: "#26A5E4",
  },
  {
    id: "google_sheets",
    label: "Google Sheets",
    icon: GoogleSheetsIcon,
    hint: "Apps Script web app URL",
    urlPlaceholder: "https://script.google.com/macros/s/AKfycb…/exec",
    color: "#0F9D58",
  },
  {
    id: "custom",
    label: "Custom webhook",
    icon: Webhook,
    hint: "Signed HTTPS receiver",
    urlPlaceholder: "https://your-server.com/cs2cap/webhook",
  },
];

const GOOGLE_SHEETS_SCRIPT = `function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const d = body.data;
  SpreadsheetApp.getActiveSheet().appendRow([
    body.created_at,
    d.item.market_hash_name,
    d.kind,
    d.triggered_value + " " + (d.triggered_currency || ""),
    d.threshold_value + " " + (d.threshold_currency || ""),
    d.observed_link || "",
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

function GoogleSheetsGuide() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(GOOGLE_SHEETS_SCRIPT);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-md border border-border/50 bg-background/40 p-4">
      <p className="text-sm font-medium text-foreground">Set up the Google Sheets endpoint</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          In your sheet, open <span className="text-foreground">Extensions → Apps Script</span>.
        </li>
        <li>Replace the default code with the script below, then save.</li>
        <li>
          Click <span className="text-foreground">Deploy → New deployment</span> and choose type{" "}
          <span className="text-foreground">Web app</span>.
        </li>
        <li>
          Set <span className="text-foreground">Execute as: Me</span> and{" "}
          <span className="text-foreground">Who has access: Anyone</span>, then deploy and authorize.
        </li>
        <li>
          Copy the <span className="text-foreground">Web app URL</span> (it ends in{" "}
          <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">/exec</code>) and paste
          it below.
        </li>
      </ol>

      <div className="relative mt-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="absolute right-2 top-2 h-7 gap-1.5 px-2 text-xs"
          onClick={handleCopy}
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy"}
        </Button>
        <pre className="overflow-x-auto rounded bg-background/80 p-3 pr-16 font-mono text-xs leading-relaxed text-muted-foreground">
          <code>{GOOGLE_SHEETS_SCRIPT}</code>
        </pre>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Each triggered alert is appended as a new row.{" "}
        <Link
          href="https://docs.cs2cap.com/guides/webhooks-alerts"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Full payload reference
        </Link>
        .
      </p>
    </div>
  );
}

function maskedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

function formatDeliveryState(webhook: WebhookEndpointSummary): string {
  if (webhook.last_failure_at) {
    return `Last failed ${new Date(webhook.last_failure_at).toLocaleString()}`;
  }
  if (webhook.last_success_at) {
    return `Last succeeded ${new Date(webhook.last_success_at).toLocaleString()}`;
  }
  return "No deliveries yet";
}

function mutationErrorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}

export function DeliveryIntegrations({
  allowedPlatforms,
}: {
  allowedPlatforms: WebhookPlatform[];
}) {
  const { data, isLoading } = useWebhooks();
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const rotateMutation = useRotateWebhookSecretMutation();
  const [revealedSecret, setRevealedSecret] = useState<{
    platform: WebhookPlatform;
    secret: string;
  } | null>(null);

  const byPlatform = useMemo(() => {
    const next = new Map<WebhookPlatform, WebhookEndpointSummary>();
    for (const webhook of data?.webhooks ?? []) {
      next.set(webhook.platform, webhook);
    }
    return next;
  }, [data?.webhooks]);

  return (
    <Card className="mb-8 border-border/50 bg-card/50">
      <CardContent className="pt-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Delivery Integrations</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              One active destination per platform. Fired alerts fan out to every active destination.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
            <Link href="https://docs.cs2cap.com/guides/webhooks-alerts" target="_blank" rel="noreferrer">
              Docs
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          {PLATFORMS.map((platform) => {
            const existing = byPlatform.get(platform.id);
            const allowed = allowedPlatforms.includes(platform.id);
            return (
              <PlatformRow
                key={platform.id}
                platform={platform}
                allowed={allowed}
                existing={existing}
                isLoading={isLoading}
                isBusy={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  deleteMutation.isPending ||
                  rotateMutation.isPending
                }
                createError={mutationErrorMessage(createMutation.error)}
                onCreate={async (label, url) => {
                  const response = await createMutation.mutateAsync({
                    label,
                    url,
                    platform: platform.id,
                    is_active: true,
                  });
                  posthog.capture("webhook_created", { platform: platform.id });
                  setRevealedSecret({ platform: platform.id, secret: response.secret });
                }}
                onToggle={(checked) => {
                  if (!existing) return;
                  updateMutation.mutate({
                    webhookId: existing.id,
                    data: { is_active: checked },
                  });
                  posthog.capture("webhook_toggled", {
                    platform: platform.id,
                    enabled: checked,
                  });
                }}
                onDelete={() => {
                  if (!existing) return;
                  deleteMutation.mutate(existing.id);
                  posthog.capture("webhook_deleted", { platform: platform.id });
                }}
                onRotate={async () => {
                  if (!existing) return;
                  const response = await rotateMutation.mutateAsync(existing.id);
                  posthog.capture("webhook_secret_rotated", { platform: platform.id });
                  setRevealedSecret({ platform: platform.id, secret: response.secret });
                }}
              />
            );
          })}
        </div>

        {revealedSecret && (
          <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                Secret for {revealedSecret.platform.replace("_", " ")} shown once
              </p>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(revealedSecret.secret)}
                aria-label="Copy secret"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <code className="block break-all rounded bg-background/60 p-2 font-mono text-xs text-muted-foreground">
              {revealedSecret.secret}
            </code>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={() => setRevealedSecret(null)}
            >
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformRow({
  platform,
  allowed,
  existing,
  isLoading,
  isBusy,
  createError,
  onCreate,
  onToggle,
  onDelete,
  onRotate,
}: {
  platform: {
    id: WebhookPlatform;
    label: string;
    icon: BrandIcon;
    hint: string;
    urlPlaceholder: string;
    color?: string;
  };
  allowed: boolean;
  existing?: WebhookEndpointSummary;
  isLoading: boolean;
  isBusy: boolean;
  createError: string | null;
  onCreate: (label: string, url: string) => Promise<void>;
  onToggle: (checked: boolean) => void;
  onDelete: () => void;
  onRotate: () => Promise<void>;
}) {
  const Icon = platform.icon;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [label, setLabel] = useState(platform.label);
  const [url, setUrl] = useState("");
  const canSave = label.trim() !== "" && url.trim() !== "";

  async function handleCreate() {
    if (!canSave) return;
    await onCreate(label.trim(), url.trim());
    setIsFormOpen(false);
    setUrl("");
  }

  return (
    <div className="rounded-md border border-border/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              !platform.color && "bg-primary/10 text-primary",
            )}
            style={
              platform.color
                ? { backgroundColor: `${platform.color}1a`, color: platform.color }
                : undefined
            }
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{platform.label}</span>
              {existing ? (
                <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-400">
                  Configured
                </Badge>
              ) : !allowed ? (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Upgrade
                </Badge>
              ) : null}
              {existing && !existing.is_active ? <Badge variant="secondary">Paused</Badge> : null}
            </div>
            {existing ? (
              <div className="mt-1 space-y-0.5">
                <p className="truncate text-xs text-muted-foreground">
                  {maskedUrl(existing.url)} - secret ends {existing.secret_last4}
                </p>
                <p className="text-xs text-muted-foreground">{formatDeliveryState(existing)}</p>
                {existing.last_failure_message ? (
                  <p className="line-clamp-1 text-xs text-destructive">
                    {existing.last_failure_message}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{platform.hint}</p>
            )}
          </div>
        </div>

        {existing ? (
          <div className="flex shrink-0 items-center gap-3">
            <Switch
              checked={existing.is_active}
              disabled={isBusy}
              onCheckedChange={onToggle}
              aria-label={`${platform.label} active`}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isBusy}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onRotate}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rotate Secret
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : allowed ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || isBusy}
            onClick={() => setIsFormOpen((value) => !value)}
            className="w-full sm:w-auto"
          >
            {isFormOpen ? "Cancel" : "Add"}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link
              href="/pricing"
              onClick={() => posthog.capture("webhook_upgrade_clicked", { platform: platform.id })}
            >
              Upgrade
            </Link>
          </Button>
        )}
      </div>

      {isFormOpen && allowed && !existing ? (
        <div className="mt-4 space-y-4">
          {platform.id === "google_sheets" ? <GoogleSheetsGuide /> : null}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor={`${platform.id}-label`}>Label</Label>
              <Input
                id={`${platform.id}-label`}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${platform.id}-url`}>URL</Label>
              <Input
                id={`${platform.id}-url`}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={platform.urlPlaceholder}
              />
            </div>
            <Button disabled={!canSave || isBusy} onClick={handleCreate}>
              Save
            </Button>
            {createError ? (
              <p className="text-xs text-destructive sm:col-span-3">{createError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
