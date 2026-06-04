import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import { setCachedBrowseNav, setCachedItemsSnapshot } from "@/lib/blob-snapshot-cache";
import { buildBrowseNav, loadBrowseIndex } from "@/lib/browse/browse-index";
import type { ItemOut, ItemsResponse } from "@/lib/api/types";

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
    const response = await fetch(`${API_BASE_URL}/v1/items`, {
      headers: { Authorization: `Bearer ${exportApiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    upstreamStatus = response.status;

    if (!response.ok) {
      console.warn(JSON.stringify({
        event: "cron.prewarm_items_snapshot.upstream_error",
        upstream_status: response.status,
        duration_ms: Date.now() - startedAt,
      }));
      return NextResponse.json({ ok: false, reason: `upstream ${response.status}` }, { status: 502 });
    }

    const data = (await response.json()) as ItemsResponse;
    const items: ItemOut[] = data.items;

    const byItemId: Record<number, ItemOut> = {};
    for (const item of items) {
      if (item.item_id != null) byItemId[item.item_id] = item;
    }

    const snapshot = { items, byItemId, total: items.length, timestamp: new Date().toISOString() };
    const stored = await setCachedItemsSnapshot(snapshot);

    // Precompute the mega-menu payload from the just-cached snapshot (served via
    // L1, no extra Blob read) so /api/browse-nav never deduplicates the full
    // catalog at request time. Non-fatal: items snapshot is the primary output.
    let navStored = false;
    try {
      const ix = await loadBrowseIndex();
      if (ix) navStored = await setCachedBrowseNav(buildBrowseNav(ix));
    } catch (navError) {
      console.warn(JSON.stringify({
        event: "cron.prewarm_items_snapshot.browse_nav_failed",
        error: navError instanceof Error ? navError.message : "unknown error",
      }));
    }

    console.log(JSON.stringify({
      event: "cron.prewarm_items_snapshot.completed",
      upstream_status: upstreamStatus,
      total_items: items.length,
      stored,
      nav_stored: navStored,
      duration_ms: Date.now() - startedAt,
    }));

    return NextResponse.json({
      ok: stored,
      total_items: items.length,
      timestamp: snapshot.timestamp,
      duration_ms: Date.now() - startedAt,
    }, { status: stored ? 200 : 502 });
  } catch (error) {
    console.warn(JSON.stringify({
      event: "cron.prewarm_items_snapshot.failed",
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown error",
    }));
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "unknown error" }, { status: 502 });
  }
}
