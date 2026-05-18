import type { MetadataRoute } from "next";
import { API_BASE_URL } from "@/lib/api/config";
import { buildQuery } from "@/lib/api/shared";
import { SEO_PAGES } from "@/lib/seo/landing-pages";
import { buildItemPath } from "@/lib/seo/itemSlug";
import type { ItemsMetadataResponse, ItemsResponse } from "@/lib/api/types";

const BASE = "https://cs2cap.com";
const ITEM_CHUNK_SIZE = 5000;
const CATALOG_REVALIDATE = 86400;

async function publicFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: CATALOG_REVALIDATE },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function generateSitemaps() {
  const metadata = await publicFetch<ItemsMetadataResponse>("/v1/web/items/metadata");
  const totalItems = metadata?.catalog.total_items ?? 0;
  const itemChunkCount = Math.ceil(totalItems / ITEM_CHUNK_SIZE);
  return Array.from({ length: itemChunkCount + 1 }, (_, id) => ({ id }));
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
      { url: `${BASE}/marketplaces`, lastModified, changeFrequency: "weekly", priority: 0.8 },
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

  const offset = (id - 1) * ITEM_CHUNK_SIZE;
  const response = await publicFetch<ItemsResponse>(
    `/v1/web/items${buildQuery({ limit: ITEM_CHUNK_SIZE, offset })}`,
  );

  return (response?.items ?? [])
    .filter((item): item is typeof item & { item_id: number } => item.item_id != null)
    .map((item) => ({
      url: `${BASE}${buildItemPath(item.item_id, item.market_hash_name)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    }));
}
