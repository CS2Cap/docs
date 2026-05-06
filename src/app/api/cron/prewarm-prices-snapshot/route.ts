import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import { setCachedPricesSnapshot } from "@/lib/upstash-cache";
import type { MarketItem, PricesPaginatedResponse } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function groupByItemId(items: MarketItem[]): Record<number, MarketItem[]> {
  const grouped: Record<number, MarketItem[]> = {};
  for (const item of items) {
    (grouped[item.item_id] ??= []).push(item);
  }
  return grouped;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ code: "CRON_SECRET_MISSING" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const startedAt = Date.now();
  let upstreamStatus: number | null = null;

  try {
    const response = await fetch(`${API_BASE_URL}/v1/web/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      cache: "no-store",
      signal: AbortSignal.timeout(240000),
    });
    upstreamStatus = response.status;

    if (!response.ok) {
      console.warn(JSON.stringify({
        event: "cron.prewarm_prices_snapshot.upstream_error",
        upstream_status: response.status,
        duration_ms: Date.now() - startedAt,
      }));
      return NextResponse.json({ ok: false, reason: `upstream ${response.status}` }, { status: 502 });
    }

    const data = (await response.json()) as PricesPaginatedResponse;
    const snapshot = {
      byItemId: groupByItemId(data.items),
      timestamp: new Date().toISOString(),
    };
    const stored = await setCachedPricesSnapshot(snapshot);

    console.log(JSON.stringify({
      event: "cron.prewarm_prices_snapshot.completed",
      upstream_status: upstreamStatus,
      item_count: data.items.length,
      unique_items: Object.keys(snapshot.byItemId).length,
      stored,
      duration_ms: Date.now() - startedAt,
    }));

    return NextResponse.json({
      ok: stored,
      item_count: data.items.length,
      unique_items: Object.keys(snapshot.byItemId).length,
      timestamp: snapshot.timestamp,
      duration_ms: Date.now() - startedAt,
    }, { status: stored ? 200 : 502 });
  } catch (error) {
    console.warn(JSON.stringify({
      event: "cron.prewarm_prices_snapshot.failed",
      upstream_status: upstreamStatus,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown error",
    }));
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "unknown error" }, { status: 502 });
  }
}
