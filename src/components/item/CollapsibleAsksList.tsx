"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { formatPriceMinor, getProvider, providerLabel } from "@/lib/api";
import type { MarketItem, ProviderInfo } from "@/lib/api/types";

const INITIAL_VISIBLE = 10;

function formatNumber(value?: number | null) {
  if (value == null) return "N/A";
  return value.toLocaleString();
}

export function CollapsibleAsksList({
  rows,
  providers,
}: {
  rows: MarketItem[];
  providers: ProviderInfo[];
}) {
  const [expanded, setExpanded] = useState(false);
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
      {visibleRows.map((row) => {
        const link = row.link || row.url;

        return (
          <div
            key={`${row.provider}-${row.lowest_ask}`}
            className="grid gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[minmax(0,1.2fr)_100px_120px_120px] md:items-center"
          >
            <div>
              <ProviderIdentity
                provider={getProvider(row.provider, providers)}
                fallback={providerLabel(row.provider, providers)}
                logoSize={18}
                textClassName="font-mono text-xs font-bold text-foreground"
              />
            </div>
            <div className="font-mono text-xs text-muted-foreground md:text-right">
              {formatNumber(row.quantity)}
            </div>
            <div className="font-mono text-xs font-bold text-foreground md:text-right">
              {formatPriceMinor(row.lowest_ask)}
            </div>
            <div className="flex justify-start md:justify-end">
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 border-brutal px-3 py-1 font-mono text-[9px] tracking-wider brutalist-hover hover:border-primary"
                >
                  VIEW <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : (
                <span className="font-mono text-[10px] text-muted-foreground">
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
