import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import { setCachedItemsSnapshot } from "@/lib/upstash-cache";
import type { ItemOut, ItemsResponse } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FETCH_LIMIT = 1000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ code: "CRON_SECRET_MISSING" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const startedAt = Date.now();
  const allItems: ItemOut[] = [];
  let offset = 0;
  let page = 0;

  try {
    while (true) {
      const url = `${API_BASE_URL}/v1/web/items?limit=${FETCH_LIMIT}&offset=${offset}`;
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.warn(JSON.stringify({
          event: "cron.prewarm_items_snapshot.upstream_error",
          page,
          offset,
          upstream_status: response.status,
          duration_ms: Date.now() - startedAt,
        }));
        return NextResponse.json({ ok: false, reason: `upstream ${response.status} at page ${page}` }, { status: 502 });
      }

      const data = (await response.json()) as ItemsResponse;
      allItems.push(...data.items);
      page += 1;

      if (!data.pagination.has_next || data.items.length < FETCH_LIMIT) break;
      offset += data.items.length;
    }

    const byItemId: Record<number, ItemOut> = {};
    for (const item of allItems) {
      if (item.item_id != null) byItemId[item.item_id] = item;
    }

    const snapshot = {
      items: allItems,
      byItemId,
      total: allItems.length,
      timestamp: new Date().toISOString(),
    };
    const stored = await setCachedItemsSnapshot(snapshot);

    console.log(JSON.stringify({
      event: "cron.prewarm_items_snapshot.completed",
      pages_fetched: page,
      total_items: allItems.length,
      stored,
      duration_ms: Date.now() - startedAt,
    }));

    return NextResponse.json({
      ok: stored,
      total_items: allItems.length,
      pages_fetched: page,
      timestamp: snapshot.timestamp,
      duration_ms: Date.now() - startedAt,
    }, { status: stored ? 200 : 502 });
  } catch (error) {
    console.warn(JSON.stringify({
      event: "cron.prewarm_items_snapshot.failed",
      page,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown error",
    }));
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "unknown error" }, { status: 502 });
  }
}
