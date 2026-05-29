import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import {
  checkRateLimit,
  readCachedValuation,
  writeCachedValuation,
} from "@/lib/inventory-value-cache";
import {
  resolveCatalogIds,
  catalogKey,
  type CatalogResolution,
} from "@/lib/catalog-index";
import type {
  InventoryValueResolvedItem,
  InventoryValueToolResponse,
  InventoryValueUnmatchedItem,
  PortfolioValueResponse,
  SteamInventoryItem,
  SteamInventoryLookupResponse,
} from "@/lib/api/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SERVICE_KEY = process.env.CS2CAP_PUBLIC_TOOL_API_KEY;

const STEAM_ID_64_REGEX = /^7656119\d{10}$/;
const VANITY_REGEX = /^[A-Za-z0-9_-]{2,32}$/;
const MAX_INPUT_LENGTH = 256;
const VALUATION_CHUNK_SIZE = 100;
const VALUATION_CONCURRENCY = 4;
const VALUATION_CURRENCY = "USD";

// Rate limits: best-effort fixed window.
const IP_RATE_LIMIT = 30;
const IP_RATE_WINDOW_SECONDS = 60;
const TARGET_RATE_LIMIT = 12;
const TARGET_RATE_WINDOW_SECONDS = 60;

interface NormalizedTarget {
  // What we send upstream as ?steam_id= — either a 17-digit ID or a vanity name.
  upstreamValue: string;
  // Stable cache key form ("id64:..." or "vanity:...").
  cacheKey: string;
  kind: "steam_id_64" | "vanity";
}

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event: `inventory_value.${event}`, ...fields }));
}

function jsonError(
  status: number,
  code: string,
  detail: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ code, detail, ...extra }, { status });
}

function normalizeSteamInput(raw: string): NormalizedTarget | null {
  const value = raw.trim();
  if (!value || value.length > MAX_INPUT_LENGTH) return null;

  // Strip protocol and trailing slashes, lowercase the host portion only.
  const urlMatch = value.match(
    /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/(profiles|id)\/([^/?#]+)\/?/i,
  );
  if (urlMatch) {
    const [, kind, payload] = urlMatch;
    if (kind.toLowerCase() === "profiles") {
      if (STEAM_ID_64_REGEX.test(payload)) {
        return { upstreamValue: payload, cacheKey: `id64:${payload}`, kind: "steam_id_64" };
      }
      return null;
    }
    // /id/<vanity>
    if (VANITY_REGEX.test(payload)) {
      return {
        upstreamValue: payload,
        cacheKey: `vanity:${payload.toLowerCase()}`,
        kind: "vanity",
      };
    }
    return null;
  }

  // Bare 17-digit numeric → SteamID64.
  if (STEAM_ID_64_REGEX.test(value)) {
    return { upstreamValue: value, cacheKey: `id64:${value}`, kind: "steam_id_64" };
  }

  // Bare vanity name.
  if (VANITY_REGEX.test(value)) {
    return {
      upstreamValue: value,
      cacheKey: `vanity:${value.toLowerCase()}`,
      kind: "vanity",
    };
  }

  return null;
}

function getClientIp(request: NextRequest): string {
  // Prefer x-real-ip: Vercel sets it to the true client IP and it can't be
  // spoofed by the caller. The leftmost x-forwarded-for value is client-claimed,
  // so fall back to the rightmost (proxy-appended) entry instead.
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim() || "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",").pop()?.trim() || "unknown";
  }
  return "unknown";
}

interface UpstreamRequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
}

interface UpstreamResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  errorBody?: unknown;
}

async function upstreamRequest<T>(
  path: string,
  options: UpstreamRequestOptions = {},
): Promise<UpstreamResult<T>> {
  const { method = "GET", body, timeoutMs = 15000 } = options;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${SERVICE_KEY}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      cache: "no-store",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      let errorBody: unknown = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text().catch(() => null);
      }
      return { ok: false, status: response.status, errorBody };
    }

    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data };
  } catch (error) {
    logEvent("upstream_fetch_failed", {
      path,
      method,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, status: 0 };
  }
}

function detectPrivateInventory(status: number, errorBody: unknown): boolean {
  if (status === 403) return true;
  if (typeof errorBody === "object" && errorBody !== null) {
    const code = (errorBody as { code?: string }).code?.toLowerCase() ?? "";
    const detail = JSON.stringify((errorBody as { detail?: unknown }).detail ?? "").toLowerCase();
    if (code.includes("private") || detail.includes("private")) return true;
  }
  return false;
}

interface GroupedResolved {
  item_id: number;
  market_hash_name: string;
  phase: string | null;
  icon_url: string;
  tradable: boolean;
  marketable: boolean;
  quantity: number;
}

interface ResolutionOutput {
  grouped: Map<number, GroupedResolved>;
  unmatched: InventoryValueUnmatchedItem[];
}

function resolveInventory(
  inventory: SteamInventoryItem[],
  catalog: CatalogResolution,
): ResolutionOutput {
  const grouped = new Map<number, GroupedResolved>();
  const unmatched: InventoryValueUnmatchedItem[] = [];

  for (const asset of inventory) {
    const phase = asset.phase ?? null;
    const itemId = catalog.get(catalogKey(asset.market_hash_name, phase));

    if (itemId === undefined) {
      unmatched.push({
        assetid: asset.assetid,
        market_hash_name: asset.market_hash_name,
        phase,
        icon_url: asset.icon_url,
        quantity: asset.quantity,
        reason: "no_catalog_match",
      });
      continue;
    }

    const existing = grouped.get(itemId);
    if (existing) {
      existing.quantity += asset.quantity;
      // If any asset is tradable/marketable, surface that on the row.
      existing.tradable = existing.tradable || asset.tradable;
      existing.marketable = existing.marketable || asset.marketable;
    } else {
      grouped.set(itemId, {
        item_id: itemId,
        market_hash_name: asset.market_hash_name,
        phase,
        icon_url: asset.icon_url,
        tradable: asset.tradable,
        marketable: asset.marketable,
        quantity: asset.quantity,
      });
    }
  }

  return { grouped, unmatched };
}

async function valueResolvedItems(
  grouped: Map<number, GroupedResolved>,
): Promise<{
  lineItemsById: Map<number, PortfolioValueResponse["data"]["line_items"][number]>;
  totalValue: number;
  itemsValued: number;
  itemsNotFound: Set<number>;
  providersQueried: Set<string>;
  failed: boolean;
}> {
  const lineItemsById = new Map<
    number,
    PortfolioValueResponse["data"]["line_items"][number]
  >();
  const itemsNotFound = new Set<number>();
  const providersQueried = new Set<string>();
  let totalValue = 0;
  let itemsValued = 0;
  let failed = false;

  const entries = Array.from(grouped.values());
  const chunks: GroupedResolved[][] = [];
  for (let i = 0; i < entries.length; i += VALUATION_CHUNK_SIZE) {
    chunks.push(entries.slice(i, i + VALUATION_CHUNK_SIZE));
  }

  let cursor = 0;
  async function worker() {
    while (cursor < chunks.length) {
      const idx = cursor++;
      const chunk = chunks[idx];
      const result = await upstreamRequest<PortfolioValueResponse>("/v1/portfolio/value", {
        method: "POST",
        body: {
          items: chunk.map(({ item_id, quantity }) => ({ item_id, quantity })),
          currency: VALUATION_CURRENCY,
        },
        timeoutMs: 15000,
      });

      if (!result.ok || !result.data) {
        failed = true;
        continue;
      }

      const { data, meta } = result.data;
      totalValue += data.total_value ?? 0;
      itemsValued += data.items_valued ?? 0;
      for (const id of data.items_not_found ?? []) {
        itemsNotFound.add(id);
      }
      for (const provider of meta?.providers_queried ?? []) {
        providersQueried.add(provider);
      }
      for (const line of data.line_items ?? []) {
        lineItemsById.set(line.item_id, line);
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(VALUATION_CONCURRENCY, chunks.length) },
      () => worker(),
    ),
  );

  return {
    lineItemsById,
    totalValue,
    itemsValued,
    itemsNotFound,
    providersQueried,
    failed,
  };
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  // 1. Parse + validate body.
  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Request body must be JSON.");
  }
  const rawSteamId = (bodyJson as { steam_id?: unknown })?.steam_id;
  if (typeof rawSteamId !== "string" || rawSteamId.length === 0) {
    return jsonError(400, "MISSING_STEAM_ID", "Provide a Steam ID, vanity name, or profile URL.");
  }
  if (rawSteamId.length > MAX_INPUT_LENGTH) {
    return jsonError(400, "INPUT_TOO_LONG", "That input is too long.");
  }

  // 2. Normalize.
  const target = normalizeSteamInput(rawSteamId);
  if (!target) {
    return jsonError(
      400,
      "INVALID_STEAM_ID",
      "Couldn't recognize that as a SteamID64, vanity name, or Steam profile URL.",
    );
  }

  // 3. Service key check.
  if (!SERVICE_KEY) {
    logEvent("service_key_missing", { target_kind: target.kind });
    return jsonError(
      503,
      "SERVICE_UNAVAILABLE",
      "This tool is temporarily unavailable. Try again soon.",
    );
  }

  // 4. Rate limiting (per-IP and per-target, both fixed-window).
  const ip = getClientIp(request);
  const ipLimit = await checkRateLimit("ip", ip, IP_RATE_LIMIT, IP_RATE_WINDOW_SECONDS);
  if (!ipLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many lookups right now — try again in a moment.",
    );
  }
  const targetLimit = await checkRateLimit(
    "target",
    target.cacheKey,
    TARGET_RATE_LIMIT,
    TARGET_RATE_WINDOW_SECONDS,
  );
  if (!targetLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many lookups for this profile right now — try again in a moment.",
    );
  }

  // 5. Cache lookup.
  const cached = await readCachedValuation<InventoryValueToolResponse>(target.cacheKey);
  if (cached) {
    logEvent("cache_hit", {
      target_kind: target.kind,
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json({
      ...cached,
      meta: { ...cached.meta, cache_hit: true },
    } satisfies InventoryValueToolResponse);
  }

  // 6. Inventory lookup.
  const inventoryResult = await upstreamRequest<SteamInventoryLookupResponse>(
    `/v1/inventory/steam/lookup?steam_id=${encodeURIComponent(target.upstreamValue)}`,
    { timeoutMs: 20000 },
  );

  if (!inventoryResult.ok) {
    const { status, errorBody } = inventoryResult;
    if (status === 401 || status === 403) {
      // 403 from upstream is most often a private inventory.
      if (detectPrivateInventory(status, errorBody)) {
        return jsonError(
          403,
          "PRIVATE_INVENTORY",
          "This inventory is private. The owner needs to set their CS2 inventory to public on Steam.",
        );
      }
      // 401 → our key is bad. Don't leak that.
      logEvent("upstream_unauthorized", { status });
      return jsonError(
        503,
        "SERVICE_UNAVAILABLE",
        "This tool is temporarily unavailable. Try again soon.",
      );
    }
    if (status === 404) {
      return jsonError(
        404,
        "STEAM_PROFILE_NOT_FOUND",
        target.kind === "vanity"
          ? "Couldn't find a Steam profile for that name."
          : "Couldn't find a Steam profile for that ID.",
      );
    }
    if (status === 429) {
      return jsonError(
        429,
        "UPSTREAM_RATE_LIMITED",
        "Too many lookups right now — try again in a moment.",
      );
    }
    logEvent("upstream_inventory_failed", { status });
    return jsonError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "Couldn't reach the market right now. Try again in a moment.",
    );
  }

  const inventory = inventoryResult.data?.data ?? [];
  const steamInventoryTotal = inventoryResult.data?.total_count ?? inventory.length;

  if (inventory.length === 0) {
    const empty: InventoryValueToolResponse = {
      meta: {
        generated_at: new Date().toISOString(),
        steam_inventory_total: steamInventoryTotal,
        resolved_distinct_item_count: 0,
        cache_hit: false,
      },
      stats: {
        total_value: 0,
        currency: VALUATION_CURRENCY,
        items_priced: 0,
        items_unpriced: 0,
        units_total: 0,
        providers_queried_count: 0,
      },
      items: [],
      unmatched_items: [],
    };
    await writeCachedValuation(target.cacheKey, empty);
    return NextResponse.json(empty);
  }

  // 7. Catalog resolution via bulk POST /v1/items.
  let catalog: CatalogResolution;
  try {
    catalog = await resolveCatalogIds(
      SERVICE_KEY,
      inventory.map((item) => ({ market_hash_name: item.market_hash_name, phase: item.phase })),
    );
  } catch (err) {
    logEvent("catalog_lookup_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return jsonError(
      503,
      "SERVICE_UNAVAILABLE",
      "This tool is temporarily unavailable. Try again soon.",
    );
  }
  const { grouped, unmatched } = resolveInventory(inventory, catalog);

  // 8. Valuation in chunks of 100.
  const valuation = await valueResolvedItems(grouped);

  // 9. Build resolved items list.
  const items: InventoryValueResolvedItem[] = [];
  let itemsPriced = 0;
  let itemsUnpriced = 0;
  let unitsTotal = 0;

  for (const [itemId, group] of grouped) {
    const line = valuation.lineItemsById.get(itemId);
    if (!line) {
      // Resolved but valuation didn't return it → unmatched (valuation_missing).
      unmatched.push({
        assetid: `item:${itemId}`,
        market_hash_name: group.market_hash_name,
        phase: group.phase,
        icon_url: group.icon_url,
        quantity: group.quantity,
        reason: "valuation_missing",
      });
      continue;
    }

    const bestAsk = line.best_ask ?? null;
    const bestBid = line.best_bid ?? null;
    const itemValue = line.item_value ?? 0;

    items.push({
      item_id: itemId,
      market_hash_name: group.market_hash_name,
      phase: group.phase,
      icon_url: group.icon_url,
      tradable: group.tradable,
      marketable: group.marketable,
      quantity: group.quantity,
      best_ask: bestAsk,
      best_bid: bestBid,
      item_value: itemValue,
      providers: line.providers ?? [],
    });

    unitsTotal += group.quantity;
    if (bestAsk !== null && bestAsk > 0) {
      itemsPriced += 1;
    } else {
      itemsUnpriced += 1;
    }
  }
  // Unmatched assets also count toward "unpriced".
  itemsUnpriced += unmatched.length;

  // Sort items by line value desc by default.
  items.sort((a, b) => (b.item_value ?? 0) - (a.item_value ?? 0));

  const response: InventoryValueToolResponse = {
    meta: {
      generated_at: new Date().toISOString(),
      steam_inventory_total: steamInventoryTotal,
      resolved_distinct_item_count: grouped.size,
      cache_hit: false,
    },
    stats: {
      total_value: valuation.totalValue,
      currency: VALUATION_CURRENCY,
      items_priced: itemsPriced,
      items_unpriced: itemsUnpriced,
      units_total: unitsTotal,
      providers_queried_count: valuation.providersQueried.size,
    },
    items,
    unmatched_items: unmatched,
  };

  // Only cache when valuation didn't fall over.
  if (!valuation.failed) {
    await writeCachedValuation(target.cacheKey, response);
  }

  logEvent("response", {
    target_kind: target.kind,
    inventory_size: inventory.length,
    distinct_resolved: grouped.size,
    unmatched: unmatched.length,
    items_priced: itemsPriced,
    items_unpriced: itemsUnpriced,
    valuation_failed: valuation.failed,
    duration_ms: Date.now() - startedAt,
  });

  return NextResponse.json(response);
}
