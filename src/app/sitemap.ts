import type { MetadataRoute } from "next";
import { SEO_PAGES } from "@/lib/seo/landing-pages";

const BASE = "https://cs2cap.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/api-info`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/search`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const seoPages: MetadataRoute.Sitemap = SEO_PAGES.filter((p) => p.includeInSitemap).map(
    (p) => ({
      url: `${BASE}${p.canonicalPath}`,
      changeFrequency: "weekly" as const,
      priority: p.type === "general" ? 0.8 : 0.6,
    })
  );

  return [...staticPages, ...seoPages];
}
