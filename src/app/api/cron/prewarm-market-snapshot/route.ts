import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import { setCachedMarketItemsSnapshot } from "@/lib/upstash-cache";
import type { MarketItemsSnapshotResponse, MarketTimeframe } from "@/lib/api/types";

const PREWARM_TIMEFRAMES: MarketTimeframe[] = ["24h"];

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function fetchAndStore(
  timeframe: MarketTimeframe,
  exportApiKey: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const startedAt = Date.now();
  let upstreamStatus: number | null = null;
  try {
    const response = await fetch(`${API_BASE_URL}/v1/market/items?timeframe=${timeframe}`, {
      headers: { Authorization: `Bearer ${exportApiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    upstreamStatus = response.status;

    if (!response.ok) {
      console.warn(JSON.stringify({
        event: "cron.prewarm_market_snapshot.upstream_error",
        timeframe,
        upstream_status: response.status,
        duration_ms: Date.now() - startedAt,
      }));
      return { ok: false, reason: `upstream ${response.status}` };
    }

    const snapshot = (await response.json()) as MarketItemsSnapshotResponse;
    const stored = await setCachedMarketItemsSnapshot(timeframe, snapshot);
    console.log(JSON.stringify({
      event: "cron.prewarm_market_snapshot.completed",
      timeframe,
      upstream_status: upstreamStatus,
      stored,
      duration_ms: Date.now() - startedAt,
    }));
    return stored ? { ok: true } : { ok: false, reason: "blob write failed" };
  } catch (error) {
    console.warn(JSON.stringify({
      event: "cron.prewarm_market_snapshot.failed",
      timeframe,
      upstream_status: upstreamStatus,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown error",
    }));
    return { ok: false, reason: error instanceof Error ? error.message : "unknown error" };
  }
}

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

  const results = await Promise.all(
    PREWARM_TIMEFRAMES.map(async (timeframe) => ({
      timeframe,
      ...(await fetchAndStore(timeframe, exportApiKey)),
    })),
  );

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ timestamp: new Date().toISOString(), results }, { status: allOk ? 200 : 502 });
}
