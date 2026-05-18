"use client";

import { useState } from "react";
import type { MarketIndexGroup, MarketIndexGroupBy } from "@/lib/api/types";

interface GroupingData {
  total_marketcap_usd: string;
  groups: MarketIndexGroup[];
}

function formatUsd(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function titleCase(raw: string): string {
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TABS: { key: MarketIndexGroupBy; label: string }[] = [
  { key: "item_type", label: "BY ITEM TYPE" },
  { key: "weapon_type", label: "BY WEAPON" },
];

export function MarketCapView({
  itemType,
  weaponType,
}: {
  itemType: GroupingData | null;
  weaponType: GroupingData | null;
}) {
  const available = TABS.filter((t) =>
    t.key === "item_type" ? itemType : weaponType,
  );
  const [active, setActive] = useState<MarketIndexGroupBy>(
    available[0]?.key ?? "item_type",
  );

  const data = active === "item_type" ? itemType : weaponType;
  if (!data) return null;

  const total = Number(data.total_marketcap_usd) || 0;
  const groups = [...data.groups].sort(
    (a, b) => Number(b.marketcap_usd) - Number(a.marketcap_usd),
  );

  return (
    <div>
      {available.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-px bg-border" role="tablist">
          {available.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active === tab.key}
              onClick={() => setActive(tab.key)}
              className={`px-5 py-2.5 font-mono text-xs font-bold tracking-widest transition-colors ${
                active === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="border-brutal bg-card">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b-2 border-border px-4 py-3 font-mono text-[10px] tracking-widest text-muted-foreground sm:px-6">
          <div>CATEGORY</div>
          <div className="text-right">ITEMS</div>
          <div className="text-right">MARKET CAP</div>
        </div>
        {groups.map((group) => {
          const cap = Number(group.marketcap_usd) || 0;
          const share = total > 0 ? (cap / total) * 100 : 0;
          return (
            <div
              key={group.group}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 sm:px-6"
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-sm font-bold text-foreground">
                  {titleCase(group.group)}
                </div>
                <div className="mt-1.5 h-1 w-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${share.toFixed(1)}%` }}
                  />
                </div>
              </div>
              <div className="text-right font-mono text-xs text-muted-foreground">
                {group.included_count.toLocaleString("en-US")}
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-foreground">
                  {formatUsd(cap)}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {share.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
