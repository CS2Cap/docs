import type { OverallSummary } from "@/lib/status";

export function StatusBanner({ overall }: { overall: OverallSummary }) {
  const state = overall.worst;
  const headline =
    state === "up"
      ? "All systems operational"
      : state === "degraded"
        ? "Degraded performance on some integrations"
        : state === "down"
          ? "Partial outage detected"
          : "Status partially available";

  const accent =
    state === "up"
      ? "border-success/40 bg-success/5 text-success"
      : state === "degraded"
        ? "border-warning/40 bg-warning/5 text-warning"
        : state === "down"
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-border bg-secondary/40 text-muted-foreground";

  const dot =
    state === "up"
      ? "bg-success"
      : state === "degraded"
        ? "bg-warning"
        : state === "down"
          ? "bg-destructive"
          : "bg-muted-foreground";

  return (
    <div className="space-y-6">
      <div className={`border-2 ${accent} px-6 py-5 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${dot} animate-pulse-glow`} aria-hidden="true" />
          <span className="font-mono text-sm md:text-base font-semibold tracking-wide">
            {headline}.
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[10px] tracking-widest text-muted-foreground">
          LIVE · AUTO-REFRESH 60s
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border border-2 border-border">
        <Tile
          label="MONITORS UP"
          value={`${overall.up}/${overall.total}`}
          sub={overall.degraded || overall.down ? `${overall.degraded} degraded · ${overall.down} down` : "0 incidents"}
        />
        <Tile
          label="24H UPTIME"
          value={overall.avgUptime24h != null ? `${(overall.avgUptime24h * 100).toFixed(2)}%` : "—"}
          sub="rolling average"
        />
        <Tile
          label="AVG RESPONSE"
          value={overall.avgPing != null ? `${Math.round(overall.avgPing)}ms` : "—"}
          sub="last heartbeat"
        />
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className="font-mono text-2xl md:text-3xl font-black tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      <div className="font-mono text-[10px] text-muted-foreground mt-1 tracking-wide">{sub}</div>
    </div>
  );
}
