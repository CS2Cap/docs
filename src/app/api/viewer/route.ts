import { NextRequest, NextResponse } from "next/server";
import {
  API_BASE_URL,
  WEB_AUTH_TOKEN_COOKIE_NAME,
  WEB_SESSION_COOKIE_NAME,
} from "@/lib/api/config";
import type { AccountInfo, AccountPreferences, ViewerResponse } from "@/lib/api/types";

const ANONYMOUS_VIEWER: ViewerResponse = {
  authenticated: false,
  user: null,
  preferences: null,
};

function viewerResponse(body: ViewerResponse) {
  return NextResponse.json(body, {
    status: 200,
    headers: {
      "cache-control": "private, no-store",
    },
  });
}

function authHeaders(request: NextRequest): Headers | null {
  const authToken = request.cookies.get(WEB_AUTH_TOKEN_COOKIE_NAME)?.value;
  const sessionCookie = request.cookies.get(WEB_SESSION_COOKIE_NAME)?.value;

  if (!authToken && !sessionCookie) {
    return null;
  }

  const headers = new Headers();
  if (authToken) {
    headers.set("authorization", `Bearer ${authToken}`);
  }
  if (sessionCookie) {
    headers.set("cookie", `${WEB_SESSION_COOKIE_NAME}=${sessionCookie}`);
  }

  return headers;
}

async function fetchViewerJson<T>(path: string, headers: Headers): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Upstream viewer fetch failed for ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function GET(request: NextRequest) {
  const headers = authHeaders(request);
  if (!headers) {
    return viewerResponse(ANONYMOUS_VIEWER);
  }

  try {
    let user = await fetchViewerJson<AccountInfo>("/v1/web/session", headers);
    if (!user) {
      user = await fetchViewerJson<AccountInfo>("/v1/web/account", headers);
    }

    if (!user) {
      return viewerResponse(ANONYMOUS_VIEWER);
    }

    const preferences = await fetchViewerJson<AccountPreferences>(
      "/v1/account/preferences",
      headers,
    );

    return viewerResponse({
      authenticated: true,
      user,
      preferences,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.warn(JSON.stringify({
      event: "viewer.lookup_failed",
      detail,
    }));
    return viewerResponse(ANONYMOUS_VIEWER);
  }
}
