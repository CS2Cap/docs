import type { NextConfig } from "next";

// Content-Security-Policy directives (no report directives — those are appended
// per-request below once the report URL is known). Enforced in production,
// Report-Only in dev/preview. See `headers()`.
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // 'unsafe-inline' covers Next.js App Router hydration/streaming scripts (no nonce
  // setup). e.cs2cap.com is the PostHog reverse proxy: posthog-js lazy-loads its
  // extension scripts (e.g. exception autocapture) from the api_host.
  // analytics.ahrefs.com serves the Ahrefs Web Analytics tag (see app/layout.tsx).
  "script-src 'self' 'unsafe-inline' https://e.cs2cap.com https://analytics.ahrefs.com",
  // 'unsafe-inline' covers React inline style attributes (Recharts) + the chart <style> block.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Avatar hosts for linked OAuth providers (rendered in the navbar): Steam
  // (`avatarfull`), Google (`picture`), Discord (CDN avatar URL).
  "img-src 'self' data: blob: https://cdn.cs2c.app https://community.akamai.steamstatic.com https://avatars.steamstatic.com https://avatars.akamai.steamstatic.com https://*.googleusercontent.com https://cdn.discordapp.com",
  // e.cs2cap.com is the PostHog reverse proxy (api_host) that ingests analytics.
  // analytics.ahrefs.com is where the Ahrefs tag beacons pageview data.
  "connect-src 'self' https://api.cs2c.app https://cdn.jsdelivr.net https://e.cs2cap.com https://analytics.ahrefs.com",
  "frame-ancestors 'self'",
  "frame-src 'self'",
  "form-action 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // No `require-trusted-types-for`: Next.js 16 / Turbopack do not route their
  // own bundler & hydration script writes through Trusted Types policies and
  // expose no config to make them, so the directive cannot be satisfied.
  // Revisit when Next.js ships native Trusted Types support.
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.cs2c.app",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    formats: ["image/webp"],
  },
  async headers() {
    // Only real production gets HSTS + framing lockdown. VERCEL_ENV is
    // "production" only on the production deployment; it is unset locally
    // (`pnpm dev`/`pnpm build`) and "preview" on preview deployments.
    const isProduction = process.env.VERCEL_ENV === "production";

    // CSP violation reports are sent to PostHog through the e.cs2cap.com reverse
    // proxy (ingested as `$csp_violation` events). The `/report/` trailing slash is
    // required by PostHog; `v` versions the policy so violations can be attributed
    // to CSP rule changes. Guarded so a missing build-time token never ships a
    // `token=undefined` URL — without it, we emit the policy with no reporting.
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    const reportUrl = token
      ? `https://e.cs2cap.com/report/?token=${token}&v=1`
      : null;

    const csp = [
      ...cspDirectives,
      ...(reportUrl ? [`report-uri ${reportUrl}`, "report-to posthog"] : []),
    ].join("; ");

    // Enforce in production; Report-Only in dev/preview so local workflows and
    // preview tooling aren't blocked while violations are still being observed.
    const cspHeader = {
      key: isProduction
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only",
      value: csp,
    };

    // Safe everywhere — these neither break local dev nor block embedding.
    const baseHeaders = [
      // Isolate the browsing context group. allow-popups keeps OAuth/popup flows working.
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin-allow-popups",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Modern Reporting API endpoint for CSP violation reports.
      ...(reportUrl
        ? [{ key: "Reporting-Endpoints", value: `posthog="${reportUrl}"` }]
        : []),
      cspHeader,
    ];

    // Production-only. In dev these actively break things without adding value:
    // HSTS poisons `localhost` into forcing HTTPS (dev server speaks HTTP), and
    // X-Frame-Options / frame-ancestors block the app from being embedded in
    // preview tools (e.g. Lovable's cross-origin preview iframe).
    const productionHeaders = isProduction
      ? [
          // Force HTTPS for two years, cover all subdomains, allow preload-list inclusion.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Disallow framing by other origins (legacy). Modern `frame-ancestors`
          // ships in the enforced Content-Security-Policy above (`baseHeaders`).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ]
      : [];

    return [
      {
        source: "/:path*",
        headers: [...productionHeaders, ...baseHeaders],
      },
      {
        // /search is dynamically rendered (reads searchParams) but fetches its
        // data anonymously (getSearchPageData → anon: true), so every visitor
        // gets identical HTML for a given query and the response sets no cookies.
        // Cache it on Vercel's Edge so bot/crawler traffic is absorbed by the CDN
        // instead of invoking the function per request. We set the CDN-specific
        // headers rather than plain Cache-Control: Next.js overwrites
        // `Cache-Control` on dynamically-rendered pages, but `Vercel-CDN-Cache-Control`
        // / `CDN-Cache-Control` are left untouched and take precedence for the Edge cache.
        source: "/search",
        headers: [
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/dashboard",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/watchlist",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/alerts",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/account/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/item/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/sitemap.xml",
        destination: "/sitemap-index",
      },
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
