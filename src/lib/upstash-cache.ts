import "server-only";

import { gunzipSync, gzipSync } from "node:zlib";
import type { MarketItemsSnapshotResponse, MarketTimeframe } from "./api/types";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const SNAPSHOT_CACHE_PREFIX = "market-snapshot:v1";
// Keep entries in Redis for 24h so we can always serve a stale copy while we refresh in the background.
const SNAPSHOT_CACHE_TTL_SECONDS = 60 * 60 * 24;
// Consider the snapshot "fresh" for 5 minutes — beyond that we revalidate in the background (SWR).
const SNAPSHOT_FRESH_SECONDS = 60 * 5;
const SNAPSHOT_CHUNK_SIZE = 4_000_000;

// In-memory L1 cache so hot requests on the same server instance skip the Upstash roundtrip entirely.
const MEMORY_CACHE_TTL_MS = 60 * 1000;
type MemoryCacheEntry = {
  snapshot: MarketItemsSnapshotResponse;
  cachedAt: number;
  expiresAt: number;
};
const memoryCache = new Map<MarketTimeframe, MemoryCacheEntry>();
const inflightRefreshes = new Map<MarketTimeframe, Promise<void>>();

type SnapshotCacheMeta = {
  encoding: "gzip-base64";
  chunkCount: number;
  cachedAt: string;
};

export type CachedSnapshotResult = {
  snapshot: MarketItemsSnapshotResponse;
  cachedAt: number;
  isStale: boolean;
};

function hasUpstashConfig() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

function getSnapshotCacheBaseKey(timeframe: MarketTimeframe) {
  return `${SNAPSHOT_CACHE_PREFIX}:${timeframe}`;
}

function getSnapshotMetaKey(timeframe: MarketTimeframe) {
  return `${getSnapshotCacheBaseKey(timeframe)}:meta`;
}

function getSnapshotChunkKey(timeframe: MarketTimeframe, index: number) {
  return `${getSnapshotCacheBaseKey(timeframe)}:chunk:${index}`;
}

async function upstashGet(key: string) {
  if (!hasUpstashConfig()) {
    return null;
  }

  try {
    const response = await fetch(
      `${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`,
      {
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { result?: string | null; error?: string };
    if (payload.error) {
      return null;
    }

    return payload.result ?? null;
  } catch {
    return null;
  }
}

async function upstashMget(keys: string[]) {
  if (!hasUpstashConfig() || keys.length === 0) {
    return [];
  }

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

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      result?: Array<string | null>;
      error?: string;
    };

    if (payload.error || !Array.isArray(payload.result)) {
      return null;
    }

    return payload.result;
  } catch {
    return null;
  }
}

async function upstashSet(key: string, value: string, ttlSeconds: number) {
  if (!hasUpstashConfig()) {
    return false;
  }

  try {
    const response = await fetch(
      `${UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        },
        cache: "no-store",
        body: value,
        signal: AbortSignal.timeout(12000),
      },
    );

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { result?: string; error?: string };
    return payload.result === "OK" && !payload.error;
  } catch {
    return false;
  }
}

function splitIntoChunks(value: string, chunkSize: number) {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function getCachedMarketItemsSnapshot(
  timeframe: MarketTimeframe,
): Promise<CachedSnapshotResult | null> {
  // L1: in-memory
  const memEntry = memoryCache.get(timeframe);
  const now = Date.now();
  if (memEntry && memEntry.expiresAt > now) {
    return {
      snapshot: memEntry.snapshot,
      cachedAt: memEntry.cachedAt,
      isStale: now - memEntry.cachedAt > SNAPSHOT_FRESH_SECONDS * 1000,
    };
  }

  // L2: Upstash
  const rawMeta = await upstashGet(getSnapshotMetaKey(timeframe));
  if (!rawMeta) {
    return null;
  }

  try {
    const meta = JSON.parse(rawMeta) as SnapshotCacheMeta;
    if (meta.encoding !== "gzip-base64" || meta.chunkCount < 1) {
      return null;
    }

    const chunkKeys = Array.from({ length: meta.chunkCount }, (_, index) =>
      getSnapshotChunkKey(timeframe, index),
    );
    const chunkValues = await upstashMget(chunkKeys);
    if (!chunkValues || chunkValues.some((value) => typeof value !== "string")) {
      return null;
    }

    const encodedPayload = chunkValues.join("");
    const compressedPayload = Buffer.from(encodedPayload, "base64");
    const decompressedPayload = gunzipSync(compressedPayload).toString("utf8");

    const snapshot = JSON.parse(decompressedPayload) as MarketItemsSnapshotResponse;
    const cachedAt = new Date(meta.cachedAt).getTime() || now;

    // Promote to L1.
    memoryCache.set(timeframe, {
      snapshot,
      cachedAt,
      expiresAt: now + MEMORY_CACHE_TTL_MS,
    });

    return {
      snapshot,
      cachedAt,
      isStale: now - cachedAt > SNAPSHOT_FRESH_SECONDS * 1000,
    };
  } catch {
    return null;
  }
}

export async function setCachedMarketItemsSnapshot(
  timeframe: MarketTimeframe,
  snapshot: MarketItemsSnapshotResponse,
) {
  const now = Date.now();
  memoryCache.set(timeframe, {
    snapshot,
    cachedAt: now,
    expiresAt: now + MEMORY_CACHE_TTL_MS,
  });

  const rawPayload = JSON.stringify(snapshot);
  const encodedPayload = gzipSync(rawPayload).toString("base64");
  const chunks = splitIntoChunks(encodedPayload, SNAPSHOT_CHUNK_SIZE);

  for (const [index, chunk] of chunks.entries()) {
    const ok = await upstashSet(
      getSnapshotChunkKey(timeframe, index),
      chunk,
      SNAPSHOT_CACHE_TTL_SECONDS,
    );

    if (!ok) {
      return false;
    }
  }

  const meta: SnapshotCacheMeta = {
    encoding: "gzip-base64",
    chunkCount: chunks.length,
    cachedAt: new Date().toISOString(),
  };

  return upstashSet(
    getSnapshotMetaKey(timeframe),
    JSON.stringify(meta),
    SNAPSHOT_CACHE_TTL_SECONDS,
  );
}

/**
 * Coalesce concurrent background refreshes so we never hit the upstream more than once
 * per timeframe at a time. The provided refresher is responsible for actually fetching
 * the snapshot and persisting it via setCachedMarketItemsSnapshot.
 */
export function refreshMarketItemsSnapshotInBackground(
  timeframe: MarketTimeframe,
  refresher: () => Promise<void>,
) {
  if (inflightRefreshes.has(timeframe)) {
    return;
  }

  const promise = refresher().finally(() => {
    inflightRefreshes.delete(timeframe);
  });

  inflightRefreshes.set(timeframe, promise);
}
