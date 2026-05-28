import type { MetadataRoute } from "next";
import { SEO_PAGES } from "@/lib/seo/landing-pages";

const BASE = "https://cs2cap.com";

export async function generateSitemaps() {
  return [{ id: 0 }];
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const idStr = await props.id;
  const id = Number.parseInt(idStr, 10);
  const lastModified = new Date();

  if (!Number.isFinite(id) || id === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      { url: BASE, lastModified, changeFrequency: "daily", priority: 1.0 },
      { url: `${BASE}/cs2-market-cap`, lastModified, changeFrequency: "hourly", priority: 0.9 },
      { url: `${BASE}/api-info`, lastModified, changeFrequency: "weekly", priority: 0.9 },
      { url: `${BASE}/apis`, lastModified, changeFrequency: "weekly", priority: 0.8 },
      { url: `${BASE}/features`, lastModified, changeFrequency: "weekly", priority: 0.8 },
      { url: `${BASE}/marketplaces`, lastModified, changeFrequency: "weekly", priority: 0.8 },
      { url: `${BASE}/pricing`, lastModified, changeFrequency: "weekly", priority: 0.8 },
      { url: `${BASE}/search`, lastModified, changeFrequency: "daily", priority: 0.7 },
      { url: `${BASE}/inventory-value`, lastModified, changeFrequency: "weekly", priority: 0.7 },
      { url: `${BASE}/terms`, lastModified, changeFrequency: "monthly", priority: 0.3 },
      { url: `${BASE}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    ];

    const seoPages: MetadataRoute.Sitemap = SEO_PAGES.filter((p) => p.includeInSitemap).map(
      (p) => ({
        url: `${BASE}${p.canonicalPath}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: p.type === "general" ? 0.8 : 0.6,
      }),
    );

    return [...staticPages, ...seoPages];
  }

  return [];
}
