import { Check, Minus } from "lucide-react";

type CellValue = boolean | string;

type Row = [string, [CellValue, CellValue, CellValue, CellValue]];

type Section = {
  name: string;
  rows: Row[];
};

const SECTIONS: Section[] = [
  {
    name: "REQUESTS",
    rows: [
      ["Requests / month", ["1,000", "50,000", "500,000", "1,000,000"]],
      ["Rate limit", ["20/min", "40/min", "100/min", "300/min"]],
      ["Limit param cap", ["100", "1,000", "1,000", "1,000"]],
    ],
  },
  {
    name: "ENDPOINTS",
    rows: [
      ["Prices · /v1/prices", [true, true, true, true]],
      ["Items · /v1/items", [true, true, true, true]],
      ["Buy orders · /v1/bids", [false, true, true, true]],
      ["Batch prices · /prices/batch", [false, true, true, true]],
      ["Batch bids · /bids/batch", [false, true, true, true]],
      ["Sales · /v1/sales", [false, false, true, true]],
      ["Price history · /prices/history", [false, false, true, true]],
      ["Candles full · all intervals", ["1d/30d", "1d/30d", true, true]],
      ["Market items · /market/items", [false, false, true, true]],
      ["Arbitrage · /market/arbitrage", [false, false, false, true]],
      ["Indicators · /market/indicators", [false, false, false, true]],
      ["Market indexes · /market/indexes", [false, false, false, true]],
    ],
  },
  {
    name: "PLATFORM",
    rows: [
      ["Watchlist items", ["50", "50", "250", "1,000"]],
      ["Portfolios", ["20", "20", "50", "1,000"]],
      ["Active alerts", ["0", "0", "25", "200"]],
      ["Child API keys", ["0", "0", "0", "25"]],
      ["Webhook destinations", ["0", "0", "0", "5"]],
      ["Bulk snapshots", [false, false, true, true]],
      ["Raw listings URLs", [false, false, true, true]],
    ],
  },
  {
    name: "SUPPORT",
    rows: [
      ["Support", ["—", "Basic", "Basic", "Priority"]],
      ["SLA", ["—", "—", "—", "24h"]],
    ],
  },
];

const HEADERS = ["FREE", "STARTER", "PRO", "QUANT"] as const;

function Cell({ value, header = false }: { value: CellValue; header?: boolean }) {
  if (value === true)
    return <Check className="h-4 w-4 text-primary" strokeWidth={2.5} aria-label="Yes" />;
  if (value === false)
    return (
      <Minus className="h-4 w-4 text-muted-foreground/50" strokeWidth={2} aria-label="No" />
    );
  return (
    <span
      className={`font-mono text-[13px] ${
        header ? "text-muted-foreground" : "text-foreground"
      }`}
    >
      {value}
    </span>
  );
}

function MatrixRow({
  feature,
  values,
  header = false,
}: {
  feature: string;
  values: readonly CellValue[];
  header?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(180px,1.3fr)_repeat(4,1fr)] border-b border-border ${
        header ? "bg-secondary/40" : ""
      }`}
    >
      <div
        className={`px-4 py-3.5 md:px-5 ${
          header
            ? "font-sans text-[13px] font-black uppercase tracking-tight text-foreground"
            : "font-mono text-[13px] text-foreground"
        }`}
      >
        {feature}
      </div>
      {values.map((v, i) => (
        <div
          key={i}
          className="flex items-center justify-center border-l border-border px-3 py-3.5 text-center"
        >
          <Cell value={v} header={header} />
        </div>
      ))}
    </div>
  );
}

export function PricingFeatureMatrix() {
  return (
    <div className="overflow-x-auto border-2 border-border">
      <div className="min-w-190">
        <MatrixRow feature="FEATURE" values={HEADERS} header />
        {SECTIONS.map((sec) => (
          <div key={sec.name}>
            <div className="border-b border-border bg-background px-4 py-2.5 font-mono text-[11px] font-bold tracking-widest text-primary md:px-5">
              // {sec.name}
            </div>
            {sec.rows.map((row) => (
              <MatrixRow key={row[0]} feature={row[0]} values={row[1]} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
