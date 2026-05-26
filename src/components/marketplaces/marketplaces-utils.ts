import type { ProviderFees } from "@/lib/api";

export type FeeKey = "sell_fee" | "insta_sell_fee" | "trading_spread_fee";

export const FEE_LABELS: Record<FeeKey, string> = {
  sell_fee: "Selling Fee",
  insta_sell_fee: "Instant Sell Fee",
  trading_spread_fee: "Trading Spread Fee",
};

export const CAPABILITY_LABELS: Record<string, string> = {
  BO: "Buy Orders — this marketplace supports public buy (bid) listings.",
  RS: "Recent Sales — this marketplace provides historical sale data.",
};

export function normalizeMarketType(mt?: string): string {
  return (mt ?? "OTHER").toUpperCase().trim();
}

export function pickPrimaryFee(
  fees: ProviderFees,
): { key: FeeKey; value: number } | null {
  if (fees.sell_fee != null) return { key: "sell_fee", value: fees.sell_fee };
  if (fees.insta_sell_fee != null)
    return { key: "insta_sell_fee", value: fees.insta_sell_fee };
  if (fees.trading_spread_fee != null)
    return { key: "trading_spread_fee", value: fees.trading_spread_fee };
  return null;
}

export function formatFee(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCompactUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatCompactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

export function statusDotClass(status?: string): string {
  const s = (status ?? "").toLowerCase();
  if (s === "up") return "bg-success";
  if (s === "degraded") return "bg-warning";
  if (s === "down") return "bg-destructive";
  return "bg-muted-foreground";
}

export const MARKET_TYPE_FILTERS = [
  "ALL",
  "P2P",
  "ESCROW",
  "HYBRID",
  "TRADING",
  "STORE",
] as const;

export const MARKET_TYPE_DESCRIPTIONS: Record<string, string> = {
  P2P: "A platform where regular users create publicly visible listings at seller-defined prices and trade directly with each other. Seller-friendly.",
  ESCROW:
    "A platform where sellers must deposit their skins before listing. Buyer-friendly, since the site mediates trades.",
  HYBRID:
    "A platform that offers more than one marketplace model (e.g. P2P and STORE).",
  TRADING:
    "A platform that exchanges user items for items in the platform's bot inventory based on a site valuation system. Cash withdrawals typically aren't allowed.",
  STORE:
    "A platform that sells items directly from its own bot-operated inventory at fixed prices. Often offers instant sell services as well.",
};

export function marketTypeBadgeClass(mt: string): string {
  switch (mt) {
    case "P2P":
      return "bg-primary/10 text-primary border-primary/30";
    case "ESCROW":
      return "bg-success/10 text-success border-success/30";
    case "HYBRID":
      return "bg-accent/10 text-accent border-accent/30";
    case "TRADING":
      return "bg-warning/10 text-warning border-warning/30";
    case "STORE":
      return "bg-secondary/30 text-secondary-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
