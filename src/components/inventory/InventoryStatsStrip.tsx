import type { LucideIcon } from "lucide-react";

interface StatCell {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: boolean;
}

export function InventoryStatsStrip({ stats }: { stats: StatCell[] }) {
  return (
    <div className="grid grid-cols-2 gap-px border-2 border-border bg-border md:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex flex-col bg-card p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </div>
              {Icon ? (
                <Icon
                  className={`h-4 w-4 ${stat.accent ? "text-primary" : "text-muted-foreground/60"}`}
                  strokeWidth={2}
                />
              ) : null}
            </div>
            <div
              className={`mt-3 font-mono text-2xl font-bold md:text-3xl ${
                stat.accent ? "text-primary" : "text-foreground"
              }`}
            >
              {stat.value}
            </div>
            {stat.hint ? (
              <div className="mt-1 font-mono text-xs text-muted-foreground/80">
                {stat.hint}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
