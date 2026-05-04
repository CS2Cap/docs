import "server-only";

import { gzipSync } from "node:zlib";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";

// Kept as a single rolling file so storage stays bounded. Swap to a
// date-suffixed scheme (e.g. prices/YYYY-MM-DD.ndjson.gz) only if callers
// need historical dumps — retention sweeps are out of scope for the MVP.
const EXPORT_BLOB_PATHNAME = "exports/prices/latest.ndjson.gz";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[export-prices-snapshot] CRON_SECRET not configured");
    return NextResponse.json(
      { code: "CRON_SECRET_MISSING" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[export-prices-snapshot] rejected unauthorized call");
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const exportApiKey = process.env.CS2C_EXPORT_API_KEY;
  if (!exportApiKey) {
    console.error("[export-prices-snapshot] CS2C_EXPORT_API_KEY not configured");
    return NextResponse.json(
      { code: "EXPORT_API_KEY_MISSING" },
      { status: 500 },
    );
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${API_BASE_URL}/v1/prices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${exportApiKey}`,
        Accept: "application/x-ndjson",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(240_000),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(JSON.stringify({
      event: "cron.export_prices_snapshot.upstream_fetch_failed",
      duration_ms: Date.now() - startedAt,
      error: detail,
    }));
    return NextResponse.json(
      { code: "UPSTREAM_FETCH_FAILED", detail },
      { status: 502 },
    );
  }

  if (!upstreamResponse.ok) {
    const body = await upstreamResponse.text().catch(() => "");
    console.error(JSON.stringify({
      event: "cron.export_prices_snapshot.upstream_error",
      upstream_status: upstreamResponse.status,
      duration_ms: Date.now() - startedAt,
      detail: body.slice(0, 500),
    }));
    return NextResponse.json(
      {
        code: "UPSTREAM_ERROR",
        status: upstreamResponse.status,
        detail: body.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const snapshotTimestamp = upstreamResponse.headers.get("x-snapshot-timestamp");
  const snapshotTotal = upstreamResponse.headers.get("x-snapshot-total");

  const rawBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
  if (rawBuffer.length === 0) {
    console.warn(JSON.stringify({
      event: "cron.export_prices_snapshot.empty_snapshot",
      upstream_status: upstreamResponse.status,
      duration_ms: Date.now() - startedAt,
    }));
    return NextResponse.json({ code: "EMPTY_SNAPSHOT" }, { status: 502 });
  }

  const compressed = gzipSync(rawBuffer);

  try {
    const blob = await put(EXPORT_BLOB_PATHNAME, compressed, {
      access: "public",
      contentType: "application/gzip",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    console.log(JSON.stringify({
      event: "cron.export_prices_snapshot.completed",
      upstream_status: upstreamResponse.status,
      duration_ms: Date.now() - startedAt,
      snapshot_timestamp: snapshotTimestamp,
      snapshot_total: snapshotTotal != null ? Number(snapshotTotal) : null,
      raw_bytes: rawBuffer.length,
      compressed_bytes: compressed.length,
    }));

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      url: blob.url,
      pathname: blob.pathname,
      snapshot: {
        timestamp: snapshotTimestamp,
        total: snapshotTotal != null ? Number(snapshotTotal) : null,
      },
      sizes: {
        rawBytes: rawBuffer.length,
        compressedBytes: compressed.length,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(JSON.stringify({
      event: "cron.export_prices_snapshot.blob_write_failed",
      upstream_status: upstreamResponse.status,
      duration_ms: Date.now() - startedAt,
      error: detail,
    }));
    return NextResponse.json(
      { code: "BLOB_WRITE_FAILED", detail },
      { status: 500 },
    );
  }
}
