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
const marketBlobPath = (tf: MarketTimeframe) => `snapshots/market-${tf}.json.gz`;

// ── Freshness windows ─────────────────────────────────────────────────────────

const MARKET_FRESH_MS = 5 * 60 * 1000;
const PRICES_FRESH_MS = 30 * 60 * 1000;
const BIDS_FRESH_MS = 30 * 60 * 1000;
const ITEMS_FRESH_MS = 24 * 60 * 60 * 1000;

// ── L1 in-memory cache ────────────────────────────────────────────────────────

const MEMORY_TTL_MS = 60 * 1000;

type Entry<T> = { data: T; uploadedAt: number; expiresAt: number };
const l1 = new Map<string, Entry<unknown>>();
const inflights = new Map<string, Promise<void>>();

// ── Generic Blob helpers ──────────────────────────────────────────────────────

async function readBlob<T>(pathname: string): Promise<{ data: T; uploadedAt: number } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const blob = blobs.find((b) => b.pathname === pathname);
    if (!blob) return null;
    const res = await fetch(blob.url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = JSON.parse(
      gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8"),
    ) as T;
    return { data, uploadedAt: blob.uploadedAt.getTime() };
  } catch {
    return null;
  }
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
  l1.set(key, { data, uploadedAt, expiresAt: Date.now() + MEMORY_TTL_MS } as Entry<unknown>);
}

async function getCached<T>(
  blobPath: string,
  freshMs: number,
): Promise<CachedSnapshotResult<T> | null> {
  const hit = fromL1<T>(blobPath, freshMs);
  if (hit) return hit;
  const result = await readBlob<T>(blobPath);
  if (!result) return null;
  toL1(blobPath, result.data, result.uploadedAt);
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
  const p = refresher().finally(() => inflights.delete(key));
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

export function refreshPricesSnapshotInBackground(refresher: () => Promise<void>) {
  refreshInBackground(PRICES_BLOB, refresher);
}

// ── Bids snapshot ─────────────────────────────────────────────────────────────

export async function getCachedBidsSnapshot(): Promise<CachedSnapshotResult<BidsSnapshotData> | null> {
  return getCached<BidsSnapshotData>(BIDS_BLOB, BIDS_FRESH_MS);
}

export async function setCachedBidsSnapshot(data: BidsSnapshotData): Promise<boolean> {
  return setCached(data, BIDS_BLOB);
}

export function refreshBidsSnapshotInBackground(refresher: () => Promise<void>) {
  refreshInBackground(BIDS_BLOB, refresher);
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
