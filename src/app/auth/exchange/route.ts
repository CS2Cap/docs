import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL, WEB_AUTH_TOKEN_COOKIE_NAME } from "@/lib/api/config";

interface TokenExchangeResponse {
  access_token: string;
  expires_in: number;
}

function sanitizeNextPath(input: string | null): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/dashboard";
  }

  return input;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const upstreamResponse = await fetch(`${API_BASE_URL}/v1/auth/token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });

  if (!upstreamResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth_exchange_failed", request.url));
  }

  const payload = (await upstreamResponse.json()) as TokenExchangeResponse;
  const response = NextResponse.redirect(new URL(next, request.url));

  response.cookies.set({
    name: WEB_AUTH_TOKEN_COOKIE_NAME,
    value: payload.access_token,
    httpOnly: true,
    maxAge: payload.expires_in,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
