# AGENTS.md / CLAUDE.md

This file provides guidance to AI agents (e.g. GPT, Claude, etc.) working in this repository.

## Repo scope

This is `cs2cap` — the Next.js 16 frontend for [cs2cap.com](https://cs2cap.com), one project inside the larger `/home/gigachad/cs2cap` multi-repo workspace (see `../AGENTS.md`). Changes here are frontend-only; the backend lives in `cs2c-api` (FastAPI).

## Commands

Package manager is **pnpm** (see `packageManager` in `package.json`).

```bash
pnpm install
pnpm dev          # dev server on http://localhost:3000
pnpm build        # production build
pnpm lint         # ESLint (flat config, eslint.config.js)
```

There is no test suite or test runner configured.

## Architecture

### API layering — three clients, one backend

All data comes from the CS2Cap API (`API_BASE_URL`, default `https://api.cs2c.app`). There are three distinct access paths, and choosing the right one matters:

- **`src/lib/api/server.ts`** (`serverFetch`) — Server Components / route handlers. Reads auth cookies via `next/headers`, applies per-endpoint Next.js `revalidate` values, and pulls some catalog/price data from Vercel Blob snapshot caches (`src/lib/blob-snapshot-cache.ts`) rather than hitting the API directly.
- **`src/lib/api/client.ts`** (`webApi`) — Client Components. Routes browser requests through the `/api/cs2c` proxy (`BROWSER_API_BASE_PATH`) so cookies are forwarded server-side; `directRequest` is the escape hatch that hits the API directly.
- **`src/lib/api/hooks.ts`** — TanStack Query wrappers around `webApi`, plus the shared `queryKeys` registry. Use these in components instead of calling `webApi` directly.

`src/app/api/cs2c/[...path]/route.ts` is the catch-all proxy: it forwards browser calls to the API, attaches the `cs2c_access_token` / `cs2c_web_session` cookies, and sets edge `Cache-Control` headers. Its `matchEdgeCachePolicy` table must stay in sync with the `revalidate` values in `server.ts` — both encode the same staleness model per endpoint.

`src/lib/api/types.ts` mirrors the backend schema; `compositions.ts` and `view-models.ts` shape raw API data into UI-ready structures.

### Routing & request interception

App Router with three route groups under `src/app`:

- `(public)` — home, search, item pages, tools, plus `(seo)` landing pages.
- `(auth)` — account, dashboard, alerts, watchlist (auth-gated).
- `auth/exchange` — OAuth callback that exchanges a code for session cookies.

`src/proxy.ts` is the Next.js 16 request interceptor (the renamed `middleware.ts`). It only matches `/item/:itemId` and issues 308 redirects to canonicalize item URLs to `/item/<id>/<slug>` form using `src/lib/seo/itemSlug.ts`.

### SEO landing pages

`src/app/(public)/(seo)` contains ~70 programmatic landing pages in three sub-groups: `(general)`, `(features)`, and `(markets)` (one per marketplace integration). Their content is data-driven from `src/lib/seo/landing-pages.ts` and rendered through `src/components/seo/SeoLandingPage.tsx`. To add or edit a landing page, edit the data file rather than hand-writing JSX.

### Auth model

Cookie-based: `cs2c_access_token` (bearer) and `cs2c_web_session` (session). Names are centralized in `src/lib/api/config.ts`. The server and proxy read these cookies; the browser never sees the API directly for authenticated calls.

### Cron jobs

`vercel.json` defines four hourly cron jobs that prewarm Blob snapshot caches (`src/app/api/cron/prewarm-*`). They are gated by `CRON_SECRET`. The `/api/cs2c/[...path]` and `/api/inventory-value` functions are pinned to the `fra1` region.

## Conventions

- **UI**: shadcn/ui (`src/components/ui`) on Radix + Tailwind v4. Add components via the shadcn CLI; config in `components.json`.
- **Path alias**: `@/*` → `src/*`.
- **Currency**: user currency is global state via `src/lib/CurrencyContext.tsx`; render prices with `src/components/Price.tsx`.
- **Analytics**: PostHog initialized in `instrumentation-client.ts`; events proxied through the `/ingest` rewrite in `next.config.ts`. Server-side capture via `src/lib/posthog-server.ts`.
- **Images**: only `cdn.cs2c.app` is allowed (`next.config.ts`); custom loader in `src/lib/image-loader.ts`.

## Environment

Required env vars (`.env.local`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `CS2C_EXPORT_API_KEY`, `CS2CAP_PUBLIC_TOOL_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
