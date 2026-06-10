import { User } from "lucide-react";
import type { InventoryValueResolvedItem } from "@/lib/api/types";

export interface PortfolioIdentity {
  name: string;
  sub: string;
  badge?: string;
}

/**
 * Value hero + a real value-composition breakdown.
 *
 * The reference mock used a 30-day sparkline, but the inventory API returns no
 * time series — so instead of fabricating history we visualize the *real*
 * composition of the portfolio: the share each of the top items contributes to
 * total value, plus an "everything else" remainder. All numbers come straight
 * from the resolved items + stats.
 */
export function InventoryPortfolioHeader({
  totalValueLabel,
  identity,
  items,
  formatPrice,
  glow = true,
}: {
  totalValueLabel: string;
  identity: PortfolioIdentity;
  items: InventoryValueResolvedItem[];
  formatPrice: (minor: number | null | undefined) => string;
  glow?: boolean;
}) {
  const sorted = [...items].sort((a, b) => (b.item_value ?? 0) - (a.item_value ?? 0));
  const totalValue = sorted.reduce((sum, it) => sum + (it.item_value ?? 0), 0);
  const top = sorted.slice(0, 5);
  const topValue = top.reduce((sum, it) => sum + (it.item_value ?? 0), 0);
  const remainder = Math.max(0, totalValue - topValue);
  const remainderCount = Math.max(0, sorted.length - top.length);

  const segments = [
    ...top.map((it, i) => ({
      key: `${it.item_id}-${it.phase ?? ""}`,
      label: it.market_hash_name,
      value: it.item_value ?? 0,
      opacity: 1 - i * 0.14,
    })),
    ...(remainder > 0
      ? [
          {
            key: "remainder",
            label: `${remainderCount} more item${remainderCount === 1 ? "" : "s"}`,
            value: remainder,
            opacity: 0.18,
          },
        ]
      : []),
  ].filter((s) => s.value > 0);

  return (
    <div className="grid grid-cols-1 gap-px border-2 border-border bg-border lg:grid-cols-[1fr_minmax(0,420px)]">
      {/* Value block */}
      <div className="flex flex-col justify-between bg-card p-7 md:p-8">
        <div>
          <div className="mb-3 font-mono text-xs tracking-[0.22em] text-primary">
            // PORTFOLIO VALUE
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div
              className={`font-mono text-5xl font-bold tracking-tighter text-foreground md:text-6xl ${
                glow ? "glow-text" : ""
              }`}
            >
              {totalValueLabel}
            </div>
          </div>
        </div>

        {/* Identity row */}
        <div className="mt-7 flex items-center gap-3 border-t border-border pt-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-secondary">
            <User className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-sm font-bold text-foreground">
              {identity.name}
            </div>
            <div className="truncate font-mono text-xs tracking-wider text-muted-foreground">
              {identity.sub}
            </div>
          </div>
          {identity.badge ? (
            <span className="shrink-0 border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-xs font-bold tracking-widest text-primary">
              {identity.badge}
            </span>
          ) : null}
        </div>
      </div>

      {/* Value composition */}
      <div className="flex flex-col bg-card p-5 md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs tracking-[0.22em] text-muted-foreground">
            VALUE COMPOSITION
          </span>
          <span className="font-mono text-xs font-bold tracking-widest text-primary">
            TOP {top.length}
          </span>
        </div>

        {segments.length > 0 ? (
          <>
            <div className="flex h-3 w-full overflow-hidden border border-border">
              {segments.map((s) => (
                <div
                  key={s.key}
                  className="h-full bg-primary"
                  style={{
                    width: `${(s.value / totalValue) * 100}%`,
                    opacity: s.opacity,
                  }}
                  title={`${s.label} · ${formatPrice(s.value)}`}
                />
              ))}
            </div>
            <ul className="mt-4 flex flex-1 flex-col justify-center gap-2">
              {segments.map((s) => (
                <li key={s.key} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 bg-primary"
                    style={{ opacity: s.opacity }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                    {s.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {Math.round((s.value / totalValue) * 100)}%
                  </span>
                  <span className="shrink-0 font-mono text-xs font-bold text-primary">
                    {formatPrice(s.value)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
            No priced items to compose value.
          </div>
        )}
      </div>
    </div>
  );
}
