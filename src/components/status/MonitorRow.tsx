import type { Heartbeat, MonitorState, MonitorSummary } from "@/lib/status";
import { BAR_COUNT } from "@/lib/status";

const STATE_DOT: Record<MonitorState, string> = {
  up: "bg-success",
  degraded: "bg-warning",
  down: "bg-destructive",
  maintenance: "bg-accent",
  pending: "bg-muted-foreground",
  unknown: "bg-muted-foreground/40",
};

const STATE_LABEL: Record<MonitorState, string> = {
  up: "Operational",
  degraded: "Degraded",
  down: "Down",
  maintenance: "Maintenance",
  pending: "Pending",
  unknown: "No data",
};

function barColor(beat: Heartbeat | null): string {
  if (!beat) return "bg-border/40";
  if (beat.status === 0) return "bg-destructive";
  if (beat.status === 3) return "bg-accent/70";
  if (beat.status === 2) return "bg-muted-foreground/60";
  if (typeof beat.ping === "number" && beat.ping > 1500) return "bg-warning";
  return "bg-success";
}

function formatTooltip(beat: Heartbeat | null): string {
  if (!beat) return "No data";
  const status =
    beat.status === 1 ? "Up" : beat.status === 0 ? "Down" : beat.status === 3 ? "Maintenance" : "Pending";
  const ping = beat.ping != null ? ` · ${beat.ping}ms` : "";
  return `${beat.time} UTC · ${status}${ping}${beat.msg ? ` · ${beat.msg}` : ""}`;
}

export function MonitorRow({ monitor }: { monitor: MonitorSummary }) {
  const padded: (Heartbeat | null)[] = [
    ...Array<Heartbeat | null>(Math.max(0, BAR_COUNT - monitor.beats.length)).fill(null),
    ...monitor.beats,
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[220px_minmax(0,1fr)_120px] items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${STATE_DOT[monitor.state]} ${monitor.state === "up" ? "animate-pulse-glow" : ""}`}
          aria-hidden="true"
        />
        {monitor.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={monitor.logo}
            alt=""
            width={18}
            height={18}
            loading="lazy"
            className="h-4.5 w-4.5 shrink-0 rounded-sm object-contain"
          />
        ) : (
          <span className="h-4.5 w-4.5 shrink-0 rounded-sm border border-border bg-secondary/50" aria-hidden="true" />
        )}
        <span className="font-mono text-sm font-semibold tracking-wide text-foreground truncate">
          {monitor.name}
        </span>
        <span className="sr-only">{STATE_LABEL[monitor.state]}</span>
      </div>

      <div
        className="flex items-end gap-0.5 h-7 md:h-8"
        role="img"
        aria-label={`Last ${monitor.beats.length} heartbeats for ${monitor.name}`}
      >
        {padded.map((beat, i) => (
          <span
            key={i}
            className={`flex-1 h-full min-w-0.5 ${barColor(beat)} opacity-90 hover:opacity-100 transition-opacity rounded-[1px]`}
            title={formatTooltip(beat)}
          />
        ))}
      </div>

      <div className="flex md:justify-end items-center gap-3 font-mono text-sm tabular-nums">
        <span className={monitor.state === "up" ? "text-success" : monitor.state === "down" ? "text-destructive" : monitor.state === "degraded" ? "text-warning" : "text-muted-foreground"}>
          {monitor.uptime24h != null ? `${(monitor.uptime24h * 100).toFixed(2)}%` : "—"}
        </span>
        <span className="text-muted-foreground">
          {monitor.lastPing != null ? `${Math.round(monitor.lastPing)}ms` : "—"}
        </span>
      </div>
    </div>
  );
}
