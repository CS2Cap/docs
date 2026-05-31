import type { MetadataRoute } from "next";

const BASE = "https://cs2cap.com";

const USER_DISALLOW = [
  "/login",
  "/dashboard",
  "/account",
  "/watchlist",
  "/alerts",
  "/item/",
  "/verify-email",
];

const BOT_DISALLOW = [
  "/item/",
  "/api/",
  "/_next/data/",
  "/login",
  "/dashboard",
  "/account",
  "/watchlist",
  "/alerts",
  "/verify-email",
  "/auth/",
];

const META_BOTS = [
  "meta-externalfetcher",
  "meta-webindexer",
  "meta-externalagent",
  "facebookexternalhit",
  "facebot",
  "facebookbot",
];

const BLOCKED_BOTS = ["MJ12bot"];

const APPROVED_BOTS = [
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "Googlebot",
  "Applebot",
  "Bingbot",
  "DuckDuckBot",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: USER_DISALLOW,
      },
      ...[...META_BOTS, ...BLOCKED_BOTS].map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
      ...APPROVED_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: BOT_DISALLOW,
      })),
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
