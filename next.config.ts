import type { NextConfig } from "next";

// Full intended Content-Security-Policy, shipped in Report-Only mode for now:
// browsers report violations to /api/csp-report but block nothing. Promote to an
// enforcing `Content-Security-Policy` header once the report window is clean.
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // 'unsafe-inline' covers Next.js App Router hydration/streaming scripts (no nonce setup).
  "script-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' covers React inline style attributes (Recharts) + the chart <style> block.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://cdn.cs2c.app https://community.akamai.steamstatic.com",
  // PostHog rides the same-origin /ingest rewrite, so it needs no extra origin here.
  "connect-src 'self' https://api.cs2c.app https://cdn.jsdelivr.net",
  "frame-ancestors 'self'",
  "frame-src 'self'",
  "form-action 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // Trusted Types directive — Report-Only, so this only reports sink violations.
  "require-trusted-types-for 'script'",
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join("; ");

const nextConfig: NextConfig = {
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
    return [
      {
        source: "/:path*",
        headers: [
          // Force HTTPS for two years, cover all subdomains, allow preload-list inclusion.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Disallow framing by other origins (legacy + modern). No enforcing CSP yet —
          // frame-ancestors is the one directive safe to ship without an audited policy.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
          // Isolate the browsing context group. allow-popups keeps OAuth/popup flows working.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Modern Reporting API endpoint for CSP violation reports.
          {
            key: "Reporting-Endpoints",
            value: 'csp-endpoint="/api/csp-report"',
          },
          // Full content policy in Report-Only mode — reports, never blocks.
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly,
          },
        ],
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