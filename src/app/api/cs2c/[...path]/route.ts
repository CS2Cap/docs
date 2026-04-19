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

async function proxyRequest(request: NextRequest, { params }: RouteContext) {
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

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text(),
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();

  for (const headerName of PASSTHROUGH_RESPONSE_HEADERS) {
    const headerValue = upstreamResponse.headers.get(headerName);
    if (headerValue) {
      responseHeaders.set(headerName, headerValue);
    }
  }

  const responseBody = upstreamResponse.status === 204 ? null : await upstreamResponse.arrayBuffer();
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
