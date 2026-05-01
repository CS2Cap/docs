import "server-only";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const CACHE_PREFIX = "inv-value:v1";
// Cache successful valuations for 60s — long enough to soak up reload-spam,
// short enough that a moved/sold item shows up reasonably fast.
const CACHE_TTL_SECONDS = 60;

// Sliding-window rate limit: counts requests in a window via INCR + EXPIRE.
const RATE_PREFIX = "inv-value-rl:v1";

function hasUpstash() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

async function upstashCommand<T = unknown>(
  command: (string | number)[],
  timeoutMs = 5000,
): Promise<T | null> {
  if (!hasUpstash()) return null;
  try {
    const response = await fetch(UPSTASH_REDIS_REST_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: T; error?: string };
    if (payload.error) return null;
    return (payload.result ?? null) as T | null;
  } catch {
    return null;
  }
}

// In-memory fallback when Upstash isn't configured (dev, preview).
type MemoryEntry = { value: string; expiresAt: number };
const memoryStore = new Map<string, MemoryEntry>();
const memoryCounters = new Map<string, { count: number; resetAt: number }>();

function memoryGet(key: string): string | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds: number) {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memoryIncr(key: string, windowSeconds: number): number {
  const now = Date.now();
  const existing = memoryCounters.get(key);
  if (!existing || existing.resetAt < now) {
    memoryCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

export async function readCachedValuation<T>(target: string): Promise<T | null> {
  const key = `${CACHE_PREFIX}:${target}`;
  if (hasUpstash()) {
    const raw = await upstashCommand<string | null>(["GET", key]);
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
  const raw = memoryGet(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function writeCachedValuation<T>(target: string, value: T): Promise<void> {
  const key = `${CACHE_PREFIX}:${target}`;
  const serialized = JSON.stringify(value);
  if (hasUpstash()) {
    await upstashCommand(["SET", key, serialized, "EX", CACHE_TTL_SECONDS]);
    return;
  }
  memorySet(key, serialized, CACHE_TTL_SECONDS);
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Fixed-window rate limit. We bucket per (scope, key) — typical scopes are
 * "ip" and "target" so we can throttle abusive clients independently from
 * abusive lookups against a single Steam ID.
 */
export async function checkRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const cacheKey = `${RATE_PREFIX}:${scope}:${key}`;
  let count: number;

  if (hasUpstash()) {
    const incr = await upstashCommand<number>(["INCR", cacheKey]);
    if (incr === 1) {
      // First hit in this window — set the TTL.
      await upstashCommand(["EXPIRE", cacheKey, windowSeconds]);
    }
    count = typeof incr === "number" ? incr : 0;
    // If Upstash failed entirely, fall through to allow rather than block.
    if (count === 0) {
      return { allowed: true, count: 0, limit };
    }
  } else {
    count = memoryIncr(cacheKey, windowSeconds);
  }

  return { allowed: count <= limit, count, limit };
}
