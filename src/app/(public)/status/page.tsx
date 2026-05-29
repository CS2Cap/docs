import type { Metadata } from "next";
import { StatusAutoRefresh } from "@/components/status/StatusAutoRefresh";
import { StatusBanner } from "@/components/status/StatusBanner";
import { StatusGroup } from "@/components/status/StatusGroup";
import {
  buildLogoMap,
  computeOverall,
  getStatusConfig,
  getStatusHeartbeats,
  getStatusProviders,
  summarizeMonitor,
  type MonitorSummary,
} from "@/lib/status";

export const revalidate = 60;

const TITLE = "CS2Cap System Status — API & Marketplace Uptime";
const DESCRIPTION =
  "Live uptime and response times for the CS2Cap API, website, docs, CDN, and every indexed CS2 marketplace integration.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/status" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://cs2cap.com/status",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function StatusPage() {
  let config, heartbeats, providers;
  try {
    [config, heartbeats, providers] = await Promise.all([
      getStatusConfig(),
      getStatusHeartbeats(),
      getStatusProviders(),
    ]);
  } catch {
    return (
      <main className="container py-24">
        <div className="border-2 border-border bg-card px-6 py-8 text-center">
          <div className="font-mono text-xs tracking-widest text-muted-foreground mb-2">// SYSTEM STATUS</div>
          <h1 className="text-2xl font-black tracking-tighter mb-2">
            Status data temporarily unavailable<span className="text-primary">.</span>
          </h1>
          <p className="font-mono text-sm leading-6 text-muted-foreground">
            Live monitoring is at{" "}
            <a href="https://status.cs2c.app" className="text-primary hover:underline">
              status.cs2c.app
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  const logoMap = buildLogoMap(providers);
  const groups = (config.publicGroupList ?? []).map((group) => ({
    name: group.name,
    monitors: (group.monitorList ?? [])
      .map((m) => summarizeMonitor(m, heartbeats, logoMap, group.name))
      .filter((m): m is MonitorSummary => Boolean(m)),
  }));


  const allMonitors = groups.flatMap((g) => g.monitors);
  const overall = computeOverall(allMonitors);
  const lastUpdated =
    allMonitors
      .map((m) => m.lastBeatAt)
      .filter((t): t is string => Boolean(t))
      .sort()
      .pop() ?? null;

  return (
    <main className="container py-16 md:py-20">
      <StatusAutoRefresh />

      <header className="mb-10 md:mb-12">
        <div className="font-mono text-xs tracking-widest text-primary mb-3">// SYSTEM STATUS</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
          Platform &amp; marketplace uptime<span className="text-primary">.</span>
        </h1>
        <p className="font-mono text-sm text-muted-foreground max-w-2xl">
          Real-time health for the CS2Cap API, surfaces, and every marketplace we index. Updated every 60 seconds.
        </p>
      </header>

      <div className="space-y-8">
        <StatusBanner overall={overall} />

        {groups.map((g) => (
          <StatusGroup key={g.name} name={g.name} monitors={g.monitors} />
        ))}

        <Legend />

        {lastUpdated && (
          <p className="font-mono text-xs tracking-widest text-muted-foreground text-center">
            LAST BEAT · {lastUpdated} UTC · DATA FROM status.cs2c.app
          </p>
        )}
      </div>
    </main>
  );
}

function Legend() {
  const items: { color: string; label: string }[] = [
    { color: "bg-success", label: "OPERATIONAL" },
    { color: "bg-warning", label: "DEGRADED (>1500ms)" },
    { color: "bg-destructive", label: "DOWN" },
    { color: "bg-accent/70", label: "MAINTENANCE" },
    { color: "bg-border/40", label: "NO DATA" },
  ];
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 px-1">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground">
          <span className={`h-2 w-2 ${i.color} rounded-[1px]`} aria-hidden="true" />
          {i.label}
        </span>
      ))}
    </div>
  );
}
