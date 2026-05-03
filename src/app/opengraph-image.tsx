import { ImageResponse } from "next/og";

export const alt = "CS2Cap — CS2 API for skin market data across 39+ marketplaces";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
            alignItems: "center",
            gap: "16px",
            fontSize: 26,
            letterSpacing: 6,
            color: "#60a5fa",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              background: "#60a5fa",
              boxShadow: "0 0 16px #60a5fa",
            }}
          />
          CS2Cap
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -3,
              marginBottom: 32,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ color: "#f8fafc" }}>CS2 API</div>
            <div
              style={{
                background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Skin Market Data
            </div>
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#cbd5e1",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Real-time prices, buy orders, and analytics across 39+ CS2 skin
            marketplaces. Free tier available.
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
            BUFF163 · CSFloat · Skinport · Steam · DMarket
          </div>
        </div>
      </div>
    ),
    size,
  );
}
