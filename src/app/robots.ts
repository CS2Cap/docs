import type { MetadataRoute } from "next";
import { API_BASE_URL } from "@/lib/api/config";
import type { ItemsMetadataResponse } from "@/lib/api/types";

const BASE = "https://cs2cap.com";
const ITEM_CHUNK_SIZE = 5000;
const REVALIDATE = 86400;

async function publicFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: REVALIDATE },
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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const metadata = await publicFetch<ItemsMetadataResponse>("/v1/web/items/metadata");
  const totalItems = metadata?.catalog.total_items ?? 0;
  const itemChunkCount = Math.ceil(totalItems / ITEM_CHUNK_SIZE);
  const sitemapUrls = Array.from(
    { length: itemChunkCount + 1 },
    (_, id) => `${BASE}/sitemap/${id}.xml`,
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/account", "/watchlist", "/alerts", "/verify-email"],
      },
    ],
    sitemap: sitemapUrls,
  };
}
