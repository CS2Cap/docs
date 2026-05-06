import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import { setCachedPricesSnapshot } from "@/lib/upstash-cache";
import type { MarketItem } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ code: "CRON_SECRET_MISSING" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const exportApiKey = process.env.CS2C_EXPORT_API_KEY;
  if (!exportApiKey) {
    return NextResponse.json({ code: "EXPORT_API_KEY_MISSING" }, { status: 500 });
  }

  const startedAt = Date.now();
  let upstreamStatus: number | null = null;

  try {
    const response = await fetch(`${API_BASE_URL}/v1/prices`, {
      method: "POST",
      headers: { Authorization: `Bearer ${exportApiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(240_000),
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

    const text = await response.text();
    const items = text.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as MarketItem);

    const byItemId: Record<number, MarketItem[]> = {};
    for (const item of items) {
      (byItemId[item.item_id] ??= []).push(item);
    }

    const snapshot = { byItemId, timestamp: new Date().toISOString() };
    const stored = await setCachedPricesSnapshot(snapshot);

    console.log(JSON.stringify({
      event: "cron.prewarm_prices_snapshot.completed",
      upstream_status: upstreamStatus,
      item_count: items.length,
      unique_items: Object.keys(byItemId).length,
      stored,
      duration_ms: Date.now() - startedAt,
    }));

    return NextResponse.json({
      ok: stored,
      item_count: items.length,
      unique_items: Object.keys(byItemId).length,
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
