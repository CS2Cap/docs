interface StatCell {
  label: string;
  value: string;
  hint?: string;
}

export function InventoryStatsStrip({ stats }: { stats: StatCell[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card p-4 md:p-6">
          <div className="font-mono text-2xl md:text-3xl font-bold text-primary">
            {stat.value}
          </div>
          <div className="mt-1 font-mono text-xs tracking-widest text-muted-foreground">
            {stat.label}
          </div>
          {stat.hint ? (
            <div className="mt-1 font-mono text-xs text-muted-foreground/80">
              {stat.hint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
