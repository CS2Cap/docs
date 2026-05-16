import { ImageResponse } from "next/og";
import { getItemDetailPageCoreData } from "@/lib/api/compositions";
import { formatPriceMinor } from "@/lib/api/view-models";
import { parseItemRouteParam } from "@/lib/seo/itemSlug";

export const alt = "CS2 skin price card — CS2Cap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ itemId: string }>;

function formatOgText(value: string) {
  return value.replace(/^★\s*/, "").replace(/™/g, "").trim();
}

export default async function Image({ params }: { params: Params }) {
  const { itemId } = await params;
  const parsed = parseItemRouteParam(itemId);
  const data = parsed
    ? await getItemDetailPageCoreData(parsed.id, { anon: true }).catch(() => null)
    : null;

  const itemName = data?.item.market_hash_name
    ? formatOgText(data.item.market_hash_name)
    : "CS2 Skin";
  const wear = data?.item.wear_name ?? null;
  const rarity = data?.item.rarity_name ?? null;
  const collection = data?.item.collection ?? null;
  const askProviders = data?.coverage.askProviders ?? 0;
  const bestAsk =
    data?.bestAsk?.lowest_ask != null
      ? formatPriceMinor(data.bestAsk.lowest_ask)
      : null;
  const bestBid =
    data?.bestBid?.highest_bid != null
      ? formatPriceMinor(data.bestBid.highest_bid)
      : null;
  const imageUrl = data?.item.image_url ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "60px",
          background:
            "linear-gradient(135deg, #050816 0%, #0a0f1e 50%, #0d1226 100%)",
          color: "#f8fafc",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "space-between",
            alignItems: "stretch",
            gap: 48,
          }}
        >
          <div
            style={{
              flex: "0 0 420px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #1e293b",
              background:
                "radial-gradient(circle at 50% 40%, rgba(96,165,250,0.18) 0%, rgba(10,15,30,0) 70%)",
              padding: 24,
            }}
          >
            {imageUrl ? (
               
              <img
                src={imageUrl}
                alt={itemName}
                width={360}
                height={360}
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  letterSpacing: 6,
                  color: "#475569",
                }}
              >
                CS2 ITEM
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 22,
                  letterSpacing: 6,
                  color: "#60a5fa",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    background: "#60a5fa",
                    boxShadow: "0 0 14px #60a5fa",
                  }}
                />
                CS2Cap · Live Prices
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 52,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: "#f8fafc",
                  marginBottom: 18,
                }}
              >
                {itemName}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  fontSize: 20,
                  color: "#94a3b8",
                }}
              >
                {[wear, rarity, collection]
                  .filter((value): value is string => Boolean(value))
                  .map((value) => (
                    <div
                      key={value}
                      style={{
                        display: "flex",
                        border: "1px solid #1e293b",
                        padding: "6px 14px",
                        background: "rgba(30,41,59,0.4)",
                      }}
                    >
                      {value}
                    </div>
                  ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 24,
                paddingTop: 28,
                borderTop: "2px solid #1e293b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 0",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    letterSpacing: 4,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Lowest Ask
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 46,
                    fontWeight: 900,
                    color: "#34d399",
                  }}
                >
                  {bestAsk ?? "—"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 0",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    letterSpacing: 4,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Highest Bid
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 46,
                    fontWeight: 900,
                    color: "#f8fafc",
                  }}
                >
                  {bestBid ?? "—"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "0 0 150px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    letterSpacing: 4,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Markets
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 56,
                    fontWeight: 900,
                    color: "#60a5fa",
                    letterSpacing: -1,
                  }}
                >
                  {askProviders}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
