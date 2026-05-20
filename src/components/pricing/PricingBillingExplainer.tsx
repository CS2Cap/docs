const EXAMPLE_ROWS: Array<[string, string]> = [
  ["Watchlist refresh · 250 items × 6 markets · /prices/batch", "1 req"],
  ["Buy-order pull · 50 items · /bids/batch", "1 req"],
  ["Sales lookup · AWP Asiimov · /v1/sales", "1 req"],
  ["Price history · 365d · /prices/history", "1 req"],
];

export function PricingBillingExplainer() {
  return (
    <div className="grid items-center gap-10 md:gap-14 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <div className="mb-3 font-mono text-xs tracking-widest text-primary">
          // HOW BILLING WORKS
        </div>
        <h2 className="display-heading mb-5 text-3xl font-black leading-none tracking-tighter md:text-4xl">
          BATCH ENDPOINTS
          <br />= ONE REQUEST.
        </h2>
        <p className="mb-4 font-mono text-sm leading-relaxed text-muted-foreground">
          Bulk endpoints don&apos;t multiply.{" "}
          <code className="bg-background px-1.5 py-0.5 font-mono text-[12px] text-primary">
            /v1/prices/batch
          </code>{" "}
          with 50 items is one request, not fifty.
        </p>
        <p className="font-mono text-sm leading-relaxed text-muted-foreground">
          The{" "}
          <code className="bg-background px-1.5 py-0.5 font-mono text-[12px] text-primary">
            limit
          </code>{" "}
          param caps how many items come back per batch call — 100 on FREE,
          1,000 on every paid tier.
        </p>
      </div>

      <div className="border-2 border-border bg-background p-5 md:p-6">
        <div className="mb-3.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Example · PRO plan · month-to-date
        </div>
        <div className="flex flex-col gap-px bg-border border border-border">
          {EXAMPLE_ROWS.map(([label, val]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 bg-card px-4 py-3"
            >
              <span className="font-mono text-[12px] text-muted-foreground">
                {label}
              </span>
              <span className="shrink-0 font-mono text-[12px] font-bold text-primary">
                {val}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-background px-4 py-3">
            <span className="font-mono text-[13px] font-bold text-foreground">
              USED MONTH-TO-DATE
            </span>
            <span className="font-mono text-[13px] font-bold text-foreground">
              142,300 / 500,000
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
