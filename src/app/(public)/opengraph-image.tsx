import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "CS2Cap — CS2 Skins Pricing API & Market Data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getLogoPng(): string | undefined {
  try {
    const svg = readFileSync(
      join(process.cwd(), "public/assets/logo.svg"),
      "utf-8"
    );
    const match = svg.match(/xlink:href="data:img\/png;base64,([^"]+)"/);
    return match ? `data:image/png;base64,${match[1]}` : undefined;
  } catch {
    return undefined;
  }
}

export default function OgImage() {
  const logo = getLogoPng();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1a30 60%, #0a1525 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            display: "flex",
          }}
        />

        {/* Glow top-right */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Glow bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Main content column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 80px",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Logo + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "36px" }}>
            {logo && (
              <img
                src={logo}
                width={64}
                height={64}
                style={{ borderRadius: "12px" }}
              />
            )}
            <span
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#f8fafc",
                letterSpacing: "-0.5px",
              }}
            >
              CS2Cap
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              marginBottom: "28px",
              maxWidth: "900px",
            }}
          >
            <span style={{ color: "#f8fafc" }}>CS2 Skins Pricing API&nbsp;</span>
            <span style={{ color: "#38bdf8" }}>&amp; Market Data</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              fontSize: "26px",
              color: "#94a3b8",
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: "720px",
            }}
          >
            <span>Live prices, buy orders &amp; sales history across&nbsp;</span>
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>39+ marketplaces</span>
            <span>. Free REST API.</span>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: "16px", marginTop: "48px" }}>
            {["Buff163", "Youpin", "Steam", "+36 more"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "8px 18px",
                  background: "rgba(56,189,248,0.1)",
                  border: "1px solid rgba(56,189,248,0.25)",
                  borderRadius: "999px",
                  color: "#7dd3fc",
                  fontSize: "16px",
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
