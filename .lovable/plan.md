# Status Page (`/status`)

A first-party uptime page so users (and prospects evaluating the API) can see in one glance whether CS2Cap and each marketplace integration is healthy. Modeled on the screenshots — clean monitor rows, heartbeat bar history, uptime %, ping — but rendered in the CS2Cap terminal/dark aesthetic (navy base, cyan accent, Space Grotesk + Inter, mono labels).

## Data sources

Two upstream JSON endpoints, both public and unauthenticated:

1. `GET https://status.cs2c.app/api/status-page/api` — page config + `publicGroupList`. Gives us groups (`CORE PLATFORM`, `MARKETPLACES`) and each monitor's `id` + `name`.
2. `GET https://status.cs2c.app/api/status-page/heartbeat/api` — `heartbeatList` (per-monitor array of `{status, time, msg, ping}`, ~last 100 beats at 5-min cadence) and `uptimeList` (`"<id>_24"` → 0–1 ratio).

We do not need provider.json for this page — monitor names already map to providers visually. (We can optionally enrich marketplace rows with the provider logo from `/v1/web/providers` later; not in v1.)

## Route + fetching

- New route group: `src/app/(public)/status/page.tsx` — Server Component.
- Add `src/lib/status.ts` with two typed fetchers (`getStatusConfig`, `getStatusHeartbeats`) that hit the two URLs with `next: { revalidate: 60 }` and `cache: "force-cache"`. No proxy needed — both are public CORS-safe, but fetching server-side keeps the page fast and avoids client request noise.
- Page is fully static-ish, ISR every 60s. No client JS required for the core render.
- Add a tiny client component `StatusAutoRefresh` that does `router.refresh()` every 60s so the page stays live without a full reload.

## Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  // SYSTEM STATUS                                           │
│  All systems operational.                  [● LIVE · 60s]   │
│  ───────────────────────────────────────────────────────    │
│  [ 38/40 UP ]  [ 99.94% 24H ]  [ 54ms AVG PING ]            │
├─────────────────────────────────────────────────────────────┤
│  CORE PLATFORM                                              │
│  ● API              ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮  100% · 48ms      │
│  ● CS2Cap.com       ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮  100% · 32ms      │
│  ● Docs             ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮  100% · 28ms      │
│  ● CDN              ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮  100% · 14ms      │
├─────────────────────────────────────────────────────────────┤
│  MARKETPLACES                                               │
│  ● Avan.Market      ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮  100% · 54ms      │
│  ● BUFF163 — Prices ▮▮▮▮▮▮▮▮▮▮▮▮▯▮▮▮▮▮▮▮  99.86% · 216ms   │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

Top banner color = worst monitor state (all up → success, any down → destructive, any degraded → warning). "Degraded" = ping over a threshold (e.g. >1500ms) on the last beat, even when `status===1`.

## Components

- `src/app/(public)/status/page.tsx` — server component, fetches both endpoints, computes summary, renders.
- `src/components/status/StatusBanner.tsx` — top headline + 3 KPI tiles (up/total, 24h uptime avg, avg ping).
- `src/components/status/StatusGroup.tsx` — group heading + list of monitor rows.
- `src/components/status/MonitorRow.tsx` — name, 60-bar heartbeat strip, uptime %, last ping. Bars colored: success (up), destructive (down), muted (no data). Hover tooltip on each bar shows local timestamp + ping ms.
- `src/components/status/StatusAutoRefresh.tsx` — `"use client"`, runs `router.refresh()` on a 60s interval.
- `src/lib/status.ts` — typed fetchers + helpers: `summarize(monitors, heartbeats, uptime)`, `bucketBeats(beats, count=60)`.

## SEO + chrome

- `metadata`: title "CS2Cap System Status — API & Marketplace Uptime", description matching, canonical `/status`.
- Wrapped in the existing `PublicLayout` (Navbar + Footer come from `src/app/(public)/layout.tsx` already).
- Add a `STATUS` link in the footer (under a "Platform" or "Resources" column — wherever the existing structure fits best; will check `FooterSection.tsx` during build). Not adding to the top navbar to keep it lean.

## Edge cases

- Endpoint failure → render the page with a `Status data temporarily unavailable` notice instead of crashing.
- Monitor in `heartbeatList` but missing from `publicGroupList` → skip.
- Empty heartbeat array → show muted bar strip and "No data".
- Status codes from Uptime Kuma: `0`=down, `1`=up, `2`=pending, `3`=maintenance. Map to color tokens (`destructive`, `success`, `warning`, `muted`).

## Out of scope (v1)

- Incident history / postmortems.
- Per-marketplace logos (we can join with `/v1/web/providers` later if desired).
- Subscribe-to-incidents form.
- A "30/90 day" toggle — Kuma's public heartbeat endpoint only returns ~last 100 beats; longer windows would need a separate Kuma endpoint.

## Files changed

- ADD `src/app/(public)/status/page.tsx`
- ADD `src/lib/status.ts`
- ADD `src/components/status/StatusBanner.tsx`
- ADD `src/components/status/StatusGroup.tsx`
- ADD `src/components/status/MonitorRow.tsx`
- ADD `src/components/status/StatusAutoRefresh.tsx`
- EDIT `src/components/FooterSection.tsx` — add `STATUS` link
