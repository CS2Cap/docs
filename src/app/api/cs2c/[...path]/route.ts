import { NextRequest, NextResponse } from "next/server";
import {
  API_BASE_URL,
  WEB_AUTH_TOKEN_COOKIE_NAME,
  WEB_SESSION_COOKIE_NAME,
} from "@/lib/api/config";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

const PASSTHROUGH_RESPONSE_HEADERS = [
  "cache-control",
  "content-disposition",
  "content-type",
  "location",
  "set-cookie",
] as const;

function isProtectedWebPath(pathname: string): boolean {
  return (
    pathname === "v1/web/session"
    || pathname.startsWith("v1/web/account")
    || pathname === "v1/web/auth/logout"
    || pathname === "v1/web/auth/providers"
    || pathname.startsWith("v1/web/auth/providers/")
  );
}

type EdgeCachePolicy = {
  sMaxAge: number;
  staleWhileRevalidate: number;
};

// Edge-cache policy for public, non-user-scoped catalog/price data.
// Mirrors the per-endpoint revalidate values used by serverFetch in src/lib/api/server.ts,
// so both server-rendered pages and proxy consumers share the same staleness model.
function matchEdgeCachePolicy(pathname: string): EdgeCachePolicy | null {
  const normalized = pathname.replace(/^v1\/web\//, "v1/");

  if (normalized === "v1/items/metadata") return { sMaxAge: 300, staleWhileRevalidate: 900 };
  if (/^v1\/items\/\d+$/.test(normalized)) return { sMaxAge: 120, staleWhileRevalidate: 600 };
  if (normalized === "v1/items") return { sMaxAge: 300, staleWhileRevalidate: 900 };
  if (normalized === "v1/providers") return { sMaxAge: 300, staleWhileRevalidate: 1800 };
  if (normalized === "v1/prices/history") return { sMaxAge: 120, staleWhileRevalidate: 600 };
  if (normalized === "v1/prices/candles") return { sMaxAge: 300, staleWhileRevalidate: 1800 };
  if (normalized === "v1/prices") return { sMaxAge: 30, staleWhileRevalidate: 120 };
  if (normalized === "v1/fx") return { sMaxAge: 300, staleWhileRevalidate: 1800 };
  if (normalized === "v1/sales") return { sMaxAge: 60, staleWhileRevalidate: 300 };
  if (normalized === "v1/bids") return { sMaxAge: 30, staleWhileRevalidate: 120 };

  return null;
}

async function proxyRequest(request: NextRequest, { params }: RouteContext) {
  const startedAt = Date.now();
  const { path } = await params;
  const pathname = path.join("/");
  const targetUrl = new URL(`${API_BASE_URL}/${path.join("/")}`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authToken = request.cookies.get(WEB_AUTH_TOKEN_COOKIE_NAME)?.value;
  const sessionCookie = request.cookies.get(WEB_SESSION_COOKIE_NAME)?.value;

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (authToken) {
    headers.set("authorization", `Bearer ${authToken}`);
  }

  if (sessionCookie) {
    headers.set("cookie", `${WEB_SESSION_COOKIE_NAME}=${sessionCookie}`);
  }

  if (!authToken && !sessionCookie && isProtectedWebPath(pathname)) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        detail: "Not authenticated",
      },
      { status: 401 },
    );
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text(),
      redirect: "manual",
      cache: "no-store",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.warn(JSON.stringify({
      event: "cs2c_proxy.upstream_fetch_failed",
      path: pathname,
      method: request.method,
      duration_ms: Date.now() - startedAt,
      vercel_id: request.headers.get("x-vercel-id"),
      error: detail,
    }));
    return NextResponse.json(
      { code: "UPSTREAM_FETCH_FAILED", detail },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();

  const isAnonymous = !authToken && !sessionCookie;
  const cachePolicy =
    request.method === "GET" && isAnonymous && upstreamResponse.ok
      ? matchEdgeCachePolicy(pathname)
      : null;

  for (const headerName of PASSTHROUGH_RESPONSE_HEADERS) {
    // When we own the cache policy, skip the upstream cache-control so our
    // edge-cache header isn't overridden by a stricter backend value.
    if (headerName === "cache-control" && cachePolicy) {
      continue;
    }
    const headerValue = upstreamResponse.headers.get(headerName);
    if (headerValue) {
      responseHeaders.set(headerName, headerValue);
    }
  }

  if (cachePolicy) {
    responseHeaders.set(
      "cache-control",
      `public, s-maxage=${cachePolicy.sMaxAge}, stale-while-revalidate=${cachePolicy.staleWhileRevalidate}`,
    );
  }

  const responseBody = upstreamResponse.status === 204 ? null : await upstreamResponse.arrayBuffer();
  console.log(JSON.stringify({
    event: "cs2c_proxy.upstream_response",
    path: pathname,
    method: request.method,
    status: upstreamResponse.status,
    duration_ms: Date.now() - startedAt,
    anonymous: isAnonymous,
    edge_cache_policy: cachePolicy,
    upstream_cache_control: upstreamResponse.headers.get("cache-control"),
    upstream_status: upstreamResponse.headers.get("x-upstream-status"),
    vercel_id: request.headers.get("x-vercel-id"),
  }));
  const response = new NextResponse(responseBody, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });

  if (pathname === "v1/web/auth/logout") {
    response.cookies.set({
      name: WEB_AUTH_TOKEN_COOKIE_NAME,
      value: "",
      expires: new Date(0),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
