import { ExternalLink, TriangleAlert } from "lucide-react";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { Price } from "@/components/Price";
import { RelativeTime } from "@/components/RelativeTime";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProvider, providerLabel } from "@/lib/api";
import type { BuyOrderFlag, ClassifiedBuyOrder } from "@/lib/api/view-models";
import type { BuyOrderItem, MarketItem, ProviderInfo } from "@/lib/api/types";

const ROW_GRID =
  "md:grid md:grid-cols-[48px_minmax(200px,1.3fr)_minmax(110px,1fr)_minmax(170px,1.4fr)_80px_minmax(110px,1fr)_120px] md:items-center md:gap-4 md:px-6 md:py-4";

const FLAG_TOOLTIP: Record<BuyOrderFlag, string> = {
  "unreliable-provider":
    "As Steam balance is not equal to real money (USD:STEAM = ~70%), Steam's buy orders often have an inflated value and are excluded from the main list.",
  "inverted-spread":
    "This bid is higher than this marketplace's own lowest ask; likely due to a niche item variant (e.g. low float range) or a stale/unfillfable buy order.",
  "excessive-bid":
    "This bid is more than double the lowest ask across all markets — likely bad or niche-variant data.",
  "lowball-bid":
    "This bid is less than half the median across reliable markets — likely a stale or abandoned buy order rather than a real offer.",
};

function formatNumber(value?: number | null) {
  if (value == null) return "N/A";
  return value.toLocaleString();
}

function BuyOrderRow({
  row,
  displayIndex,
  providers,
  flag,
  bestBid,
  askLink,
}: {
  row: BuyOrderItem;
  displayIndex: number;
  providers: ProviderInfo[];
  flag?: BuyOrderFlag;
  bestBid: number;
  askLink?: string;
}) {
  const priceClass = flag
    ? "font-mono text-base font-bold text-muted-foreground"
    : "font-mono text-base font-bold text-success";

  const isBest = !flag && bestBid > 0 && row.highest_bid === bestBid;
  const spreadPct =
    bestBid > 0 ? ((row.highest_bid - bestBid) / bestBid) * 100 : 0;

  return (
    <div
      className={`border-b border-border px-4 py-3 last:border-0 ${ROW_GRID} ${
        flag ? "bg-amber-500/3" : ""
      }`}
    >
      <div className="hidden font-mono text-sm text-foreground/70 md:block">
        #{displayIndex}
      </div>

      {/* Mobile: provider + highest bid side by side */}
      <div className="flex min-w-0 items-center justify-between gap-2 md:contents">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <ProviderIdentity
            provider={getProvider(row.provider, providers)}
            fallback={providerLabel(row.provider, providers)}
            logoSize={24}
            textClassName="font-mono text-base font-bold text-foreground"
            className="flex min-w-0 items-center gap-2"
          />
          {flag ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  aria-label="Why is this buy order flagged?"
                  className="shrink-0 text-amber-500"
                >
                  <TriangleAlert className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {FLAG_TOOLTIP[flag]}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        <div className={`shrink-0 md:hidden ${priceClass}`}>
          <Price cents={row.highest_bid} />
        </div>
      </div>

      {/* Mobile: bids count */}
      <div className="mt-1 md:hidden">
        <span className="font-mono text-xs text-muted-foreground">
          {formatNumber(row.num_bids)} bids
        </span>
      </div>

      {/* Desktop: HIGHEST BID */}
      <div className={`hidden md:block md:text-right ${priceClass}`}>
        <Price cents={row.highest_bid} />
      </div>

      {/* Desktop: VS BEST */}
      <div className="hidden font-mono text-sm md:block md:text-right">
        {flag ? (
          <span className="text-foreground/40">—</span>
        ) : isBest ? (
          <span className="font-bold text-success">best bid</span>
        ) : (
          <span className="text-foreground/85">
            {spreadPct.toFixed(2)}%{" "}
            <span className="text-foreground/60">
              (<Price cents={row.highest_bid - bestBid} />)
            </span>
          </span>
        )}
      </div>

      {/* Desktop: BIDS */}
      <div className="hidden font-mono text-sm font-bold text-foreground md:block md:text-right">
        {formatNumber(row.num_bids)}
      </div>

      {/* Desktop: UPDATED */}
      <div className="hidden md:block md:text-right">
        <RelativeTime value={row.last_updated ?? row.timestamp} />
      </div>

      {/* Desktop: VIEW */}
      <div className="hidden md:flex md:justify-end">
        {askLink ? (
          <a
            href={askLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 border-brutal px-4 py-2.5 font-mono text-xs tracking-wider brutalist-hover hover:border-primary"
          >
            VIEW <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="font-mono text-sm text-foreground/70">—</span>
        )}
      </div>
    </div>
  );
}

export function BuyOrdersList({
  reliable,
  flagged,
  providers,
  askRows,
}: {
  reliable: BuyOrderItem[];
  flagged: ClassifiedBuyOrder[];
  providers: ProviderInfo[];
  askRows: MarketItem[];
}) {
  if (reliable.length === 0 && flagged.length === 0) {
    return (
      <div className="px-6 py-8 font-mono text-sm text-muted-foreground">
        No buy orders found across tracked markets.
      </div>
    );
  }

  const askLinkByProvider = new Map<string, string>();
  for (const row of askRows) {
    const link = row.link || row.url;
    if (link && !askLinkByProvider.has(row.provider)) {
      askLinkByProvider.set(row.provider, link);
    }
  }

  const bestBid = reliable.length
    ? Math.max(...reliable.map((r) => r.highest_bid))
    : 0;

  return (
    <>
      {reliable.map((row, index) => (
        <BuyOrderRow
          key={`${row.provider}-${row.highest_bid}`}
          row={row}
          displayIndex={index + 1}
          providers={providers}
          bestBid={bestBid}
          askLink={askLinkByProvider.get(row.provider)}
        />
      ))}

      {flagged.length > 0 ? (
        <>
          <div className="flex items-center gap-2 border-y-2 border-dashed border-amber-500/40 bg-amber-500/5 px-6 py-2 font-mono text-xs tracking-widest text-amber-500/90">
            <TriangleAlert className="h-3 w-3 shrink-0" />
            EXCLUDED FROM OTHER BIDS
          </div>
          {flagged.map((row, index) => (
            <BuyOrderRow
              key={`${row.provider}-${row.highest_bid}`}
              row={row}
              displayIndex={reliable.length + index + 1}
              providers={providers}
              flag={row.flag ?? undefined}
              bestBid={bestBid}
              askLink={askLinkByProvider.get(row.provider)}
            />
          ))}
        </>
      ) : null}
    </>
  );
}
