// ITEM DETAIL — bigger components per the brief.
// The original page reportedly "feels tiny"; this version uses:
//   • 280px item visual (was ~160px)
//   • Price tiles 80px tall
//   • Table rows 56px (was 40)
//   • Bigger headings (clamp up to 4.5rem)

const ITEM = {
  weapon: "AWP",
  skin: "Asiimov",
  wear: "Field-Tested",
  rarity: "COVERT",
  float: 0.207,
  pattern: 645,
  stattrak: true,
  hashName: "StatTrak™ AWP | Asiimov (Field-Tested)",
};

const ASK_PROVIDERS = [
  { name: "BUFF163",   price: "$74.21",   volume: "243 listings", spread: "+0.0%", primary: true },
  { name: "YOUPIN",    price: "$75.04",   volume: "189 listings", spread: "+1.1%" },
  { name: "CSFLOAT",   price: "$78.40",   volume: "67 listings",  spread: "+5.6%" },
  { name: "SKINPORT",  price: "$79.95",   volume: "52 listings",  spread: "+7.7%" },
  { name: "BITSKINS",  price: "$81.10",   volume: "31 listings",  spread: "+9.3%" },
  { name: "STEAM",     price: "$92.50",   volume: "82 listings",  spread: "+24.6%" },
];

const RECENT_SALES = [
  { time: "5m ago",  market: "BUFF163",  price: "$73.99", float: 0.215, pattern: 122 },
  { time: "12m ago", market: "YOUPIN",   price: "$74.50", float: 0.198, pattern: 891 },
  { time: "18m ago", market: "BUFF163",  price: "$74.10", float: 0.224, pattern: 314 },
  { time: "27m ago", market: "CSFLOAT",  price: "$77.20", float: 0.186, pattern: 442 },
  { time: "41m ago", market: "BUFF163",  price: "$73.85", float: 0.211, pattern: 718 },
  { time: "1h ago",  market: "SKINPORT", price: "$76.40", float: 0.231, pattern: 56 },
];

// ───────────────────────────────────────────────────────────
// Price history chart — area chart with grid lines
// ───────────────────────────────────────────────────────────
const PriceChart = () => {
  const [range, setRange] = React.useState("90d");
  const ranges = [
    { k: "7d", l: "7D" }, { k: "30d", l: "30D" },
    { k: "90d", l: "90D" }, { k: "1y", l: "1Y" }, { k: "all", l: "ALL" }
  ];
  // Deterministic curve
  const N = 90;
  const points = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    const trend = 56 + t * 22;
    const wave = Math.sin(i * 0.4) * 4 + Math.sin(i * 0.13) * 6;
    return [i / (N - 1) * 940, 320 - (trend + wave) * 3];
  });
  const linePath = "M" + points.map(p => p.join(",")).join(" L");
  const areaPath = linePath + ` L 940,320 L 0,320 Z`;

  return (
    <div style={{ background: "var(--surface)", border: "2px solid var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "20px 28px", borderBottom: "2px solid var(--line)", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="t-label-xs">PRICE HISTORY · BUFF163</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
            <span style={{ font: "900 36px/1 var(--font-mono)", color: "var(--fg)" }}>$74.21</span>
            <span style={{ font: "700 16px var(--font-mono)", color: "var(--success)" }}>+14.8% (30D)</span>
          </div>
        </div>
        <div style={{ display: "flex", border: "2px solid var(--line)" }}>
          {ranges.map((r) => (
            <button key={r.k} onClick={() => setRange(r.k)}
              style={{ padding: "10px 16px",
                       background: range === r.k ? "var(--brand)" : "transparent",
                       color: range === r.k ? "hsl(220 20% 4%)" : "var(--fg-muted)",
                       border: "none", cursor: "pointer",
                       font: "700 12px var(--font-mono)", letterSpacing: "0.12em" }}>
              {r.l}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <svg viewBox="0 0 960 340" width="100%" style={{ display: "block" }}>
          <defs>
            <linearGradient id="pchart" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(217 90% 55%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(217 90% 55%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[80, 160, 240].map(y => (
            <line key={y} x1="0" y1={y} x2="940" y2={y}
                  stroke="hsl(217 40% 20% / 0.5)" strokeDasharray="3 6" />
          ))}
          {[235, 470, 705].map(x => (
            <line key={x} x1={x} y1="0" x2={x} y2="320"
                  stroke="hsl(217 40% 20% / 0.5)" strokeDasharray="3 6" />
          ))}
          <path d={areaPath} fill="url(#pchart)" />
          <path d={linePath} fill="none" stroke="hsl(217 90% 55%)" strokeWidth="2.5" />
          {/* y-axis labels */}
          <text x="950" y="84"  fill="var(--fg-muted)" fontFamily="JetBrains Mono"
                fontSize="11" textAnchor="end">$92</text>
          <text x="950" y="164" fill="var(--fg-muted)" fontFamily="JetBrains Mono"
                fontSize="11" textAnchor="end">$78</text>
          <text x="950" y="244" fill="var(--fg-muted)" fontFamily="JetBrains Mono"
                fontSize="11" textAnchor="end">$64</text>
        </svg>
      </div>
    </div>
  );
};

const ItemScreen = ({ onNavigate }) => {
  const [watching, setWatching] = React.useState(false);

  return (
    <main>
      <Container style={{ paddingTop: 32, paddingBottom: 96 }}>
        {/* Breadcrumbs */}
        <div className="t-label-xs" style={{ marginBottom: 24, display: "flex", gap: 8, alignItems: "center" }}>
          <a onClick={() => onNavigate("home")}
             style={{ color: "var(--fg-muted)", cursor: "pointer" }}>HOME</a>
          <span style={{ color: "var(--line)" }}>/</span>
          <a onClick={() => onNavigate("search")}
             style={{ color: "var(--fg-muted)", cursor: "pointer" }}>SEARCH</a>
          <span style={{ color: "var(--line)" }}>/</span>
          <span style={{ color: "var(--brand)" }}>AWP · ASIIMOV</span>
        </div>

        {/* HERO — item visual + name + watch button */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr auto",
                      gap: 40, alignItems: "flex-start", marginBottom: 48 }}
             className="item-hero">
          <div style={{ width: 280, height: 280, border: "2px solid var(--line)",
                        background: "linear-gradient(135deg, hsl(20 30% 18%), hsl(15 65% 45%) 60%, hsl(20 80% 55%))",
                        boxShadow: "8px 8px 0 hsl(217 90% 55% / 0.3)",
                        position: "relative", overflow: "hidden" }}>
            <div className="bg-grid" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
            <span style={{ position: "absolute", top: 12, left: 14,
                           font: "700 11px var(--font-mono)", letterSpacing: "0.18em",
                           color: "hsl(0 80% 60%)" }}>COVERT</span>
            <span style={{ position: "absolute", bottom: 14, right: 14,
                           font: "900 28px var(--font-sans)",
                           letterSpacing: "-0.02em", color: "rgba(255,255,255,0.85)" }}>AWP</span>
          </div>

          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <Tag color="hsl(0 80% 60%)">COVERT</Tag>
              <Tag color="var(--warning)">STATTRAK™</Tag>
              <Tag color="var(--brand)">FIELD-TESTED</Tag>
            </div>
            <h1 style={{
              fontFamily: "var(--font-sans)", fontWeight: 900,
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 0.95,
              letterSpacing: "-0.035em", margin: 0, color: "var(--fg)",
            }}>
              {ITEM.weapon} |<br/>
              <span className="t-gradient">{ITEM.skin}</span>
            </h1>
            <div style={{ display: "flex", gap: 28, marginTop: 24, flexWrap: "wrap" }}>
              <Spec label="FLOAT" value={ITEM.float.toFixed(3)} />
              <Spec label="PATTERN" value={`#${ITEM.pattern}`} />
              <Spec label="WEAR" value={ITEM.wear} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}
               className="item-actions">
            <BigButton variant="primary"
                       onClick={() => setWatching(!watching)}
                       icon={<Eye size={16} />}>
              {watching ? "WATCHING" : "ADD TO WATCHLIST"}
            </BigButton>
            <BigButton variant="secondary" icon={<Bell size={16} />}
                       onClick={() => onNavigate("alerts")}>SET ALERT</BigButton>
          </div>
        </div>

        {/* PRICE TILES — bigger */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 1, background: "var(--line)", border: "2px solid var(--line)",
                      marginBottom: 56 }} className="price-tiles">
          <PriceTile label="LOWEST ASK" value="$74.21" sub="BUFF163" color="var(--brand)" />
          <PriceTile label="HIGHEST BID" value="$71.05" sub="BUFF163" color="hsl(200 80% 55%)" />
          <PriceTile label="LAST SALE" value="$73.99" sub="5m ago" color="var(--success)" />
          <PriceTile label="30D RANGE" value="$62 – $79" sub="∆ $17 (27%)" color="var(--fg)" />
        </div>

        {/* CHART */}
        <PriceChart />

        {/* TWO-COL: asks list + sales list */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 56 }}
             className="asks-grid">
          <div>
            <Eyebrow>// LOWEST ASK · BY MARKET</Eyebrow>
            <div style={{ border: "2px solid var(--line)" }}>
              {ASK_PROVIDERS.map((p, i) => (
                <div key={p.name} style={{
                  padding: "20px 24px", height: 64,
                  borderBottom: i < ASK_PROVIDERS.length - 1 ? "1px solid var(--line)" : "none",
                  background: p.primary ? "hsl(217 90% 55% / 0.05)" : "var(--surface)",
                  display: "grid", gridTemplateColumns: "auto 1fr auto auto",
                  alignItems: "center", gap: 18,
                }}>
                  <div style={{ width: 28, height: 28, background: "var(--surface-2)" }} />
                  <div>
                    <div style={{ font: "700 14px var(--font-mono)", letterSpacing: "0.1em",
                                   color: "var(--fg)" }}>{p.name}</div>
                    <div className="t-code" style={{ marginTop: 2 }}>{p.volume}</div>
                  </div>
                  <div style={{ font: "700 18px var(--font-mono)",
                                color: p.primary ? "var(--brand)" : "var(--fg)" }}>{p.price}</div>
                  <div style={{ font: "500 12px var(--font-mono)",
                                color: p.spread === "+0.0%" ? "var(--fg-muted)" :
                                       p.spread.startsWith("+") ? "var(--success)" : "hsl(0 70% 60%)",
                                minWidth: 60, textAlign: "right" }}>{p.spread}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Eyebrow>// RECENT SALES</Eyebrow>
            <div style={{ border: "2px solid var(--line)" }}>
              {RECENT_SALES.map((s, i) => (
                <div key={i} style={{
                  padding: "20px 24px", height: 64,
                  borderBottom: i < RECENT_SALES.length - 1 ? "1px solid var(--line)" : "none",
                  background: "var(--surface)",
                  display: "grid", gridTemplateColumns: "1fr 1fr auto auto",
                  alignItems: "center", gap: 18,
                }}>
                  <div>
                    <div style={{ font: "500 14px var(--font-mono)", color: "var(--fg)" }}>{s.time}</div>
                    <div className="t-code" style={{ marginTop: 2 }}>{s.market}</div>
                  </div>
                  <div className="t-code" style={{ fontSize: 12 }}>
                    f {s.float}<br/>
                    p #{s.pattern}
                  </div>
                  <div style={{ font: "700 18px var(--font-mono)", color: "var(--fg)" }}>{s.price}</div>
                  <a onClick={() => onNavigate("sale")} style={{ color: "var(--fg-muted)", cursor: "pointer" }}>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>

      <style>{`
        @media (max-width: 1100px) {
          .item-hero { grid-template-columns: 220px 1fr !important; }
          .item-actions { grid-column: 1 / -1; flex-direction: row !important; }
          .price-tiles { grid-template-columns: 1fr 1fr !important; }
          .asks-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 680px) {
          .item-hero { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
};

const Spec = ({ label, value }) => (
  <div>
    <div className="t-label-xs">{label}</div>
    <div style={{ font: "700 18px var(--font-mono)", color: "var(--fg)", marginTop: 6 }}>{value}</div>
  </div>
);

const PriceTile = ({ label, value, sub, color }) => (
  <div style={{ background: "var(--surface)", padding: "28px 24px", minHeight: 132 }}>
    <div className="t-label-xs" style={{ marginBottom: 14 }}>{label}</div>
    <div style={{ font: "900 32px/1 var(--font-mono)", color, letterSpacing: "-0.01em" }}>{value}</div>
    <div className="t-code" style={{ marginTop: 10, fontSize: 12 }}>{sub}</div>
  </div>
);

Object.assign(window, { ItemScreen });
