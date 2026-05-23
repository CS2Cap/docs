import type { MonitorSummary } from "@/lib/status";
import { MonitorRow } from "./MonitorRow";

export function StatusGroup({
  name,
  monitors,
}: {
  name: string;
  monitors: MonitorSummary[];
}) {
  if (!monitors.length) return null;
  const upCount = monitors.filter((m) => m.state === "up").length;

  return (
    <section className="border-2 border-border bg-card">
      <header className="flex items-center justify-between px-5 py-3 border-b-2 border-border bg-secondary/40">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
          // {name.toUpperCase()}
        </h2>
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground tabular-nums">
          {upCount}/{monitors.length} UP
        </span>
      </header>
      <div>
        {monitors.map((m) => (
          <MonitorRow key={m.id} monitor={m} />
        ))}
      </div>
    </section>
  );
}
