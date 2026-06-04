import "server-only";

import { gunzipSync, gzipSync } from "node:zlib";
import { list, put } from "@vercel/blob";
import type {
  BuyOrderItem,
  ItemOut,
  MarketItem,
  MarketItemsSnapshotResponse,
  MarketTimeframe,
} from "./api/types";
import type { BrowseNavData } from "./browse/nav-types";

// ── Exported snapshot data types ──────────────────────────────────────────────

export type PricesSnapshotData = {
  byItemId: Record<number, MarketItem[]>;
  timestamp: string;
};

export type BidsSnapshotData = {
  byItemId: Record<number, BuyOrderItem[]>;
  timestamp: string;
};

export type ItemsSnapshotData = {
  items: ItemOut[];
  byItemId: Record<number, ItemOut>;
  total: number;
  timestamp: string;
};

export type CachedSnapshotResult<T> = {
  snapshot: T;
  cachedAt: number;
  isStale: boolean;
};

// ── Blob pathnames ────────────────────────────────────────────────────────────

const PRICES_BLOB = "snapshots/prices.json.gz";
const BIDS_BLOB = "snapshots/bids.json.gz";
const ITEMS_BLOB = "snapshots/items.json.gz";
const BROWSE_NAV_BLOB = "snapshots/browse-nav.json.gz";
const marketBlobPath = (tf: MarketTimeframe) => `snapshots/market-${tf}.json.gz`;

// ── Freshness windows ─────────────────────────────────────────────────────────

const MARKET_FRESH_MS = 5 * 60 * 1000;
const PRICES_FRESH_MS = 30 * 60 * 1000;
const BIDS_FRESH_MS = 30 * 60 * 1000;
const ITEMS_FRESH_MS = 24 * 60 * 60 * 1000;
const BROWSE_NAV_FRESH_MS = 24 * 60 * 60 * 1000;

// ── Distributed refresh lock (Upstash Redis SET NX) ──────────────────────────

const _REFRESH_LOCK_PREFIX = "snapshot-refresh-lock:v1";
const _REFRESH_LOCK_TTL_SEC = 300;

async function _tryAcquireRefreshLock(blobPath: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return true;
  const lockKey = `${_REFRESH_LOCK_PREFIX}:${blobPath.replace(/\//g, ":")}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(["SET", lockKey, "1", "NX", "EX", _REFRESH_LOCK_TTL_SEC]),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return true;
    const payload = (await res.json()) as { result?: string | null };
    return payload.result === "OK";
  } catch {
    return true;
  }
}

// ── L1 in-memory cache ────────────────────────────────────────────────────────

// Per-blob L1 TTL. Snapshots are read-mostly global data, so we keep them in
// memory for roughly the same horizon as their freshness window — the blob
// `uploadedAt` tells us if the entry is stale; we just need it in RAM long
// enough to amortize Blob fetches across requests on the same warm instance.
// Items snapshot is large (MBs gzipped) and changes at most daily.
const DEFAULT_MEMORY_TTL_MS = 5 * 60 * 1000;
const MEMORY_TTL_BY_PATH: Record<string, number> = {
  [ITEMS_BLOB]: ITEMS_FRESH_MS,
  [PRICES_BLOB]: PRICES_FRESH_MS,
  [BIDS_BLOB]: BIDS_FRESH_MS,
  [BROWSE_NAV_BLOB]: BROWSE_NAV_FRESH_MS,
};

type Entry<T> = { data: T; uploadedAt: number; expiresAt: number };
const l1 = new Map<string, Entry<unknown>>();
const inflights = new Map<string, Promise<void>>();
const readInflights = new Map<string, Promise<unknown>>();

// ── Generic Blob helpers ──────────────────────────────────────────────────────

async function readBlob<T>(pathname: string): Promise<{ data: T; uploadedAt: number } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { blobs } = await list({ prefix: pathname, limit: 1 });
      const blob = blobs.find((b) => b.pathname === pathname);
      if (!blob) return null; // genuinely absent (e.g. before first prewarm) — not transient
      const res = await fetch(blob.url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`blob fetch failed: ${res.status}`);
      const data = JSON.parse(
        gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8"),
      ) as T;
      return { data, uploadedAt: blob.uploadedAt.getTime() };
    } catch {
      if (attempt === MAX_ATTEMPTS) return null;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  return null;
}

async function writeBlob<T>(data: T, pathname: string): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    await put(pathname, gzipSync(Buffer.from(JSON.stringify(data))), {
      access: "public",
      contentType: "application/gzip",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return true;
  } catch {
    return false;
  }
}

function fromL1<T>(key: string, freshMs: number): CachedSnapshotResult<T> | null {
  const entry = l1.get(key) as Entry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) return null;
  return {
    snapshot: entry.data,
    cachedAt: entry.uploadedAt,
    isStale: Date.now() - entry.uploadedAt > freshMs,
  };
}

function toL1<T>(key: string, data: T, uploadedAt: number) {
  const ttl = MEMORY_TTL_BY_PATH[key] ?? DEFAULT_MEMORY_TTL_MS;
  l1.set(key, { data, uploadedAt, expiresAt: Date.now() + ttl } as Entry<unknown>);
}

async function getCached<T>(
  blobPath: string,
  freshMs: number,
): Promise<CachedSnapshotResult<T> | null> {
  const hit = fromL1<T>(blobPath, freshMs);
  if (hit) return hit;

  // Coalesce concurrent reads on the same key — a fan-out of N callers (e.g.
  // 10 ticker lookups on the landing page) must not turn into N independent
  // Blob list+fetch+gunzip+parse cycles.
  const existing = readInflights.get(blobPath) as
    | Promise<{ data: T; uploadedAt: number } | null>
    | undefined;
  const promise =
    existing ??
    (async () => {
      try {
        const result = await readBlob<T>(blobPath);
        if (result) toL1(blobPath, result.data, result.uploadedAt);
        return result;
      } finally {
        readInflights.delete(blobPath);
      }
    })();
  if (!existing) readInflights.set(blobPath, promise);

  const result = await promise;
  if (!result) return null;
  return {
    snapshot: result.data,
    cachedAt: result.uploadedAt,
    isStale: Date.now() - result.uploadedAt > freshMs,
  };
}

async function setCached<T>(data: T, blobPath: string): Promise<boolean> {
  toL1(blobPath, data, Date.now());
  return writeBlob(data, blobPath);
}

function refreshInBackground(key: string, refresher: () => Promise<void>) {
  if (inflights.has(key)) return;
  const p = _tryAcquireRefreshLock(key)
    .then((acquired) => (acquired ? refresher() : Promise.resolve()))
    .finally(() => inflights.delete(key));
  inflights.set(key, p);
}

// ── Market items snapshot ─────────────────────────────────────────────────────

export async function getCachedMarketItemsSnapshot(
  timeframe: MarketTimeframe,
): Promise<CachedSnapshotResult<MarketItemsSnapshotResponse> | null> {
  return getCached<MarketItemsSnapshotResponse>(marketBlobPath(timeframe), MARKET_FRESH_MS);
}

export async function setCachedMarketItemsSnapshot(
  timeframe: MarketTimeframe,
  data: MarketItemsSnapshotResponse,
): Promise<boolean> {
  return setCached(data, marketBlobPath(timeframe));
}

export function refreshMarketItemsSnapshotInBackground(
  timeframe: MarketTimeframe,
  refresher: () => Promise<void>,
) {
  refreshInBackground(marketBlobPath(timeframe), refresher);
}

// ── Prices snapshot ───────────────────────────────────────────────────────────

export async function getCachedPricesSnapshot(): Promise<CachedSnapshotResult<PricesSnapshotData> | null> {
  return getCached<PricesSnapshotData>(PRICES_BLOB, PRICES_FRESH_MS);
}

export async function setCachedPricesSnapshot(data: PricesSnapshotData): Promise<boolean> {
  return setCached(data, PRICES_BLOB);
}

// ── Bids snapshot ─────────────────────────────────────────────────────────────

export async function getCachedBidsSnapshot(): Promise<CachedSnapshotResult<BidsSnapshotData> | null> {
  return getCached<BidsSnapshotData>(BIDS_BLOB, BIDS_FRESH_MS);
}

export async function setCachedBidsSnapshot(data: BidsSnapshotData): Promise<boolean> {
  return setCached(data, BIDS_BLOB);
}

// ── Items snapshot ────────────────────────────────────────────────────────────

export async function getCachedItemsSnapshot(): Promise<CachedSnapshotResult<ItemsSnapshotData> | null> {
  return getCached<ItemsSnapshotData>(ITEMS_BLOB, ITEMS_FRESH_MS);
}

export async function setCachedItemsSnapshot(data: ItemsSnapshotData): Promise<boolean> {
  return setCached(data, ITEMS_BLOB);
}

export function refreshItemsSnapshotInBackground(refresher: () => Promise<void>) {
  refreshInBackground(ITEMS_BLOB, refresher);
}

// ── Browse-nav snapshot ───────────────────────────────────────────────────────

// Precomputed mega-menu payload (a few KB). Written by the items cron so the
// /api/browse-nav route serves it without downloading + deduping the full
// multi-MB catalog on each cache miss.
export async function getCachedBrowseNav(): Promise<CachedSnapshotResult<BrowseNavData> | null> {
  return getCached<BrowseNavData>(BROWSE_NAV_BLOB, BROWSE_NAV_FRESH_MS);
}

export async function setCachedBrowseNav(data: BrowseNavData): Promise<boolean> {
  return setCached(data, BROWSE_NAV_BLOB);
}
