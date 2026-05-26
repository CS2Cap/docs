"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Price } from "@/components/Price";

export type WearTab = {
  itemId: number;
  wearLabel: string;
  bestAsk: number | null;
  isCurrent: boolean;
  href: string;
  available: boolean;
};

export type PhaseGroup = {
  phaseLabel: string | null;
  wears: WearTab[];
};

export type KindGroup = {
  label: string;
  phaseGroups: PhaseGroup[];
};

const RESPONSIVE_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

function WearCell({ wear }: { wear: WearTab }) {
  if (!wear.available) {
    return (
      <div
        aria-disabled="true"
        className="cursor-not-allowed bg-card px-2.5 py-2 text-center"
      >
        <div className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground/35">
          {wear.wearLabel}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground/25">
          &mdash;
        </div>
      </div>
    );
  }

  const inner = (
    <>
      <div className="font-mono text-[10px] font-bold tracking-wider">
        {wear.wearLabel}
      </div>
      <div className="mt-0.5 font-mono text-[11px] font-bold text-success">
        <Price cents={wear.bestAsk} />
      </div>
    </>
  );

  if (wear.isCurrent) {
    return (
      <div className="bg-primary/10 px-2.5 py-2 text-center text-foreground ring-1 ring-inset ring-primary/40">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={wear.href}
      className="bg-card px-2.5 py-2 text-center text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
    >
      {inner}
    </Link>
  );
}

export function ConditionVariantTabsView({
  kinds,
  initialKind,
}: {
  kinds: KindGroup[];
  initialKind: string;
}) {
  const [activeKind, setActiveKind] = useState(initialKind);
  const active = kinds.find((kind) => kind.label === activeKind) ?? kinds[0];
  const colCount = active.phaseGroups[0]?.wears.length ?? 1;
  const multiPhase = active.phaseGroups.length > 1;

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

      <div className="p-3">
        {multiPhase ? (
          <div
            className="grid gap-px bg-border"
            style={{
              gridTemplateColumns: `minmax(72px,auto) repeat(${colCount}, minmax(0,1fr))`,
            }}
          >
            {active.phaseGroups.map((group) => (
              <Fragment key={group.phaseLabel ?? "_default"}>
                <div className="flex items-center bg-card px-3 py-2 font-mono text-[9px] uppercase leading-tight tracking-widest text-muted-foreground">
                  {group.phaseLabel ?? "No phase"}
                </div>
                {group.wears.map((wear) => (
                  <WearCell key={wear.wearLabel} wear={wear} />
                ))}
              </Fragment>
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-px bg-border ${RESPONSIVE_COLS[colCount] ?? RESPONSIVE_COLS[5]}`}
          >
            {active.phaseGroups[0]?.wears.map((wear) => (
              <WearCell key={wear.wearLabel} wear={wear} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
