// HOME — revised after user feedback:
//   • Everything scaled back. Hero no longer cuts off.
//   • Top-3 Features visuals replaced with real-feeling content:
//     marketplace logos / Doppler knife colours / actual candlesticks.

// ─────────────────────── HERO ───────────────────────

const Hero = ({ onNavigate }) => (
  <section className="bg-grid"
    style={{ position: "relative", display: "flex",
             alignItems: "center", overflow: "hidden", padding: "56px 0" }}>
    <div aria-hidden style={{ position: "absolute", top: 60, right: 60,
                              width: 220, height: 220, border: "2px solid hsl(217 90% 55% / .1)",
                              transform: "rotate(12deg)" }} />
    <div aria-hidden style={{ position: "absolute", bottom: 60, left: 30,
                              width: 160, height: 160, border: "2px solid hsl(217 90% 55% / .07)",
                              transform: "rotate(-6deg)" }} />

    <Container style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 48,
                    alignItems: "center" }} className="hero-grid">
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
                        marginBottom: 22 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
              <LiveDot color="var(--success)" />
              <span className="t-label-xs" style={{ color: "var(--success)", letterSpacing: "0.18em" }}>
                39 MARKETS · LIVE
              </span>
            </span>
            <Tag color="var(--brand)">FREE TIER — NO CARD</Tag>
          </div>

          <h1 style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 6vw, 6rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.035em",
            margin: 0,
            paddingBottom: "0.05em",
          }}>
            <span style={{ color: "var(--fg)" }}>CS2 SKIN</span><br/>
            <span className="t-gradient glow-text">MARKET</span><br/>
            <span style={{ color: "var(--fg)" }}>API<span style={{ color: "var(--brand)" }}>.</span></span>
          </h1>

          <p style={{
            fontFamily: "var(--font-mono)", fontWeight: 400,
            fontSize: "clamp(14px, 1.2vw, 16px)", lineHeight: 1.6,
            color: "var(--fg-muted)", maxWidth: 520, margin: "24px 0 28px",
          }}>
            One free REST API for real-time CS2 skin prices, buy orders, sales history,
            and analytics across 39 marketplaces. Built for developers, trading tools, and data teams.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <BigButton variant="primary" icon={<ArrowRight size={16} />}
              onClick={() => onNavigate("api")}>EXPLORE THE API</BigButton>
            <BigButton variant="secondary" icon={<ExternalLink size={14} />}
              href="https://docs.cs2cap.com/">VIEW DOCS</BigButton>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 1, background: "var(--line)" }}>
            {[
              { v: "39",   l: "MARKETPLACES" },
              { v: "9.2K", l: "ITEMS TRACKED" },
              { v: "Live", l: "PRICES" },
              { v: "365+", l: "DAYS OF HISTORY" },
            ].map((s) => (
              <div key={s.l} style={{ background: "var(--surface)", padding: "18px 18px" }}>
                <div style={{ font: "700 clamp(22px, 2.4vw, 30px)/1 var(--font-mono)",
                              color: "var(--brand)" }}>{s.v}</div>
                <div className="t-label-xs" style={{ marginTop: 8 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual — terminal-style data card */}
        <div className="hero-visual" style={{ position: "relative" }}>
          <div style={{
            background: "var(--surface)", border: "2px solid var(--line)",
            boxShadow: "8px 8px 0 hsl(217 90% 55% / 0.3)",
          }}>
            <div style={{ borderBottom: "2px solid var(--line)", padding: "10px 14px",
                          display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%",
                             background: "hsl(0 70% 50% / .6)" }} />
              <span style={{ width: 9, height: 9, borderRadius: "50%",
                             background: "hsl(40 90% 55% / .6)" }} />
              <span style={{ width: 9, height: 9, borderRadius: "50%",
                             background: "hsl(145 70% 45% / .6)" }} />
              <span className="t-code" style={{ marginLeft: 10, fontSize: 11 }}>
                cs2cap · live · BUFF163
              </span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 72, height: 72, background:
                  "linear-gradient(135deg, hsl(40 30% 30%), hsl(40 80% 50%))" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="t-label-xs">AWP · COVERT · STATTRAK</div>
                  <div style={{ font: "900 20px var(--font-sans)", letterSpacing: "-0.02em",
                                color: "var(--fg)", marginTop: 3 }}>Asiimov</div>
                  <div className="t-code" style={{ marginTop: 3, fontSize: 11 }}>Field-Tested · 0.207 float</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                            gap: 1, background: "var(--line)",
                            border: "1px solid var(--line)", marginBottom: 14 }}>
                <div style={{ background: "var(--bg)", padding: "12px 14px" }}>
                  <div className="t-label-xs">LOWEST ASK</div>
                  <div style={{ font: "700 22px var(--font-mono)", color: "var(--brand)", marginTop: 5 }}>$74.21</div>
                </div>
                <div style={{ background: "var(--bg)", padding: "12px 14px" }}>
                  <div className="t-label-xs">HIGHEST BID</div>
                  <div style={{ font: "700 22px var(--font-mono)", color: "var(--fg)", marginTop: 5 }}>$71.05</div>
                </div>
              </div>
              <svg viewBox="0 0 320 64" width="100%" height="64" style={{ display: "block" }}>
                <defs>
                  <linearGradient id="hg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217 90% 55%)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="hsl(217 90% 55%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,45 L20,42 L40,48 L60,35 L80,38 L100,32 L120,28 L140,34 L160,22 L180,26 L200,18 L220,20 L240,12 L260,14 L280,8 L300,12 L320,4"
                      fill="none" stroke="hsl(217 90% 55%)" strokeWidth="2" />
                <path d="M0,45 L20,42 L40,48 L60,35 L80,38 L100,32 L120,28 L140,34 L160,22 L180,26 L200,18 L220,20 L240,12 L260,14 L280,8 L300,12 L320,4 L320,64 L0,64 Z"
                      fill="url(#hg)" />
              </svg>
              <div className="t-code" style={{ marginTop: 8, fontSize: 11 }}>30D · +14.8%</div>
            </div>
          </div>
        </div>
      </div>
    </Container>

    <style>{`
      @media (max-width: 1100px) {
        .hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
      }
      @media (max-width: 700px) {
        .hero-visual { display: none; }
      }
    `}</style>
  </section>
);

// ─────────────────────── TOP-3 FEATURES ───────────────────────
// Visuals revised per feedback:
//  1) Real marketplace logos (BUFF163 + Youpin) + "30+ markets" badge cluster
//  2) Karambit silhouettes coloured for Doppler phases
//  3) Actual candlestick chart with year markers

const PROVIDER_LOGO = "https://cdn.cs2c.app/images/providers";

const Top3Features = ({ onNavigate }) => {
  const items = [
    {
      tag: "PRICES + BUY ORDERS",
      title: "BUFF163, YOUPIN +30 MORE",
      blurb: "Live ask, bid, and recent sales across every market that moves CS2 prices.",
      cta: "BUFF163 API",
      to: "buff163",
      visual: <Top3Visual1 />,
    },
    {
      tag: "DOPPLER PHASES",
      title: "EVERY PHASE PRICED",
      blurb: "Ruby, Sapphire, Black Pearl, Emerald, Phases 1–4 — never bundled, never guessed.",
      cta: "DOPPLER API",
      to: "doppler",
      visual: <Top3Visual2 />,
    },
    {
      tag: "MULTI-YEAR HISTORY",
      title: "REAL OHLC CANDLES",
      blurb: "5-minute to daily candlesticks. Two years of depth across every release and patch.",
      cta: "HISTORY API",
      to: "history",
      visual: <Top3Visual3 />,
    },
  ];
  return (
    <section style={{ borderTop: "2px solid var(--line)", padding: "88px 0" }}>
      <Container>
        <Eyebrow>// THREE THINGS WE DO BEST</Eyebrow>
        <h2 style={{
          fontFamily: "var(--font-sans)", fontWeight: 900,
          fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1,
          letterSpacing: "-0.035em", margin: "0 0 44px", maxWidth: 880,
        }}>
          THE DATA YOU CAN'T <span className="t-gradient">GET ANYWHERE ELSE</span>.
        </h2>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1, background: "var(--line)",
          border: "2px solid var(--line)",
        }} className="top3-grid">
          {items.map((f) => (
            <article key={f.title} style={{ background: "var(--surface)", padding: 28,
                                             display: "flex", flexDirection: "column", gap: 22 }}>
              <Tag color="var(--brand)">{f.tag}</Tag>
              <div style={{ height: 180, border: "2px solid var(--line)",
                            background: "var(--bg)", overflow: "hidden", position: "relative" }}>
                {f.visual}
              </div>
              <div>
                <h3 style={{ font: "900 22px var(--font-sans)", letterSpacing: "-0.025em",
                             margin: 0, lineHeight: 1.05, color: "var(--fg)" }}>{f.title}</h3>
                <p style={{ font: "400 13px/1.55 var(--font-mono)", color: "var(--fg-muted)",
                             margin: "10px 0 0" }}>{f.blurb}</p>
              </div>
              <div style={{ marginTop: "auto" }}>
                <SmallButton onClick={() => onNavigate(f.to)}
                             icon={<ArrowRight size={13} />}>{f.cta}</SmallButton>
              </div>
            </article>
          ))}
        </div>
      </Container>
      <style>{`
        @media (max-width: 1000px) {
          .top3-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};

// ── Visual 1: BUFF163 + Youpin logos + market cluster ──
const Top3Visual1 = () => {
  // 5 satellite logos representing the long tail
  const satellites = ["csfloat", "skinport", "steam", "bitskins", "dmarket"];
  return (
    <div style={{ position: "absolute", inset: 0, padding: 14,
                  display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 18, padding: "6px 0" }}>
        {/* BUFF163 logo + Youpin logo, side by side with a + */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 56, height: 56, background: "var(--surface-2)",
                         border: "2px solid var(--line)", display: "flex",
                         alignItems: "center", justifyContent: "center", padding: 6,
                         overflow: "hidden" }}>
            <img src={`${PROVIDER_LOGO}/buff163.png`} alt="BUFF163"
                 width={44} height={44} style={{ objectFit: "contain" }}
                 onError={(e) => { e.currentTarget.style.display = "none";
                                    e.currentTarget.parentNode.innerHTML = '<span style="font:900 11px var(--font-mono); color:var(--brand);">B163</span>'; }} />
          </div>
          <span style={{ font: "700 9px var(--font-mono)", letterSpacing: "0.16em",
                          color: "var(--fg)" }}>BUFF163</span>
        </div>
        <span style={{ font: "900 22px var(--font-sans)", color: "var(--fg-muted)" }}>+</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 56, height: 56, background: "var(--surface-2)",
                         border: "2px solid var(--line)", display: "flex",
                         alignItems: "center", justifyContent: "center", padding: 6,
                         overflow: "hidden" }}>
            <img src={`${PROVIDER_LOGO}/youpin.png`} alt="Youpin"
                 width={44} height={44} style={{ objectFit: "contain" }}
                 onError={(e) => { e.currentTarget.style.display = "none";
                                    e.currentTarget.parentNode.innerHTML = '<span style="font:900 11px var(--font-mono); color:hsl(40 90% 55%);">YP</span>'; }} />
          </div>
          <span style={{ font: "700 9px var(--font-mono)", letterSpacing: "0.16em",
                          color: "var(--fg)" }}>YOUPIN898</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12,
                     display: "flex", alignItems: "center", gap: 10,
                     justifyContent: "center" }}>
        <span className="t-label-xs">+ 30 MORE MARKETS</span>
        <div style={{ display: "flex", gap: 4 }}>
          {satellites.map((s) => (
            <div key={s} style={{ width: 22, height: 22, background: "var(--surface)",
                                    border: "1px solid var(--line)", padding: 2,
                                    display: "flex", alignItems: "center",
                                    justifyContent: "center", overflow: "hidden" }}>
              <img src={`${PROVIDER_LOGO}/${s}.png`} alt={s}
                   width={16} height={16} style={{ objectFit: "contain" }}
                   onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Visual 2: Karambit silhouettes in Doppler phase colours ──
const KarambitSvg = ({ color, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
    <svg viewBox="0 0 40 60" width="32" height="48">
      {/* simplified karambit blade silhouette */}
      <defs>
        <linearGradient id={`g-${label}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="60%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* blade */}
      <path d="M30 6 Q 38 22 28 38 Q 16 48 8 38 Q 14 30 18 22 Q 24 12 30 6 Z"
            fill={`url(#g-${label})`} stroke={color} strokeWidth="0.8" strokeOpacity="0.6" />
      {/* finger ring */}
      <circle cx="11" cy="48" r="6" fill="none" stroke={color} strokeWidth="2" />
      {/* handle */}
      <path d="M17 44 L24 48" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
    </svg>
    <span style={{ font: "700 8px var(--font-mono)", letterSpacing: "0.1em",
                    color: "var(--fg-muted)", textTransform: "uppercase",
                    whiteSpace: "nowrap" }}>{label}</span>
  </div>
);

const Top3Visual2 = () => {
  const phases = [
    { c: "hsl(0 80% 55%)",    l: "RUBY",     p: "$3,420" },
    { c: "hsl(217 90% 55%)",  l: "SAPPHIRE", p: "$5,180" },
    { c: "hsl(145 70% 45%)",  l: "EMERALD",  p: "$8,720" },
    { c: "hsl(220 30% 22%)",  l: "BLK PRL",  p: "$2,950" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, padding: 14,
                  display: "flex", flexDirection: "column",
                  justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-start" }}>
        {phases.map((p) => <KarambitSvg key={p.l} color={p.c} label={p.l} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                     gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
        {phases.map((p) => (
          <div key={p.l} style={{ background: "var(--surface)",
                                   padding: "5px 6px", textAlign: "center" }}>
            <div style={{ font: "700 11px var(--font-mono)", color: p.c }}>{p.p}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Visual 3: Real OHLC candlesticks across 24 months ──
const Top3Visual3 = () => {
  // Deterministic synthetic OHLC: gentle uptrend with green/red variation.
  // values in 0..1 mapped to chart y later.
  const N = 28;
  const candles = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    const mid = 0.6 - t * 0.42;                   // upward = lower y
    const wave = Math.sin(i * 0.83) * 0.04;
    const o = mid + wave;
    const c = mid + wave + (Math.sin(i * 2.1) * 0.07);
    const h = Math.min(o, c) - 0.045 - Math.abs(Math.sin(i * 1.3)) * 0.02;
    const l = Math.max(o, c) + 0.045 + Math.abs(Math.cos(i * 0.7)) * 0.02;
    return { o, c, h, l, up: c < o };
  });
  const W = 240, H = 150;
  const top = 16, bot = H - 22;
  const range = bot - top;
  const cw = (W - 20) / N;
  const y = (v) => top + v * range;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="10" y1={y(g)} x2={W - 10} y2={y(g)}
              stroke="var(--line)" strokeOpacity="0.6" strokeDasharray="2 4" />
      ))}
      {/* year dividers */}
      <line x1={W / 3 + 10} y1={top - 2} x2={W / 3 + 10} y2={bot + 2}
            stroke="var(--line)" strokeDasharray="2 3" />
      <line x1={(2 * W) / 3 + 10} y1={top - 2} x2={(2 * W) / 3 + 10} y2={bot + 2}
            stroke="var(--line)" strokeDasharray="2 3" />
      {/* year labels */}
      <text x="14" y={H - 6} fill="var(--fg-muted)" fontFamily="JetBrains Mono"
            fontSize="8" letterSpacing="1.5">2024</text>
      <text x={W / 3 + 18} y={H - 6} fill="var(--fg-muted)" fontFamily="JetBrains Mono"
            fontSize="8" letterSpacing="1.5">2025</text>
      <text x={(2 * W) / 3 + 18} y={H - 6} fill="var(--fg-muted)" fontFamily="JetBrains Mono"
            fontSize="8" letterSpacing="1.5">2026</text>

      {/* candles */}
      {candles.map((c, i) => {
        const x = 14 + i * cw;
        const cx = x + cw / 2 - 1;
        const color = c.up ? "hsl(145 70% 45%)" : "hsl(0 70% 55%)";
        const bodyTop = y(Math.min(c.o, c.c));
        const bodyH = Math.max(2, Math.abs(y(c.c) - y(c.o)));
        return (
          <g key={i}>
            <line x1={cx + 0.5} y1={y(c.h)} x2={cx + 0.5} y2={y(c.l)}
                  stroke={color} strokeWidth="1" />
            <rect x={x} y={bodyTop} width={cw - 2} height={bodyH}
                  fill={color} />
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────── HOW IT WORKS ───────────────────────
const HowItWorks = ({ onNavigate }) => (
  <section className="bg-grid" style={{ borderTop: "2px solid var(--line)", padding: "88px 0" }}>
    <Container>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr",
                    gap: 56, alignItems: "center" }} className="hiw-grid">
        <div>
          <Eyebrow>// HOW IT WORKS</Eyebrow>
          <h2 style={{
            fontFamily: "var(--font-sans)", fontWeight: 900,
            fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1,
            letterSpacing: "-0.035em", margin: "0 0 20px", maxWidth: 480,
          }}>
            ONE API,<br/><span className="t-gradient">EVERY MARKETPLACE</span>
          </h2>
          <p className="t-p-mono" style={{ maxWidth: 440, marginBottom: 26, fontSize: 13 }}>
            Integrate real-time CS2 market data into your apps, bots, and tools. Prices, trades,
            arbitrage signals, and historical data — all via a single REST API.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {[
              { Icon: Globe, text: "Real-time prices from 39 marketplaces, one endpoint" },
              { Icon: Zap,   text: "30,000+ items, priced live" },
              { Icon: Code2, text: "Prices, bids, sales, history, alerts — all in one spec" },
            ].map((item) => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <item.Icon size={14} />
                <span style={{ font: "500 13px var(--font-mono)", color: "var(--fg)" }}>{item.text}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <BigButton variant="primary" icon={<ArrowRight size={14} />}
                       onClick={() => onNavigate("api")}>SEE ENDPOINTS</BigButton>
            <BigButton variant="secondary"
                       onClick={() => onNavigate("pricing")}>VIEW PRICING</BigButton>
          </div>
        </div>

        <div style={{ border: "2px solid var(--line)", background: "var(--surface)",
                      boxShadow: "8px 8px 0 hsl(217 90% 55% / 0.25)" }}>
          <div style={{ borderBottom: "2px solid var(--line)", padding: "10px 16px",
                        display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "hsl(0 70% 50% / .6)" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "hsl(40 90% 55% / .6)" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "hsl(145 70% 45% / .6)" }} />
            <span className="t-code" style={{ marginLeft: 8, fontSize: 11 }}>GET /v1/prices?item_id=1234</span>
          </div>
          <pre style={{ margin: 0, padding: 18, font: "400 12px/1.65 var(--font-mono)",
                        color: "var(--fg-muted)", overflowX: "auto" }}>
{`curl https://api.cs2c.app/v1/prices?item_id=1234

{
  "meta": {
    "currency": "USD",
    "returned_providers": ["buff163", "csfloat", "youpin"]
  },
  "items": [
    {
      "item_id": 1234,
      "market_hash_name": "AWP | Asiimov (Field-Tested)",
      "lowest_ask": 74.21,
      "highest_bid": 71.05,
      "provider": "buff163",
      "updated_at": "2026-05-15T09:18:42Z"
    }
  ]
}`}
          </pre>
        </div>
      </div>
    </Container>
    <style>{`
      @media (max-width: 1000px) {
        .hiw-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
  </section>
);

// ─────────────────────── MARKETPLACES ───────────────────────
// Loaded from the providers.json the user uploaded — real names, logo URLs,
// real capability flags.

const PROVIDERS = [
  { name: "BUFF163",       key: "buff163",   caps: ["L", "BO", "RS"] },
  { name: "Youpin898",     key: "youpin",    caps: ["L", "BO", "RS"] },
  { name: "CSFloat",       key: "csfloat",   caps: ["L", "BO", "RS"] },
  { name: "DMarket",       key: "dmarket",   caps: ["L", "BO", "RS"] },
  { name: "C5GAME",        key: "c5",        caps: ["L", "BO", "RS"] },
  { name: "BUFF Market",   key: "buffmarket",caps: ["L", "BO"] },
  { name: "BitSkins",      key: "bitskins",  caps: ["L", "RS"] },
  { name: "Skinport",      key: "skinport",  caps: ["L"] },
  { name: "Steam Market",  key: "steam",     caps: ["L", "BO"] },
  { name: "WAXPEER",       key: "waxpeer",   caps: ["L", "BO"] },
  { name: "Market.CSGO",   key: "marketcsgo",caps: ["L", "BO"] },
  { name: "white.market",  key: "whitemarket",caps: ["L", "BO"] },
  { name: "ECOSteam",      key: "ecosteam",  caps: ["L", "BO"] },
  { name: "CS.MONEY · Market", key: "csmoney_m", caps: ["L"] },
  { name: "HaloSkins",     key: "haloskins", caps: ["L"] },
  { name: "LIS-SKINS",     key: "lisskins",  caps: ["L"] },
  { name: "SkinBaron",     key: "skinbaron", caps: ["L"] },
  { name: "Skinvault",     key: "skinvault", caps: ["L"] },
  { name: "ShadowPay",     key: "shadowpay", caps: ["L"] },
  { name: "Tradeit.gg",    key: "tradeit",   caps: ["L"] },
  { name: "CS.Deals",      key: "csdeals",   caps: ["L"] },
  { name: "Avan Market",   key: "avanmarket",caps: ["L"] },
  { name: "CSGOEmpire",    key: "csgoempire",caps: ["L", "RS"] },
  { name: "CSGO500",       key: "csgo500",   caps: ["L", "RS"] },
];

const CAP_STYLE = {
  L:  { color: "var(--brand)",       border: "hsl(217 90% 55% / .35)",  full: "Listings" },
  BO: { color: "hsl(200 80% 55%)",   border: "hsl(200 80% 55% / .35)",  full: "Buy Orders" },
  RS: { color: "hsl(145 70% 45%)",   border: "hsl(145 70% 45% / .35)",  full: "Recent Sales" },
};

const MarketplacesSection = () => (
  <section style={{ borderTop: "2px solid var(--line)", padding: "88px 0" }}>
    <Container>
      <Eyebrow>// WHERE WE PULL FROM</Eyebrow>
      <h2 style={{
        fontFamily: "var(--font-sans)", fontWeight: 900,
        fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1,
        letterSpacing: "-0.035em", margin: "0 0 14px",
      }}>
        39 MARKETPLACES<span style={{ color: "var(--brand)" }}>.</span>
      </h2>
      <p className="t-p-mono" style={{ maxWidth: 480, fontSize: 13, marginBottom: 22 }}>
        Every major CS2 marketplace. One search, one view, one spec.
      </p>
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          { c: "var(--brand)",      l: "39 LISTINGS" },
          { c: "hsl(200 80% 55%)",  l: "11 BUY ORDERS" },
          { c: "hsl(145 70% 45%)",  l: "10 SALES DATA" },
        ].map((it) => (
          <span key={it.l} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, background: it.c }} />
            <span className="t-label-xs" style={{ color: "var(--fg-muted)" }}>{it.l}</span>
          </span>
        ))}
      </div>
      <div style={{ display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 1, background: "var(--line)", border: "2px solid var(--line)" }}>
        {PROVIDERS.map((m) => (
          <div key={m.key}
            style={{ background: "var(--surface)", padding: "14px 16px",
                     display: "flex", alignItems: "center", justifyContent: "space-between",
                     gap: 14, transition: "background 80ms ease", cursor: "pointer" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "hsl(220 15% 12% / .5)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "var(--surface)")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, background: "var(--surface-2)",
                              border: "1px solid var(--line)", padding: 3,
                              flexShrink: 0, display: "flex",
                              alignItems: "center", justifyContent: "center",
                              overflow: "hidden" }}>
                <img src={`${PROVIDER_LOGO}/${m.key}.png`} alt={m.name}
                     width={22} height={22} style={{ objectFit: "contain" }}
                     onError={(e) => { e.currentTarget.style.display = "none"; }} />
              </div>
              <div style={{ font: "700 13px var(--font-mono)",
                            letterSpacing: "0.08em", textTransform: "uppercase",
                            color: "var(--fg)", overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
            </div>
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              {m.caps.map((c) => (
                <span key={c} title={CAP_STYLE[c].full}
                  style={{
                    display: "inline-block", padding: "2px 6px",
                    border: `1px solid ${CAP_STYLE[c].border}`,
                    color: CAP_STYLE[c].color,
                    font: "700 9px var(--font-mono)", letterSpacing: "0.1em",
                  }}>{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
        <LiveDot color="var(--success)" />
        <span className="t-label-xs" style={{ color: "var(--success)" }}>ALL MARKETS LIVE</span>
      </div>
    </Container>
  </section>
);

// ─────────────────────── COMPOSITION ───────────────────────
const HomeScreen = ({ onNavigate }) => (
  <main>
    <LiveTicker />
    <Hero onNavigate={onNavigate} />
    <Top3Features onNavigate={onNavigate} />
    <HowItWorks onNavigate={onNavigate} />
    <MarketplacesSection />
  </main>
);

Object.assign(window, { HomeScreen });
