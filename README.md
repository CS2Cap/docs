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

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
cp .env.local
npm run dev
```

The app will be available at <http://localhost:3000>.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

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
