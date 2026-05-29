"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { ProviderInfo } from "@/lib/api";
import { getPageBySlug } from "@/lib/seo/landing-pages";
import {
  normalizeMarketType,
  marketTypeBadgeClass,
  pickPrimaryFee,
  formatFee,
  statusDotClass,
  FEE_LABELS,
  MARKET_TYPE_DESCRIPTIONS,
  CAPABILITY_LABELS,
} from "./marketplaces-utils";

function formatLastChecked(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  return `${day} d ago`;
}

function LastChecked({ value }: { value?: string | null }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const compute = () => setLabel(formatLastChecked(value));
    compute();
    const id = setInterval(compute, 30_000);
    return () => clearInterval(id);
  }, [value]);

  if (!value || !label) return null;

  const absolute = new Date(value).toLocaleString();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          suppressHydrationWarning
          className="cursor-help font-mono text-xs text-muted-foreground"
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Last checked {absolute}
      </TooltipContent>
    </Tooltip>
  );
}

export function MarketplaceCard({ provider }: { provider: ProviderInfo }) {
  const marketType = normalizeMarketType(provider.market_type);
  const fee = pickPrimaryFee(provider.fees);
  const seoPage = getPageBySlug(`${provider.key}-api`);
  const href = seoPage?.canonicalPath;

  const CardContent = (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        {provider.logo ? (
          <Image
            src={provider.logo}
            alt={provider.name ?? provider.code ?? provider.key}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-sm object-contain"
          />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-sm border border-border bg-secondary/50" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-sans text-sm font-bold text-foreground">
              {provider.name ?? provider.code ?? provider.key}
            </span>
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(provider.health?.status)}`}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {provider.code}
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Market type with tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex cursor-help items-center border px-2 py-0.5 font-mono text-xs tracking-wider ${marketTypeBadgeClass(marketType)}`}
            >
              {marketType}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-65 text-xs">
            {MARKET_TYPE_DESCRIPTIONS[marketType] ?? "Marketplace type"}
          </TooltipContent>
        </Tooltip>

        {/* Capabilities */}
        {provider.features?.has_buy_orders && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-xs text-primary">
                BO
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-65 text-xs">
              {CAPABILITY_LABELS.BO}
            </TooltipContent>
          </Tooltip>
        )}
        {provider.features?.has_recent_sales && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center border border-success/20 bg-success/5 px-2 py-0.5 font-mono text-xs text-success">
                RS
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-65 text-xs">
              {CAPABILITY_LABELS.RS}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Fee with tooltip — furthest right */}
        {fee && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {formatFee(fee.value)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {FEE_LABELS[fee.key]}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Footer meta */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {provider.default_currency ?? "USD"}
          </span>
          {provider.health?.last_checked_at && (
            <>
              <span className="font-mono text-xs text-muted-foreground/40">
                ·
              </span>
              <LastChecked value={provider.health.last_checked_at} />
            </>
          )}
        </div>
        {href && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            View &rarr;
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group relative flex flex-col gap-3 border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40"
      >
        {CardContent}
      </Link>
    );
  }

  return (
    <div className="group relative flex flex-col gap-3 border border-border bg-card p-4">
      {CardContent}
    </div>
  );
}
