"use client";

import { useState } from "react";
import Link from "next/link";
import { Price } from "@/components/Price";

export type WearTab = {
  itemId: number;
  wearLabel: string;
  bestAsk: number | null;
  isCurrent: boolean;
  href: string;
};

export type PhaseGroup = {
  phaseLabel: string | null;
  wears: WearTab[];
};

export type KindGroup = {
  label: string;
  phaseGroups: PhaseGroup[];
};

export function ConditionVariantTabsView({
  kinds,
  initialKind,
}: {
  kinds: KindGroup[];
  initialKind: string;
}) {
  const [activeKind, setActiveKind] = useState(initialKind);
  const active = kinds.find((kind) => kind.label === activeKind) ?? kinds[0];

  return (
    <div className="border-brutal bg-card">
      <div className="flex items-center justify-between gap-3 border-b-2 border-border px-6 py-4">
        <span className="font-mono text-sm tracking-widest text-primary">
          CONDITION VARIANTS
        </span>
        {kinds.length > 1 ? (
          <div className="flex gap-px bg-border">
            {kinds.map((kind) => (
              <button
                key={kind.label}
                type="button"
                onClick={() => setActiveKind(kind.label)}
                className={`px-3 py-1.5 font-mono text-[10px] tracking-wider transition-colors ${
                  kind.label === active.label
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {kind.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        {active.phaseGroups.map((group) => (
          <div key={group.phaseLabel ?? "_default"} className="space-y-2">
            {group.phaseLabel ? (
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {group.phaseLabel}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
              {group.wears.map((wear) => {
                const inner = (
                  <>
                    <div className="font-mono text-[11px] font-bold tracking-wider">
                      {wear.wearLabel}
                    </div>
                    <div className="mt-1 font-mono text-xs font-bold text-success">
                      <Price cents={wear.bestAsk} />
                    </div>
                  </>
                );

                return wear.isCurrent ? (
                  <div
                    key={wear.itemId}
                    className="bg-primary/10 px-3 py-3 text-center text-foreground"
                  >
                    {inner}
                  </div>
                ) : (
                  <Link
                    key={wear.itemId}
                    href={wear.href}
                    className="bg-card px-3 py-3 text-center text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
