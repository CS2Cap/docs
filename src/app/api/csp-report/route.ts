import { NextRequest, NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

export const runtime = "nodejs";

// Browsers POST CSP violations here (wired via `report-uri` / `report-to` in
// next.config.ts). No auth — the report beacon is unauthenticated by design.
// Reports are logged and forwarded to PostHog so they can be queried while the
// policy runs in Report-Only mode.

const NO_CONTENT = new NextResponse(null, { status: 204 });

type NormalizedViolation = {
  documentUrl?: string;
  effectiveDirective?: string;
  blockedUrl?: string;
  disposition?: string;
};

// Legacy `report-uri` body: { "csp-report": { ...kebab-case fields } }
function fromLegacy(report: Record<string, unknown>): NormalizedViolation {
  return {
    documentUrl: str(report["document-uri"]),
    effectiveDirective: str(report["effective-directive"] ?? report["violated-directive"]),
    blockedUrl: str(report["blocked-uri"]),
    disposition: str(report["disposition"]),
  };
}

// Modern `report-to` body: array of { type, body: { ...camelCase fields } }
function fromModern(body: Record<string, unknown>): NormalizedViolation {
  return {
    documentUrl: str(body["documentURL"]),
    effectiveDirective: str(body["effectiveDirective"]),
    blockedUrl: str(body["blockedURL"]),
    disposition: str(body["disposition"]),
  };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseReports(payload: unknown): NormalizedViolation[] {
  // Modern Reporting API: an array of report objects.
  if (Array.isArray(payload)) {
    return payload
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .filter((r) => r["type"] === "csp-violation" || r["type"] === undefined)
      .map((r) => fromModern((r["body"] as Record<string, unknown>) ?? {}));
  }

  // Legacy report-uri: a single { "csp-report": {...} } object.
  if (payload && typeof payload === "object" && "csp-report" in payload) {
    const inner = (payload as Record<string, unknown>)["csp-report"];
    if (inner && typeof inner === "object") {
      return [fromLegacy(inner as Record<string, unknown>)];
    }
  }

  return [];
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    // Unparseable body — ignore, never error back to the browser beacon.
    return NO_CONTENT;
  }

  const violations = parseReports(payload);
  if (violations.length === 0) {
    return NO_CONTENT;
  }

  try {
    const posthog = getPostHogClient();
    for (const v of violations) {
      console.warn(
        JSON.stringify({ event: "csp.violation", ...v }),
      );
      posthog.capture({
        distinctId: "csp-report",
        event: "csp_violation",
        properties: {
          document_url: v.documentUrl,
          effective_directive: v.effectiveDirective,
          blocked_url: v.blockedUrl,
          disposition: v.disposition,
        },
      });
    }
  } catch {
    // Reporting must never throw back to the browser.
  }

  return NO_CONTENT;
}
