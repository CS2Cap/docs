"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { formatPriceMinor, getProvider, providerLabel } from "@/lib/api";
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
            className="grid gap-4 border-b border-border px-6 py-4 last:border-0 md:grid-cols-[52px_minmax(180px,1.7fr)_88px_108px_minmax(140px,1fr)_88px_108px] md:items-center"
          >
            <div className="hidden font-mono text-xs text-muted-foreground md:block">
              #{index + 1}
            </div>
            <div className="flex min-w-0 items-center">
              <ProviderIdentity
                provider={getProvider(row.provider, providers)}
                fallback={providerLabel(row.provider, providers)}
                logoSize={26}
                textClassName="font-mono text-sm font-bold text-foreground"
                className="flex min-w-0 flex-1 items-center gap-3"
              />
            </div>
            <div className="font-mono text-sm text-muted-foreground md:text-right">
              {formatNumber(row.quantity)}
            </div>
            <div className="font-mono text-sm font-bold text-foreground md:text-right">
              {formatPriceMinor(row.lowest_ask)}
            </div>
            <div className="font-mono text-xs md:text-right">
              {isBest ? (
                <span className="text-success">— best price</span>
              ) : (
                <span className="text-muted-foreground">
                  +{spreadPct.toFixed(2)}%{" "}
                  <span className="text-muted-foreground/60">
                    ({formatPriceMinor(row.lowest_ask - bestAsk)})
                  </span>
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-muted-foreground md:text-right">
              {updated ?? "—"}
            </div>
            <div className="flex justify-start md:justify-end">
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
                <span className="font-mono text-xs text-muted-foreground">
                  Internal only
                </span>
              )}
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
