import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import { buildQuery } from "@/lib/api/shared";
import { setCachedMarketItemsSnapshot } from "@/lib/upstash-cache";
import type {
  MarketItemsSnapshotResponse,
  MarketTimeframe,
} from "@/lib/api/types";

// Force a fresh fetch + Upstash write so users never hit the 20s cold path
// in getCachedMarketItemsSnapshot. Only 24h is rendered today; extend this
// list if more timeframes ship to user-visible pages.
const PREWARM_TIMEFRAMES: MarketTimeframe[] = ["24h"];

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function fetchAndStore(
  timeframe: MarketTimeframe,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const startedAt = Date.now();
  let upstreamStatus: number | null = null;
  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/web/market/items${buildQuery({ timeframe })}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      },
    );
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
    return stored ? { ok: true } : { ok: false, reason: "upstash write failed" };
  } catch (error) {
    console.warn(JSON.stringify({
      event: "cron.prewarm_market_snapshot.failed",
      timeframe,
      upstream_status: upstreamStatus,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown error",
    }));
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "unknown error",
    };
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { code: "CRON_SECRET_MISSING" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const results = await Promise.all(
    PREWARM_TIMEFRAMES.map(async (timeframe) => ({
      timeframe,
      ...(await fetchAndStore(timeframe)),
    })),
  );

  const allOk = results.every((entry) => entry.ok);

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      results,
    },
    { status: allOk ? 200 : 502 },
  );
}
