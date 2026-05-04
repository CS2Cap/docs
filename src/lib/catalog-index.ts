import "server-only";

import { API_BASE_URL } from "@/lib/api/config";
import type {
  ItemIdLookupRequest,
  ItemIdLookupResponse,
} from "@/lib/api/types";

/**
 * Resolve (market_hash_name, phase?) pairs → canonical CS2C item_ids using
 * the internal bulk lookup endpoint (POST /v1/items). Capped at 1,000 pairs
 * per request; chunks transparently.
 *
 * Returns a Map keyed by `catalogKey(market_hash_name, phase)` so the caller
 * can look up the exact (name, phase) combination from the inventory.
 */

const LOOKUP_CHUNK_SIZE = 1000;
const LOOKUP_TIMEOUT_MS = 15_000;

export type CatalogResolution = Map<string, number>;

/** Composite key used in CatalogResolution maps. */
export function catalogKey(market_hash_name: string, phase: string | null | undefined): string {
  return `${market_hash_name}\0${phase ?? ""}`;
}

interface LookupEntry {
  market_hash_name: string;
  phase: string | null;
}

async function lookupChunk(
  serviceKey: string,
  entries: LookupEntry[],
): Promise<ItemIdLookupResponse> {
  const body: ItemIdLookupRequest = {
    market_hash_names: entries.map((e) => e.market_hash_name),
    phases: entries.map((e) => e.phase),
  };
  const response = await fetch(`${API_BASE_URL}/v1/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`item id lookup failed: ${response.status}`);
  }
  return (await response.json()) as ItemIdLookupResponse;
}

export async function resolveCatalogIds(
  serviceKey: string,
  entries: Iterable<{ market_hash_name: string; phase?: string | null }>,
): Promise<CatalogResolution> {
  // Deduplicate by composite key preserving first occurrence.
  const seen = new Map<string, LookupEntry>();
  for (const e of entries) {
    const key = catalogKey(e.market_hash_name, e.phase ?? null);
    if (!seen.has(key)) {
      seen.set(key, { market_hash_name: e.market_hash_name, phase: e.phase ?? null });
    }
  }

  const unique = Array.from(seen.values());
  const resolved: CatalogResolution = new Map();
  if (unique.length === 0) return resolved;

  for (let i = 0; i < unique.length; i += LOOKUP_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + LOOKUP_CHUNK_SIZE);
    const result = await lookupChunk(serviceKey, chunk);
    for (const entry of result.items) {
      if (entry.item_id !== null && entry.item_id !== undefined) {
        resolved.set(catalogKey(entry.market_hash_name, entry.phase ?? null), entry.item_id);
      }
    }
  }
  return resolved;
}
