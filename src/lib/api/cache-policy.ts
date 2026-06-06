export type EdgeCachePolicy = {
  sMaxAge: number;
  staleWhileRevalidate: number;
};

export type ApiCachePolicy = EdgeCachePolicy & {
  revalidate: number;
};

export function normalizeApiCachePath(pathname: string): string {
  return pathname.replace(/^\/?v1\/web\//, "v1/").replace(/^\//, "");
}

export function matchApiCachePolicy(pathname: string): ApiCachePolicy | null {
  const normalized = normalizeApiCachePath(pathname);

  if (normalized === "v1/items/metadata") {
    return { revalidate: 300, sMaxAge: 300, staleWhileRevalidate: 900 };
  }
  if (normalized === "v1/search") {
    return { revalidate: 15, sMaxAge: 15, staleWhileRevalidate: 60 };
  }
  if (normalized === "v1/market/overview") {
    return { revalidate: 60, sMaxAge: 60, staleWhileRevalidate: 300 };
  }
  if (/^v1\/items\/\d+$/.test(normalized)) {
    return { revalidate: 120, sMaxAge: 120, staleWhileRevalidate: 600 };
  }
  if (normalized === "v1/items") {
    return { revalidate: 300, sMaxAge: 300, staleWhileRevalidate: 900 };
  }
  if (normalized === "v1/providers") {
    return { revalidate: 300, sMaxAge: 300, staleWhileRevalidate: 1800 };
  }
  if (normalized === "v1/prices/history") {
    return { revalidate: 120, sMaxAge: 120, staleWhileRevalidate: 600 };
  }
  if (normalized === "v1/prices/candles") {
    return { revalidate: 300, sMaxAge: 300, staleWhileRevalidate: 1800 };
  }
  if (normalized === "v1/prices") {
    return { revalidate: 30, sMaxAge: 30, staleWhileRevalidate: 120 };
  }
  if (normalized === "v1/fx") {
    return { revalidate: 300, sMaxAge: 300, staleWhileRevalidate: 1800 };
  }
  if (normalized === "v1/sales") {
    return { revalidate: 60, sMaxAge: 60, staleWhileRevalidate: 300 };
  }
  if (normalized === "v1/bids") {
    return { revalidate: 30, sMaxAge: 30, staleWhileRevalidate: 120 };
  }

  return null;
}
