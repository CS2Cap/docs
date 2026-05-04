import "server-only";

import { API_BASE_URL } from "@/lib/api/config";
import type {
  ItemIdLookupRequest,
  ItemIdLookupResponse,
} from "@/lib/api/types";

/**
 * Resolve Steam market_hash_names → canonical CS2C item_ids using the
 * internal bulk lookup endpoint (POST /v1/items, body
 * `{ market_hash_names: [...] }`). Capped at 1,000 names per request by the
 * upstream; we chunk transparently.
 *
 * Returns a Map keyed by the original (case-preserved) name so the caller
 * can look up exactly the inventory's hash names without an extra
 * normalization pass. Names with no catalog match are simply absent from
 * the map.
 */

const LOOKUP_CHUNK_SIZE = 1000;
const LOOKUP_TIMEOUT_MS = 15_000;

export type CatalogResolution = Map<string, number>;

async function lookupChunk(
  serviceKey: string,
  names: string[],
): Promise<ItemIdLookupResponse> {
  const body: ItemIdLookupRequest = { market_hash_names: names };
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
  names: Iterable<string>,
): Promise<CatalogResolution> {
  const unique = Array.from(new Set(names));
  const resolved: CatalogResolution = new Map();
  if (unique.length === 0) return resolved;

  for (let i = 0; i < unique.length; i += LOOKUP_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + LOOKUP_CHUNK_SIZE);
    const result = await lookupChunk(serviceKey, chunk);
    for (const entry of result.items) {
      if (entry.item_id !== null && entry.item_id !== undefined) {
        resolved.set(entry.market_hash_name, entry.item_id);
      }
    }
  }
  return resolved;
}
