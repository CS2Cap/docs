import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import {
  getCachedItemsSnapshot,
  getCachedMarketItemsSnapshot,
} from "@/lib/blob-snapshot-cache";
import type { ItemOut, ItemSearchResponse, ItemSuggestion } from "@/lib/api/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULT_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

// Match against the displayed name only. It already contains the weapon, skin,
// and wear ("AK-47 | Redline (Field-Tested)"); pulling in collection/base/skin
// as extra haystack just lets unrelated words satisfy short tokens (a "Rising
// Sun" collection would match the "r" in "ak-47 | r").
function searchText(item: ItemOut): string {
  return item.market_hash_name.toLowerCase();
}

// Match-quality first (how many query tokens appear), popularity (rank) as the
// tie-break. Mirrors the ordering the upstream search *should* produce, but runs
// in-process against the prewarmed catalog snapshot — no per-keystroke API call.
function rankSuggestions(
  items: ItemOut[],
  rankByItemId: Map<number, number>,
  tokens: string[],
): ItemSuggestion[] {
  // Word-prefix matching: a token counts only when some word in the name starts
  // with it. This keeps short tokens meaningful — "r" matches "Redline", not the
  // "r" buried in "Factory" or "Bloodsport". Tokens are already [a-z0-9]-only, so
  // they are safe to drop straight into the pattern.
  const tokenMatchers = tokens.map((token) => new RegExp(`(^|[^a-z0-9])${token}`));
  const scored: Array<{ item: ItemOut; matched: number; rank: number }> = [];
  for (const item of items) {
    if (item.item_id == null) continue;
    const text = searchText(item);
    let matched = 0;
    for (const matcher of tokenMatchers) {
      if (matcher.test(text)) matched += 1;
    }
    if (matched === 0) continue;
    scored.push({
      item,
      matched,
      rank: rankByItemId.get(item.item_id) ?? Number.POSITIVE_INFINITY,
    });
  }

  scored.sort((a, b) => b.matched - a.matched || a.rank - b.rank);

  return scored.slice(0, RESULT_LIMIT).map(({ item }) => ({
    item_id: item.item_id as number,
    market_hash_name: item.market_hash_name,
    image_url: item.image_url ?? null,
    item_type: item.item_type ?? null,
    wear_name: item.wear_name ?? null,
  }));
}

export async function GET(request: NextRequest): Promise<NextResponse<ItemSearchResponse>> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tokens = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (q.length < MIN_QUERY_LENGTH || tokens.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const items = await getCachedItemsSnapshot();
  if (!items) {
    return NextResponse.json({ items: [] });
  }

  // Popularity is optional: if the market snapshot is cold we still return
  // name-matched results, just without the rank tie-break.
  const market = await getCachedMarketItemsSnapshot("24h");
  const rankByItemId = new Map<number, number>();
  for (const row of market?.snapshot.data.items ?? []) {
    if (row.summary.rank != null) rankByItemId.set(row.item_id, row.summary.rank);
  }

  const suggestions = rankSuggestions(items.snapshot.items, rankByItemId, tokens);
  return NextResponse.json(
    { items: suggestions },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
