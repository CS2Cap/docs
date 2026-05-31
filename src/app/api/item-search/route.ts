import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import {
  getCachedItemsSnapshot,
  getCachedMarketItemsSnapshot,
} from "@/lib/blob-snapshot-cache";
import { suggestItems } from "@/lib/search/snapshot-search";
import type { ItemSearchResponse } from "@/lib/api/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 2;

export async function GET(request: NextRequest): Promise<NextResponse<ItemSearchResponse>> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ items: [] });
  }

  const [items, market] = await Promise.all([
    getCachedItemsSnapshot(),
    getCachedMarketItemsSnapshot("24h"),
  ]);
  if (!items || !market) {
    return NextResponse.json({ items: [] });
  }

  const suggestions = suggestItems(items.snapshot, market.snapshot, q);
  return NextResponse.json(
    { items: suggestions },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
