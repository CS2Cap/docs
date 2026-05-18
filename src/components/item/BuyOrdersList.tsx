import { TriangleAlert } from "lucide-react";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { Price } from "@/components/Price";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProvider, providerLabel } from "@/lib/api";
import type { BuyOrderFlag, ClassifiedBuyOrder } from "@/lib/api/view-models";
import type { BuyOrderItem, ProviderInfo } from "@/lib/api/types";

const ROW_GRID =
  "md:grid md:grid-cols-[52px_minmax(180px,1.7fr)_108px_108px] md:items-center md:gap-4 md:px-6 md:py-4";

const FLAG_TOOLTIP: Record<BuyOrderFlag, string> = {
  "unreliable-provider":
    "This marketplace's buy-order data is frequently unreliable, so these orders are listed separately and never set the headline highest bid.",
  "inverted-spread":
    "This bid is higher than this marketplace's own lowest ask — likely tied to a niche item variant rather than this exact item.",
  "excessive-bid":
    "This bid is more than double the lowest ask across all markets — likely bad or niche-variant data.",
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
}: {
  row: BuyOrderItem;
  displayIndex: number;
  providers: ProviderInfo[];
  flag?: BuyOrderFlag;
}) {
  const priceClass = flag
    ? "font-mono text-sm font-bold text-muted-foreground"
    : "font-mono text-sm font-bold text-success";

  return (
    <div
      className={`border-b border-border px-4 py-3 last:border-0 ${ROW_GRID} ${
        flag ? "bg-amber-500/[0.03]" : ""
      }`}
    >
      <div className="hidden font-mono text-xs text-muted-foreground md:block">
        #{displayIndex}
      </div>

      {/* Mobile: provider + highest bid side by side */}
      <div className="flex min-w-0 items-center justify-between gap-2 md:contents">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <ProviderIdentity
            provider={getProvider(row.provider, providers)}
            fallback={providerLabel(row.provider, providers)}
            logoSize={22}
            textClassName="font-mono text-sm font-bold text-foreground"
            className="flex min-w-0 items-center gap-2"
          />
          {flag ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Why is this buy order flagged?"
                    className="shrink-0 text-amber-500"
                  >
                    <TriangleAlert className="h-3.5 w-3.5" />
                  </button>
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
        <span className="font-mono text-[10px] text-muted-foreground">
          {formatNumber(row.num_bids)} bids
        </span>
      </div>

      {/* Desktop only columns */}
      <div className="hidden font-mono text-sm text-muted-foreground md:block md:text-right">
        {formatNumber(row.num_bids)}
      </div>
      <div className={`hidden md:block md:text-right ${priceClass}`}>
        <Price cents={row.highest_bid} />
      </div>
    </div>
  );
}

export function BuyOrdersList({
  reliable,
  flagged,
  providers,
}: {
  reliable: BuyOrderItem[];
  flagged: ClassifiedBuyOrder[];
  providers: ProviderInfo[];
}) {
  if (reliable.length === 0 && flagged.length === 0) {
    return (
      <div className="px-6 py-8 font-mono text-sm text-muted-foreground">
        No buy orders found across tracked markets.
      </div>
    );
  }

  return (
    <>
      {reliable.map((row, index) => (
        <BuyOrderRow
          key={`${row.provider}-${row.highest_bid}`}
          row={row}
          displayIndex={index + 1}
          providers={providers}
        />
      ))}

      {flagged.length > 0 ? (
        <>
          <div className="flex items-center gap-2 border-y-2 border-dashed border-amber-500/40 bg-amber-500/5 px-6 py-2 font-mono text-[10px] tracking-widest text-amber-500/90">
            <TriangleAlert className="h-3 w-3 shrink-0" />
            POTENTIALLY UNRELIABLE — EXCLUDED FROM HIGHEST BID
          </div>
          {flagged.map((row, index) => (
            <BuyOrderRow
              key={`${row.provider}-${row.highest_bid}`}
              row={row}
              displayIndex={reliable.length + index + 1}
              providers={providers}
              flag={row.flag ?? undefined}
            />
          ))}
        </>
      ) : null}
    </>
  );
}
