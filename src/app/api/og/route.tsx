import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getPageBySlug } from "@/lib/seo/landing-pages";

const SIZE = { width: 1200, height: 630 } as const;

const TYPE_LABEL: Record<string, string> = {
  general: "CS2 API",
  feature: "Feature API",
  market: "Marketplace",
};

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const page = slug ? getPageBySlug(slug) : undefined;

  const eyebrow = page ? TYPE_LABEL[page.type] ?? "CS2Cap" : "CS2Cap";
  const headline = page?.h1 ?? "CS2 API";
  const description =
    page?.description ??
    "Real-time CS2 skin market data, prices, and analytics across 40+ marketplaces.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #050816 0%, #0a0f1e 50%, #0d1226 100%)",
          color: "#f8fafc",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            letterSpacing: 6,
            color: "#60a5fa",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: "#60a5fa",
                boxShadow: "0 0 14px #60a5fa",
              }}
            />
            CS2Cap
          </div>
          <div style={{ display: "flex", color: "#94a3b8" }}>{eyebrow}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -3,
              marginBottom: 28,
              color: "#f8fafc",
              display: "flex",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#cbd5e1",
              lineHeight: 1.35,
              maxWidth: 1040,
              display: "flex",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 28,
            borderTop: "2px solid #1e293b",
            fontSize: 22,
            color: "#64748b",
            letterSpacing: 2,
          }}
        >
          <div style={{ display: "flex" }}>cs2cap.com</div>
          <div style={{ display: "flex", color: "#60a5fa" }}>
            Free tier · 40+ markets · REST + Webhooks
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}
