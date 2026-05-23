// Server-side helpers for fetching CS2Cap's Uptime Kuma public status page.
// Two upstream endpoints (both public, JSON, no auth):
//   - https://status.cs2c.app/api/status-page/api          → page config + groups + monitors
//   - https://status.cs2c.app/api/status-page/heartbeat/api → recent heartbeats + 24h uptime

const STATUS_BASE = "https://status.cs2c.app";
const SLUG = "api";

export type KumaStatus = 0 | 1 | 2 | 3; // 0=down 1=up 2=pending 3=maintenance

export interface Heartbeat {
  status: KumaStatus;
  time: string; // "YYYY-MM-DD HH:mm:ss" in UTC
  msg: string;
  ping: number | null;
}

export interface Monitor {
  id: number;
  name: string;
  sendUrl?: number;
}

export interface MonitorGroup {
  id: number;
  name: string;
  weight: number;
  monitorList: Monitor[];
}

export interface StatusConfig {
  config: {
    slug: string;
    title: string;
    description: string;
    autoRefreshInterval: number;
  };
  publicGroupList: MonitorGroup[];
  incident?: unknown;
  maintenanceList?: unknown[];
}

export interface HeartbeatResponse {
  heartbeatList: Record<string, Heartbeat[]>;
  uptimeList: Record<string, number>; // "<id>_24" → 0..1
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`status fetch failed: ${url} ${res.status}`);
  return res.json() as Promise<T>;
}

export function getStatusConfig() {
  return fetchJson<StatusConfig>(`${STATUS_BASE}/api/status-page/${SLUG}`);
}

export function getStatusHeartbeats() {
  return fetchJson<HeartbeatResponse>(`${STATUS_BASE}/api/status-page/heartbeat/${SLUG}`);
}

// ── Derived data ─────────────────────────────────────────────────────────────

export type MonitorState = "up" | "down" | "degraded" | "maintenance" | "pending" | "unknown";

export interface MonitorSummary {
  id: number;
  name: string;
  beats: Heartbeat[]; // chronological (oldest → newest), trimmed/padded to BAR_COUNT
  state: MonitorState;
  uptime24h: number | null; // 0..1
  lastPing: number | null;
  lastBeatAt: string | null;
}

export const BAR_COUNT = 60;
const DEGRADED_PING_MS = 1500;

export function bucketBeats(beats: Heartbeat[] | undefined, count = BAR_COUNT): Heartbeat[] {
  const list = beats ?? [];
  const tail = list.slice(-count);
  return tail;
}

export function deriveState(beats: Heartbeat[]): MonitorState {
  if (!beats.length) return "unknown";
  const last = beats[beats.length - 1];
  if (last.status === 0) return "down";
  if (last.status === 3) return "maintenance";
  if (last.status === 2) return "pending";
  if (last.status === 1) {
    if (typeof last.ping === "number" && last.ping > DEGRADED_PING_MS) return "degraded";
    return "up";
  }
  return "unknown";
}

export function summarizeMonitor(monitor: Monitor, hb: HeartbeatResponse): MonitorSummary {
  const beats = bucketBeats(hb.heartbeatList[String(monitor.id)]);
  const state = deriveState(beats);
  const last = beats[beats.length - 1] ?? null;
  return {
    id: monitor.id,
    name: monitor.name,
    beats,
    state,
    uptime24h: hb.uptimeList[`${monitor.id}_24`] ?? null,
    lastPing: last?.ping ?? null,
    lastBeatAt: last?.time ?? null,
  };
}

export interface OverallSummary {
  total: number;
  up: number;
  degraded: number;
  down: number;
  avgUptime24h: number | null; // 0..1
  avgPing: number | null;
  worst: MonitorState;
}

export function computeOverall(monitors: MonitorSummary[]): OverallSummary {
  let up = 0,
    degraded = 0,
    down = 0;
  const uptimes: number[] = [];
  const pings: number[] = [];
  for (const m of monitors) {
    if (m.state === "up") up++;
    else if (m.state === "degraded") degraded++;
    else if (m.state === "down") down++;
    if (m.uptime24h != null) uptimes.push(m.uptime24h);
    if (m.lastPing != null) pings.push(m.lastPing);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const worst: MonitorState =
    down > 0 ? "down" : degraded > 0 ? "degraded" : up === monitors.length ? "up" : "unknown";
  return {
    total: monitors.length,
    up,
    degraded,
    down,
    avgUptime24h: avg(uptimes),
    avgPing: avg(pings),
    worst,
  };
}
