import { NextResponse, type NextRequest } from "next/server";
import {
  API_BASE_URL,
  WEB_AUTH_TOKEN_COOKIE_NAME,
  WEB_SESSION_COOKIE_NAME,
} from "@/lib/api/config";
import {
  buildItemPath,
  parseItemRouteParam,
  slugifyMarketHashName,
} from "@/lib/seo/itemSlug";

type ItemSlugLookup = {
  item_id: number;
  market_hash_name?: string | null;
};

function apiUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

function buildItemLookupHeaders(request: NextRequest): Headers {
  const headers = new Headers({ accept: "application/json" });
  const serviceKey = process.env.CS2C_EXPORT_API_KEY;
  const authToken = request.cookies.get(WEB_AUTH_TOKEN_COOKIE_NAME)?.value;
  const sessionCookie = request.cookies.get(WEB_SESSION_COOKIE_NAME)?.value;

  if (serviceKey) {
    headers.set("authorization", `Bearer ${serviceKey}`);
  } else if (authToken) {
    headers.set("authorization", `Bearer ${authToken}`);
  }

  if (!serviceKey && sessionCookie) {
    headers.set("cookie", `${WEB_SESSION_COOKIE_NAME}=${sessionCookie}`);
  }

  return headers;
}

async function fetchItemSlug(request: NextRequest, itemId: number): Promise<string | null> {
  try {
    const response = await fetch(apiUrl(`/v1/web/items/${itemId}`), {
      headers: buildItemLookupHeaders(request),
      cache: "force-cache",
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      return null;
    }

    const item = (await response.json()) as ItemSlugLookup;
    return item.market_hash_name ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const param = request.nextUrl.pathname.slice("/item/".length);
  const parsed = parseItemRouteParam(param);

  if (!parsed) {
    return NextResponse.next();
  }

  const marketHashName = await fetchItemSlug(request, parsed.id);
  if (!marketHashName) {
    return NextResponse.next();
  }

  const canonicalSlug = slugifyMarketHashName(marketHashName);
  if (parsed.slug === canonicalSlug) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = buildItemPath(parsed.id, marketHashName);
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/item/:itemId",
};
