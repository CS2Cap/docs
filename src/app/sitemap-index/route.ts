import { API_BASE_URL } from "@/lib/api/config";
import type { ItemsMetadataResponse } from "@/lib/api/types";

const BASE = "https://cs2cap.com";
const ITEM_CHUNK_SIZE = 5000;
const REVALIDATE = 86400;

export const revalidate = 86400;

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

export async function GET() {
  const metadata = await publicFetch<ItemsMetadataResponse>("/v1/web/items/metadata");
  const totalItems = metadata?.catalog.total_items ?? 0;
  const itemChunkCount = Math.ceil(totalItems / ITEM_CHUNK_SIZE);
  const lastmod = new Date().toISOString();

  const sitemaps = Array.from({ length: itemChunkCount + 1 }, (_, id) => id)
    .map(
      (id) =>
        `  <sitemap><loc>${BASE}/sitemap/${id}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
