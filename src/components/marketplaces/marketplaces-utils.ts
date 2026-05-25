import type { ProviderInfo } from "@/lib/api";

export type MarketTypeKey = "P2P" | "ESCROW" | "HYBRID" | "TRADING" | "STORE" | "OTHER";

export const MARKET_TYPE_FILTERS: { key: "ALL" | MarketTypeKey; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "P2P", label: "P2P" },
  { key: "ESCROW", label: "ESCROW" },
  { key: "HYBRID", label: "HYBRID" },
  { key: "TRADING", label: "TRADING" },
  { key: "STORE", label: "STORE" },
];

export function normalizeMarketType(value?: string): MarketTypeKey {
  const upper = (value ?? "").toUpperCase();
  if (upper === "P2P" || upper === "ESCROW" || upper === "HYBRID" || upper === "TRADING" || upper === "STORE") {
    return upper;
  }
  return "OTHER";
}

export function marketTypeBadgeClass(type: MarketTypeKey): string {
  switch (type) {
    case "P2P":
      return "border-primary/40 text-primary";
    case "ESCROW":
      return "border-chart-2/40 text-chart-2";
    case "HYBRID":
      return "border-chart-3/40 text-chart-3";
    case "TRADING":
      return "border-chart-4/40 text-chart-4";
    case "STORE":
      return "border-chart-5/40 text-chart-5";
    default:
      return "border-border text-muted-foreground";
  }
}

export interface PrimaryFee {
  kind: "sell" | "insta" | "spread";
  value: number;
}

export function pickPrimaryFee(provider: ProviderInfo): PrimaryFee | null {
  const { sell_fee, insta_sell_fee, trading_spread_fee } = provider.fees ?? {};
  if (typeof sell_fee === "number") return { kind: "sell", value: sell_fee };
  if (typeof insta_sell_fee === "number") return { kind: "insta", value: insta_sell_fee };
  if (typeof trading_spread_fee === "number") return { kind: "spread", value: trading_spread_fee };
  return null;
}

export function formatFee(fee: PrimaryFee | null): string {
  if (!fee) return "—";
  const pct = fee.value * 100;
  const formatted = Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(pct < 1 ? 2 : 1);
  return `${formatted}%`;
}

export function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toString();
}

export function statusDotClass(status?: string): string {
  switch ((status ?? "").toLowerCase()) {
    case "up":
      return "bg-success";
    case "down":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/50";
  }
}
