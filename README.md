# cs2c-app

Next.js 16 app powering [cs2cap.com](https://cs2cap.com).

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Runtime:** React 19, TypeScript
- **UI:** Tailwind CSS v4, Radix UI components
- **Data Fetching:** TanStack Query (React Query)
- **Analytics:** PostHog (product analytics & session replay)
- **Deployment:** Vercel

## Project Structure

```shell
src/
├── app/                       # Next.js app router pages
│   ├── (public)/             # Public-facing pages (home, search, item, pricing, etc.)
│   │   ├── (seo)/           # SEO-optimized landing pages
│   │   ├── api-info/        # API documentation page
│   │   ├── inventory-value/ # Inventory valuation tool
│   │   ├── item/            # Item detail pages
│   │   ├── search/          # Search page
│   │   └── ...              # Login, privacy, terms, verify-email
│   ├── (auth)/              # Authenticated pages
│   │   ├── account/         # Account settings
│   │   ├── alerts/          # Price alerts
│   │   ├── dashboard/       # User dashboard
│   │   └── watchlist/       # Watchlist management
│   ├── api/                 # API route handlers
│   │   ├── cs2c/           # Proxy to CS2Cap API
│   │   ├── inventory-value/ # Inventory valuation endpoint
│   │   ├── og/             # Dynamic OG image generation
│   │   └── cron/           # Vercel cron prewarm jobs
│   ├── auth/               # Auth callbacks
│   └── layout.tsx          # Root layout
├── components/              # Reusable React components
│   ├── ui/                 # Radix UI primitives + Tailwind
│   ├── inventory/          # Inventory-related components
│   ├── item/               # Item detail components
│   ├── seo/                # SEO component utilities
│   └── ...                 # Feature components (Navbar, PricingPlans, etc.)
├── hooks/                  # Custom React hooks
├── lib/                    # Core utilities & API clients
│   ├── api/               # API client modules
│   ├── seo/               # SEO utilities
│   └── ...                # Shared utilities (currency, caching, posthog)
└── globals.d.ts            # Global type declarations
```

## Hydration & Caching Strategy

The app uses a layered caching model to avoid hammering the upstream FastAPI backend while keeping data fresh for users.

### Three-tier data access

| Layer | File | When to use |
| --- | --- | --- |
| Server (`serverApi`) | `src/lib/api/server.ts` | Server Components, route handlers — reads auth cookies, can use Blob snapshots |
| Proxy (`/api/cs2c/[...path]`) | `src/app/api/cs2c/[...path]/route.ts` | Browser → server hop that forwards cookies and applies edge `Cache-Control` |
| Client (`webApi` + hooks) | `src/lib/api/client.ts`, `src/lib/api/hooks.ts` | Client Components — routes through the proxy, never hits the API directly |

The `anon: true` flag on `serverFetch` opts a Server Component out of reading cookies, which keeps the surrounding route statically renderable. Omitting it causes Next.js to force dynamic rendering even if the cookie value is unused.

### Blob snapshot cache

High-cardinality, read-mostly data (all items, all prices, all bids, market snapshots) is stored as gzipped JSON in **Vercel Blob** and served from an **in-memory L1 cache** on each function instance. The flow:

```text
Request
  │
  ├─ L1 hit (in-memory Map)? → return immediately, fire background refresh if stale
  │
  ├─ L1 miss → read from Blob (list + fetch + gunzip + parse) → populate L1
  │
  └─ Blob miss (cold start) → fall through to upstream API call
```

Freshness windows (`src/lib/blob-snapshot-cache.ts`):

| Snapshot | Fresh for | L1 TTL |
| --- | --- | --- |
| Prices | 30 min | 30 min |
| Bids | 30 min | 30 min |
| Items | 24 h | 24 h |
| Market (per timeframe) | 5 min | 5 min |

Concurrent readers on the same cold instance are coalesced via an `inflights` map — a fan-out of N callers (e.g. 10 ticker lookups on the home page) triggers only one Blob fetch. Background refreshes are serialized per-blob via a **Upstash Redis `SET NX`** distributed lock (5 min TTL) so multiple Vercel instances don't race to write the same snapshot.

Four **Vercel cron jobs** (hourly, `vercel.json`) prewarm the Blob snapshots proactively so the cold-start fallback is rarely hit.

### Edge cache on the proxy

`matchEdgeCachePolicy` in the proxy route applies `s-maxage` / `stale-while-revalidate` headers for anonymous GET requests to public catalog/price endpoints. This lets Vercel's CDN absorb repeated browser reads without reaching the function at all. Authenticated requests and mutations receive no edge cache. The per-endpoint values mirror the `revalidate` values used by `serverFetch` so both paths share the same staleness model.

Selected policies:

| Endpoint | `s-maxage` | `stale-while-revalidate` |
| --- | --- | --- |
| `/v1/prices` | 30 s | 120 s |
| `/v1/bids` | 30 s | 120 s |
| `/v1/sales` | 60 s | 300 s |
| `/v1/items/:id` | 120 s | 600 s |
| `/v1/prices/candles` | 300 s | 1800 s |
| `/v1/providers` | 300 s | 1800 s |

### Client-side (TanStack Query)

`webApi` calls always go through the `/api/cs2c` proxy. `hooks.ts` wraps them in TanStack Query with a `staleTime` of 60 s for user/session data. Market and price data on item detail pages is fetched client-side via `webApi` directly (no server prefetch), so the edge cache is the primary freshness control there.

---

## Auth Flow

Authentication is cookie-based. The browser never handles a token directly — the Next.js layer owns cookie management on behalf of the client.

### OAuth sequence

```text
Browser → OAuth provider (Steam / Google / Discord)
        ← redirect to /auth/exchange?code=<one-time-code>&next=<path>

/auth/exchange (Next.js route handler)
  → POST /v1/auth/token { code } to upstream API
  ← { access_token, expires_in }
  → sets cs2c_access_token as httpOnly cookie
  → 302 redirect to `next` (defaults to /dashboard)
```

`src/app/auth/exchange/route.ts` is the only place in the codebase that writes `cs2c_access_token`. The redirect target is sanitized — it must start with `/` and not `//` to prevent open-redirect attacks.

### Two-cookie model

| Cookie | Set by | Purpose |
| --- | --- | --- |
| `cs2c_access_token` | `/auth/exchange` (Next.js) | Bearer token — forwarded as `Authorization: Bearer` header to the upstream API |
| `cs2c_web_session` | Upstream API (set-cookie passthrough) | Session cookie — forwarded as `Cookie` header to the upstream API |

Both are `httpOnly`, so client JavaScript has no access to them. The proxy and `serverFetch` read them server-side and attach them to upstream requests. Cookie names are centralized in `src/lib/api/config.ts`.

### Proxy auth gate

The `/api/cs2c` proxy checks `isProtectedWebPath()` and returns a `401` immediately — before contacting the upstream API — if neither cookie is present on a protected endpoint (session, account, logout, providers).

### `directRequest` exception

`webApi.confirmVerifyEmail` uses `directRequest`, which bypasses the `/api/cs2c` proxy and hits the upstream API directly from the browser. This is required because the upstream email-confirmation endpoint uses the real client IP for rate-limiting, and the proxy would mask it behind the Vercel function IP.

---

## Request Interceptor & Item URL Canonicalization

`src/proxy.ts` is the Next.js 16 middleware (renamed from `middleware.ts` to avoid a Next.js naming collision with a Vercel internal). It only activates on `/item/:itemId`.

### What it does

Item pages have canonical URLs of the form `/item/<id>/<slug>` where the slug is derived from `market_hash_name`. If a visitor arrives at `/item/123` or `/item/123/wrong-slug`, the interceptor:

1. Fetches `/v1/web/items/<id>` with `CS2C_EXPORT_API_KEY` (falls back to the user's token; result is cached for 1 h via `force-cache`)
2. Derives the canonical slug via `slugifyMarketHashName()`
3. If the slug doesn't match, issues a **308** redirect to `/item/<id>/<canonical-slug>`
4. If it already matches, passes through with `NextResponse.next()`

A 308 (not 301) is used to preserve the HTTP method in the rare case a non-GET request lands on an item path.

---

## SEO Landing Pages

`src/app/(public)/(seo)` contains ~50 programmatic landing pages across three route groups, all data-driven from `src/lib/seo/landing-pages.ts` and rendered through `src/components/seo/SeoLandingPage.tsx`.

### Route groups

| Group | `SeoPageType` | Examples |
| --- | --- | --- |
| `(general)` | `"general"` | `/cs2-api`, `/cs2-price-api`, `/free-cs2-api` |
| `(features)` | `"feature"` | Feature-specific landing pages |
| `(markets)` | `"market"` | `/csfloat-api`, `/buff163-api`, one per marketplace |

### Adding or editing a page

- **General / feature pages:** add a `SeoPageConfig` entry directly to the `pages` array in `landing-pages.ts`.
- **Market pages:** call `buildProviderContent(key, displayName)` — it generates a full `SeoPageContent` object from a shared template. The `key` becomes the slug (`${key}-api`).
- Do not hand-write JSX for landing pages. `SeoLandingPage.tsx` renders all content from the config object.

---

## Deployment & Infrastructure

### Region pinning

Two functions are pinned to `fra1` (Frankfurt) in `vercel.json`:

- `src/app/api/cs2c/[...path]/route.ts` — every proxied browser call passes through this function; co-locating it with the EU-hosted upstream API eliminates a cross-Atlantic round trip on every request
- `src/app/api/inventory-value/route.ts` — same upstream API dependency

### Cron schedule

Four hourly cron jobs prewarm the Blob snapshot cache. They are staggered to avoid a thundering herd of simultaneous Blob writes:

| Job | Minute | Snapshot |
| --- | --- | --- |
| `prewarm-market-snapshot` | `:00` | Market items (per timeframe) |
| `prewarm-prices-snapshot` | `:05` | All prices |
| `prewarm-bids-snapshot` | `:10` | All bids |
| `prewarm-items-snapshot` | `:15` | All items catalog |

All cron routes are gated by `CRON_SECRET` (verified in each handler).

---

## Security Headers

Security headers are configured in `next.config.ts` and are environment-gated.

### Applied everywhere (dev, preview, production)

| Header | Value | Why |
| --- | --- | --- |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | Isolates browsing context; `allow-popups` keeps OAuth flows working |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Content-Security-Policy-Report-Only` | Full CSP policy | Reports violations to `/api/csp-report`; never blocks |

### Production-only

| Header | Reason for gating |
| --- | --- |
| `Strict-Transport-Security` | HSTS poisons `localhost` into requiring HTTPS, breaking the local dev server |
| `X-Frame-Options: SAMEORIGIN` | Blocks the app from being embedded in preview tools (e.g. Lovable's cross-origin preview iframe) |
| `Content-Security-Policy: frame-ancestors 'self'` | Same reason as above |

### CSP notes

The CSP uses `unsafe-inline` on `script-src` — this is a deliberate concession to Next.js App Router hydration and streaming, which inject inline scripts and cannot currently be made nonce-compatible without framework-level support. The plan is to enforce the full CSP once the `Report-Only` window is clean; revisit when Next.js ships native Trusted Types support.

---

## Image Pipeline

`next.config.ts` restricts remote images to `cdn.cs2c.app` only. `src/lib/image-loader.ts` is a custom Next.js image loader that short-circuits CDN images:

- URLs starting with `https://cdn.cs2c.app/` are passed directly to the CDN with only a `?w=<width>` query parameter — the CDN already serves optimally-compressed images, so routing them through Next.js's image optimization server would be wasted work
- All other URLs go through the standard `/_next/image` pipeline

Other settings:

- `minimumCacheTTL: 2592000` (30 days) — item images change rarely; aggressive caching reduces CDN egress
- `formats: ["image/webp"]` — only WebP is negotiated
- `dangerouslyAllowSVG: true` with a sandboxed `contentSecurityPolicy` on images — required because some item images on the CDN are SVGs; the sandbox prevents script execution inside the SVG

---

## Analytics

PostHog is the analytics layer. Client events, server events, and exceptions all flow through it.

### Client-side

`instrumentation-client.ts` (Next.js 16 client instrumentation entry point) initializes PostHog with `api_host: "/ingest"`. All browser events are proxied through the `/ingest` rewrite in `next.config.ts`, which forwards to PostHog's US ingestion endpoint. This keeps all PostHog traffic same-origin, bypassing ad blockers.

Session recording and surveys are disabled. Exception capture is enabled (`capture_exceptions: true`).

### Server-side

`src/lib/posthog-server.ts` exposes a singleton `PostHog` Node.js client configured with `flushAt: 1, flushInterval: 0`. This causes every `capture()` call to flush immediately — necessary because Vercel function instances don't have a persistent lifecycle to rely on for batched flushes.

---

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
pnpm install
# Create .env.local with the variables listed below
pnpm dev
```

The app will be available at <http://localhost:3000>.

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

### Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | CS2Cap API base URL | Yes |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog instance host | Yes |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog project token | Yes |
| `CRON_SECRET` | Secret to verify Vercel cron requests | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | Yes |
| `CS2C_EXPORT_API_KEY` | CS2Cap export API key | Yes |
| `CS2CAP_PUBLIC_TOOL_API_KEY` | CS2Cap public tool API key | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Yes |
| `REDIS_URL` | Redis connection string (legacy) | No |
