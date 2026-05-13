"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { getProvider, providerLabel } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";
import type { MarketItem, ProviderInfo } from "@/lib/api/types";

const INITIAL_VISIBLE = 10;

function formatNumber(value?: number | null) {
  if (value == null) return "N/A";
  return value.toLocaleString();
}

function formatRelativeTime(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function CollapsibleAsksList({
  rows,
  providers,
}: {
  rows: MarketItem[];
  providers: ProviderInfo[];
}) {
  const [expanded, setExpanded] = useState(false);
  const { formatPrice } = useCurrency();

  const bestAsk = useMemo(
    () => (rows.length ? Math.min(...rows.map((r) => r.lowest_ask)) : 0),
    [rows],
  );

  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(rows.length - INITIAL_VISIBLE, 0);

  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 font-mono text-sm text-muted-foreground">
        No listings right now. Check back or set a price alert.
      </div>
    );
  }

  return (
    <>
      {visibleRows.map((row, index) => {
        const link = row.link || row.url;
        const updated = formatRelativeTime(row.last_updated ?? row.timestamp);
        const spreadPct =
          bestAsk > 0 ? ((row.lowest_ask - bestAsk) / bestAsk) * 100 : 0;
        const isBest = row.lowest_ask === bestAsk;

        return (
          <div
            key={`${row.provider}-${row.lowest_ask}-${index}`}
            className="border-b border-border px-4 py-3 last:border-0 md:grid md:grid-cols-[52px_minmax(180px,1.7fr)_88px_108px_minmax(140px,1fr)_88px_108px] md:items-center md:gap-4 md:px-6 md:py-4"
          >
            {/* Desktop: rank */}
            <div className="hidden font-mono text-xs text-muted-foreground md:block">
              #{index + 1}
            </div>

            {/* Mobile: top row — provider + VIEW button */}
            <div className="flex min-w-0 items-center justify-between gap-2 md:contents">
              <div className="flex min-w-0 items-center">
                <ProviderIdentity
                  provider={getProvider(row.provider, providers)}
                  fallback={providerLabel(row.provider, providers)}
                  logoSize={22}
                  textClassName="font-mono text-sm font-bold text-foreground"
                  className="flex min-w-0 flex-1 items-center gap-2"
                />
              </div>
              {/* VIEW button — visible on both mobile and desktop */}
              <div className="shrink-0 md:order-last md:flex md:justify-end">
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 border-brutal px-3 py-1.5 font-mono text-[10px] tracking-wider brutalist-hover hover:border-primary"
                  >
                    VIEW <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {/* Mobile: second row — price + spread */}
            <div className="mt-2 grid grid-cols-2 gap-x-4 md:contents">
              <div className="md:text-right">
                <div className="font-mono text-[9px] tracking-widest text-muted-foreground md:hidden">PRICE</div>
                <div className="font-mono text-sm font-bold text-foreground md:text-right">
                  {formatPrice(row.lowest_ask)}
                </div>
              </div>
              <div className="md:text-right">
                <div className="font-mono text-[9px] tracking-widest text-muted-foreground md:hidden">VS BEST</div>
                <div className="font-mono text-xs md:text-right">
                  {isBest ? (
                    <span className="text-success">best price</span>
                  ) : (
                    <span className="text-muted-foreground">
                      +{spreadPct.toFixed(2)}%{" "}
                      <span className="text-muted-foreground/60">
                        ({formatPrice(row.lowest_ask - bestAsk)})
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile: third row — qty + updated */}
            <div className="mt-1 grid grid-cols-2 gap-x-4 md:contents">
              <div className="md:text-right">
                <span className="font-mono text-[10px] text-muted-foreground">
                  <span className="md:hidden">Qty: </span>{formatNumber(row.quantity)}
                </span>
              </div>
              <div className="md:text-right">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {updated ?? "—"}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-2 border-t-2 border-border bg-secondary/20 px-4 py-3 font-mono text-[10px] tracking-widest text-primary transition-colors hover:bg-secondary/40"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3 w-3 rotate-180 transition-transform" />
              SHOW LESS
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 transition-transform" />
              SEE {hiddenCount} MORE OFFER{hiddenCount === 1 ? "" : "S"}
            </>
          )}
        </button>
      ) : null}
    </>
  );
}
