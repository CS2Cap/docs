import "server-only";

import { gunzipSync, gzipSync } from "node:zlib";
import type { BuyOrderItem, ItemOut, MarketItem, MarketItemsSnapshotResponse, MarketTimeframe } from "./api/types";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const MARKET_CACHE_PREFIX = "market-snapshot:v1";
const PRICES_CACHE_PREFIX = "prices-snapshot:v1";
const BIDS_CACHE_PREFIX = "bids-snapshot:v1";
const ITEMS_CACHE_PREFIX = "items-snapshot:v1";

const SNAPSHOT_CACHE_TTL_SECONDS = 60 * 60 * 24;
const SNAPSHOT_CHUNK_SIZE = 4_000_000;
const MEMORY_CACHE_TTL_MS = 60 * 1000;

// Freshness: serve stale data beyond this threshold; trigger SWR background refresh.
const MARKET_FRESH_SECONDS = 60 * 5;
const PRICES_FRESH_SECONDS = 60 * 30;
const BIDS_FRESH_SECONDS = 60 * 30;
const ITEMS_FRESH_SECONDS = 60 * 60 * 24;

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

// ── Internal types ────────────────────────────────────────────────────────────

type SnapshotCacheMeta = {
  encoding: "gzip-base64";
  chunkCount: number;
  cachedAt: string;
};

type MemoryCacheEntry<T> = {
  snapshot: T;
  cachedAt: number;
  expiresAt: number;
};

// ── L1 in-memory caches ───────────────────────────────────────────────────────

const marketMemoryCache = new Map<MarketTimeframe, MemoryCacheEntry<MarketItemsSnapshotResponse>>();
let pricesMemoryCache: MemoryCacheEntry<PricesSnapshotData> | null = null;
let bidsMemoryCache: MemoryCacheEntry<BidsSnapshotData> | null = null;
let itemsMemoryCache: MemoryCacheEntry<ItemsSnapshotData> | null = null;

const inflightMarketRefreshes = new Map<MarketTimeframe, Promise<void>>();
let pricesInflight: Promise<void> | null = null;
let bidsInflight: Promise<void> | null = null;
let itemsInflight: Promise<void> | null = null;

// ── Upstash REST helpers ──────────────────────────────────────────────────────

function hasUpstashConfig() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

async function upstashGet(key: string): Promise<string | null> {
  if (!hasUpstashConfig()) return null;
  try {
    const response = await fetch(
      `${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`,
      {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: string | null; error?: string };
    if (payload.error) return null;
    return payload.result ?? null;
  } catch {
    return null;
  }
}

async function upstashMget(keys: string[]): Promise<Array<string | null> | null> {
  if (!hasUpstashConfig() || keys.length === 0) return [];
  try {
    const response = await fetch(UPSTASH_REDIS_REST_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(["MGET", ...keys]),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: Array<string | null>; error?: string };
    if (payload.error || !Array.isArray(payload.result)) return null;
    return payload.result;
  } catch {
    return null;
  }
}

async function upstashSet(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  if (!hasUpstashConfig()) return false;
  try {
    const response = await fetch(
      `${UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
        cache: "no-store",
        body: value,
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok) return false;
    const payload = (await response.json()) as { result?: string; error?: string };
    return payload.result === "OK" && !payload.error;
  } catch {
    return false;
  }
}

function splitIntoChunks(value: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += chunkSize) {
    chunks.push(value.slice(i, i + chunkSize));
  }
  return chunks;
}

// ── Generic Redis read/write ──────────────────────────────────────────────────

async function readSnapshotFromRedis<T>(
  metaKey: string,
  chunkKey: (index: number) => string,
): Promise<{ snapshot: T; cachedAt: number } | null> {
  const rawMeta = await upstashGet(metaKey);
  if (!rawMeta) return null;
  try {
    const meta = JSON.parse(rawMeta) as SnapshotCacheMeta;
    if (meta.encoding !== "gzip-base64" || meta.chunkCount < 1) return null;
    const chunkKeys = Array.from({ length: meta.chunkCount }, (_, i) => chunkKey(i));
    const chunkValues = await upstashMget(chunkKeys);
    if (!chunkValues || chunkValues.some((v) => typeof v !== "string")) return null;
    const encodedPayload = (chunkValues as string[]).join("");
    const compressedPayload = Buffer.from(encodedPayload, "base64");
    const decompressedPayload = gunzipSync(compressedPayload).toString("utf8");
    const snapshot = JSON.parse(decompressedPayload) as T;
    const cachedAt = new Date(meta.cachedAt).getTime() || Date.now();
    return { snapshot, cachedAt };
  } catch {
    return null;
  }
}

async function writeSnapshotToRedis<T>(
  data: T,
  metaKey: string,
  chunkKey: (index: number) => string,
): Promise<boolean> {
  const rawPayload = JSON.stringify(data);
  const encodedPayload = gzipSync(rawPayload).toString("base64");
  const chunks = splitIntoChunks(encodedPayload, SNAPSHOT_CHUNK_SIZE);
  for (const [i, chunk] of chunks.entries()) {
    const ok = await upstashSet(chunkKey(i), chunk, SNAPSHOT_CACHE_TTL_SECONDS);
    if (!ok) return false;
  }
  const meta: SnapshotCacheMeta = {
    encoding: "gzip-base64",
    chunkCount: chunks.length,
    cachedAt: new Date().toISOString(),
  };
  return upstashSet(metaKey, JSON.stringify(meta), SNAPSHOT_CACHE_TTL_SECONDS);
}

// ── Market items snapshot ─────────────────────────────────────────────────────

function marketMetaKey(timeframe: MarketTimeframe) {
  return `${MARKET_CACHE_PREFIX}:${timeframe}:meta`;
}

function marketChunkKey(timeframe: MarketTimeframe, index: number) {
  return `${MARKET_CACHE_PREFIX}:${timeframe}:chunk:${index}`;
}

export async function getCachedMarketItemsSnapshot(
  timeframe: MarketTimeframe,
): Promise<CachedSnapshotResult<MarketItemsSnapshotResponse> | null> {
  const now = Date.now();
  const memEntry = marketMemoryCache.get(timeframe);
  if (memEntry && memEntry.expiresAt > now) {
    return {
      snapshot: memEntry.snapshot,
      cachedAt: memEntry.cachedAt,
      isStale: now - memEntry.cachedAt > MARKET_FRESH_SECONDS * 1000,
    };
  }
  const result = await readSnapshotFromRedis<MarketItemsSnapshotResponse>(
    marketMetaKey(timeframe),
    (i) => marketChunkKey(timeframe, i),
  );
  if (!result) return null;
  marketMemoryCache.set(timeframe, {
    snapshot: result.snapshot,
    cachedAt: result.cachedAt,
    expiresAt: now + MEMORY_CACHE_TTL_MS,
  });
  return {
    snapshot: result.snapshot,
    cachedAt: result.cachedAt,
    isStale: now - result.cachedAt > MARKET_FRESH_SECONDS * 1000,
  };
}

export async function setCachedMarketItemsSnapshot(
  timeframe: MarketTimeframe,
  snapshot: MarketItemsSnapshotResponse,
): Promise<boolean> {
  const now = Date.now();
  marketMemoryCache.set(timeframe, { snapshot, cachedAt: now, expiresAt: now + MEMORY_CACHE_TTL_MS });
  return writeSnapshotToRedis(snapshot, marketMetaKey(timeframe), (i) =>
    marketChunkKey(timeframe, i),
  );
}

export function refreshMarketItemsSnapshotInBackground(
  timeframe: MarketTimeframe,
  refresher: () => Promise<void>,
) {
  if (inflightMarketRefreshes.has(timeframe)) return;
  const promise = refresher().finally(() => inflightMarketRefreshes.delete(timeframe));
  inflightMarketRefreshes.set(timeframe, promise);
}

// ── Prices snapshot ───────────────────────────────────────────────────────────

const PRICES_META_KEY = `${PRICES_CACHE_PREFIX}:meta`;
const pricesChunkKey = (i: number) => `${PRICES_CACHE_PREFIX}:chunk:${i}`;

export async function getCachedPricesSnapshot(): Promise<CachedSnapshotResult<PricesSnapshotData> | null> {
  const now = Date.now();
  if (pricesMemoryCache && pricesMemoryCache.expiresAt > now) {
    return {
      snapshot: pricesMemoryCache.snapshot,
      cachedAt: pricesMemoryCache.cachedAt,
      isStale: now - pricesMemoryCache.cachedAt > PRICES_FRESH_SECONDS * 1000,
    };
  }
  const result = await readSnapshotFromRedis<PricesSnapshotData>(PRICES_META_KEY, pricesChunkKey);
  if (!result) return null;
  pricesMemoryCache = { snapshot: result.snapshot, cachedAt: result.cachedAt, expiresAt: now + MEMORY_CACHE_TTL_MS };
  return {
    snapshot: result.snapshot,
    cachedAt: result.cachedAt,
    isStale: now - result.cachedAt > PRICES_FRESH_SECONDS * 1000,
  };
}

export async function setCachedPricesSnapshot(data: PricesSnapshotData): Promise<boolean> {
  const now = Date.now();
  pricesMemoryCache = { snapshot: data, cachedAt: now, expiresAt: now + MEMORY_CACHE_TTL_MS };
  return writeSnapshotToRedis(data, PRICES_META_KEY, pricesChunkKey);
}

export function refreshPricesSnapshotInBackground(refresher: () => Promise<void>) {
  if (pricesInflight) return;
  pricesInflight = refresher().finally(() => { pricesInflight = null; });
}

// ── Bids snapshot ─────────────────────────────────────────────────────────────

const BIDS_META_KEY = `${BIDS_CACHE_PREFIX}:meta`;
const bidsChunkKey = (i: number) => `${BIDS_CACHE_PREFIX}:chunk:${i}`;

export async function getCachedBidsSnapshot(): Promise<CachedSnapshotResult<BidsSnapshotData> | null> {
  const now = Date.now();
  if (bidsMemoryCache && bidsMemoryCache.expiresAt > now) {
    return {
      snapshot: bidsMemoryCache.snapshot,
      cachedAt: bidsMemoryCache.cachedAt,
      isStale: now - bidsMemoryCache.cachedAt > BIDS_FRESH_SECONDS * 1000,
    };
  }
  const result = await readSnapshotFromRedis<BidsSnapshotData>(BIDS_META_KEY, bidsChunkKey);
  if (!result) return null;
  bidsMemoryCache = { snapshot: result.snapshot, cachedAt: result.cachedAt, expiresAt: now + MEMORY_CACHE_TTL_MS };
  return {
    snapshot: result.snapshot,
    cachedAt: result.cachedAt,
    isStale: now - result.cachedAt > BIDS_FRESH_SECONDS * 1000,
  };
}

export async function setCachedBidsSnapshot(data: BidsSnapshotData): Promise<boolean> {
  const now = Date.now();
  bidsMemoryCache = { snapshot: data, cachedAt: now, expiresAt: now + MEMORY_CACHE_TTL_MS };
  return writeSnapshotToRedis(data, BIDS_META_KEY, bidsChunkKey);
}

export function refreshBidsSnapshotInBackground(refresher: () => Promise<void>) {
  if (bidsInflight) return;
  bidsInflight = refresher().finally(() => { bidsInflight = null; });
}

// ── Items snapshot ────────────────────────────────────────────────────────────

const ITEMS_META_KEY = `${ITEMS_CACHE_PREFIX}:meta`;
const itemsChunkKey = (i: number) => `${ITEMS_CACHE_PREFIX}:chunk:${i}`;

export async function getCachedItemsSnapshot(): Promise<CachedSnapshotResult<ItemsSnapshotData> | null> {
  const now = Date.now();
  if (itemsMemoryCache && itemsMemoryCache.expiresAt > now) {
    return {
      snapshot: itemsMemoryCache.snapshot,
      cachedAt: itemsMemoryCache.cachedAt,
      isStale: now - itemsMemoryCache.cachedAt > ITEMS_FRESH_SECONDS * 1000,
    };
  }
  const result = await readSnapshotFromRedis<ItemsSnapshotData>(ITEMS_META_KEY, itemsChunkKey);
  if (!result) return null;
  itemsMemoryCache = { snapshot: result.snapshot, cachedAt: result.cachedAt, expiresAt: now + MEMORY_CACHE_TTL_MS };
  return {
    snapshot: result.snapshot,
    cachedAt: result.cachedAt,
    isStale: now - result.cachedAt > ITEMS_FRESH_SECONDS * 1000,
  };
}

export async function setCachedItemsSnapshot(data: ItemsSnapshotData): Promise<boolean> {
  const now = Date.now();
  itemsMemoryCache = { snapshot: data, cachedAt: now, expiresAt: now + MEMORY_CACHE_TTL_MS };
  return writeSnapshotToRedis(data, ITEMS_META_KEY, itemsChunkKey);
}

export function refreshItemsSnapshotInBackground(refresher: () => Promise<void>) {
  if (itemsInflight) return;
  itemsInflight = refresher().finally(() => { itemsInflight = null; });
}
