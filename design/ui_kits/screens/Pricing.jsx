// PRICING — real data sourced from data/tiers.json.
//
// Quarterly pricing is inconsistent across rails (Stripe has a 16% discount
// only on STARTER; NowPayments/crypto has 16% off on every paid plan) — so
// rather than a misleading toggle, we just show monthly and note that
// quarterly + crypto rates are available at checkout.

const PLANS = [
  {
    code: "free", name: "FREE", badge: null,
    accent: "var(--fg)", monthlyCents: 0,
    blurb: "Try the API, build a prototype.",
    cta: "GET STARTED · FREE", primary: false,
    rate: { num: "20", unit: "REQUESTS / MIN" },
    quota: "1,000 requests / month",
    features: [
      "Real-time prices · 39 marketplaces",
      "Item catalog (/v1/items)",
      "Portfolio & inventory valuation",
      "Daily candlesticks · 30d lookback",
      "Watchlist · up to 50 items",
    ],
    limits: ["No alerts · No webhooks · No buy orders"],
  },
  {
    code: "starter", name: "STARTER", badge: "../../assets/starter-tier.png",
    accent: "hsl(155 85% 55%)", monthlyCents: 1900,
    blurb: "Serious hobbyist · current prices, bids, batch.",
    cta: "SUBSCRIBE · STARTER", primary: false,
    rate: { num: "40", unit: "REQUESTS / MIN" },
    quota: "50,000 requests / month",
    features: [
      "Everything in FREE",
      "Buy orders (/v1/bids + /bids/batch)",
      "Batch price lookups (/v1/prices/batch)",
      "Provider catalogue (/v1/providers)",
      "Basic email support",
    ],
    limits: ["No sales history · No candles past 30d · No alerts"],
  },
  {
    code: "pro", name: "PRO", badge: "../../assets/pro-tier.png",
    accent: "var(--brand)", monthlyCents: 7900,
    blurb: "Full market data for trading tools and bots.",
    cta: "SUBSCRIBE · PRO", primary: true, popular: true,
    rate: { num: "100", unit: "REQUESTS / MIN" },
    quota: "500,000 requests / month",
    features: [
      "Everything in STARTER",
      "Recent sales (/v1/sales)",
      "Full candlesticks · all intervals + fill",
      "Multi-year price history (/v1/prices/history)",
      "Market item snapshots (/v1/market/items)",
      "25 price alerts",
      "Bulk snapshot exports · Listing URLs",
      "250 watchlist items · 50 portfolios",
    ],
    limits: [],
  },
  {
    code: "quant", name: "QUANT", badge: "../../assets/quant-tier.png",
    accent: "hsl(45 95% 60%)", monthlyCents: 17900,
    blurb: "Market-makers, arbitrage desks, indicators.",
    cta: "SUBSCRIBE · QUANT", primary: false,
    rate: { num: "300", unit: "REQUESTS / MIN" },
    quota: "1,000,000 requests / month",
    features: [
      "Everything in PRO",
      "Arbitrage scanner (/v1/market/arbitrage)",
      "Technical indicators (/v1/market/indicators)",
      "Market indexes (/v1/market/indexes)",
      "Webhooks · up to 5 destinations",
      "200 price alerts · 25 child API keys",
      "1,000 watchlist items · 1,000 portfolios",
      "Priority support · 24h SLA",
    ],
    limits: [],
  },
];

const fmtPrice = (cents) => {
  if (cents === 0) return "$0";
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
};

const PlanCard = ({ plan, onSubscribe }) => {
  const [hover, setHover] = React.useState(false);

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface)",
        border: plan.popular ? "2px solid var(--brand)" : "2px solid var(--line)",
        padding: 26,
        position: "relative",
        transform: hover ? "translate(-3px, -3px)" : "translate(0, 0)",
        boxShadow: hover ? "6px 6px 0 var(--brand)" : "none",
        transition: "transform 80ms ease, box-shadow 80ms ease",
        display: "flex", flexDirection: "column", gap: 20,
      }}
    >
      {plan.popular && (
        <div style={{
          position: "absolute", top: -2, left: -2, right: -2,
          background: "var(--brand)", color: "hsl(220 20% 4%)",
          font: "900 11px var(--font-mono)", letterSpacing: "0.2em",
          padding: "6px 12px", textAlign: "center",
        }}>MOST POPULAR</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14,
                    marginTop: plan.popular ? 18 : 0 }}>
        {plan.badge ? (
          <img src={plan.badge} alt="" width={52} height={52} />
        ) : (
          <div style={{ width: 52, height: 52, border: "2px solid var(--line)",
                         display: "flex", alignItems: "center", justifyContent: "center",
                         font: "900 18px var(--font-sans)", color: "var(--fg-muted)" }}>F</div>
        )}
        <div>
          <div style={{ font: "900 20px var(--font-sans)", letterSpacing: "-0.02em",
                        color: plan.accent }}>{plan.name}</div>
          <div className="t-code" style={{ marginTop: 4, fontSize: 11 }}>{plan.blurb}</div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontWeight: 900,
                          fontSize: 48, lineHeight: 1, letterSpacing: "-0.04em",
                          color: "var(--fg)" }}>{fmtPrice(plan.monthlyCents)}</span>
          <span className="t-code" style={{ fontSize: 12 }}>/mo</span>
        </div>
        <div className="t-code" style={{ marginTop: 8, fontSize: 11 }}>
          {plan.monthlyCents === 0
            ? "Always free · no card required"
            : "Billed monthly · USD"}
        </div>
      </div>

      <div style={{ background: "var(--bg)", border: "1px solid var(--line)",
                    padding: "12px 16px" }}>
        <div className="t-label-xs">RATE LIMIT</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <span style={{ font: "700 22px/1 var(--font-mono)", color: plan.accent }}>{plan.rate.num}</span>
          <span className="t-code" style={{ fontSize: 11 }}>{plan.rate.unit}</span>
        </div>
        <div className="t-code" style={{ marginTop: 6, fontSize: 11, color: "var(--fg-muted)" }}>
          {plan.quota}
        </div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0,
                   display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Check size={13} stroke={2.5} />
            <span style={{ font: "400 13px/1.45 var(--font-mono)", color: "var(--fg)" }}>{f}</span>
          </li>
        ))}
        {plan.limits.map((l) => (
          <li key={l} style={{ display: "flex", gap: 10, alignItems: "flex-start",
                                opacity: 0.6 }}>
            <Minus size={13} stroke={2} />
            <span style={{ font: "400 12px/1.45 var(--font-mono)", color: "var(--fg-muted)" }}>{l}</span>
          </li>
        ))}
      </ul>

      <SmallButton variant={plan.primary ? "primary" : "secondary"}
                   onClick={() => onSubscribe(plan.code)}>{plan.cta}</SmallButton>
    </article>
  );
};

const MatrixRow = ({ feature, values, header = false }) => (
  <div style={{
    display: "grid", gridTemplateColumns: "minmax(200px, 1.3fr) repeat(4, 1fr)",
    background: header ? "var(--surface-2)" : "transparent",
    borderBottom: "1px solid var(--line)",
  }}>
    <div style={{ padding: "14px 18px",
                  font: header ? "900 13px var(--font-sans)" : "400 13px var(--font-mono)",
                  letterSpacing: header ? "-0.01em" : "normal",
                  color: "var(--fg)",
                  textTransform: header ? "uppercase" : "none" }}>
      {feature}
    </div>
    {values.map((v, i) => (
      <div key={i} style={{ padding: "14px 16px",
                            borderLeft: "1px solid var(--line)",
                            font: "500 13px var(--font-mono)",
                            color: header ? "var(--fg-muted)" : "var(--fg)",
                            textAlign: "center",
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
        {v === true ? <Check size={15} stroke={2.5} /> :
         v === false ? <Minus size={15} stroke={2} /> :
         v}
      </div>
    ))}
  </div>
);

const FeatureMatrix = () => {
  const sections = [
    { name: "REQUESTS",
      rows: [
        ["Requests / month",  ["1,000",   "50,000",  "500,000",  "1,000,000"]],
        ["Rate limit",        ["20/min",  "40/min",  "100/min",  "300/min"]],
        ["Limit param cap",   ["100",     "1,000",   "1,000",    "1,000"]],
      ] },
    { name: "ENDPOINTS",
      rows: [
        ["Prices · /v1/prices",          [true,  true,  true,  true]],
        ["Items · /v1/items",            [true,  true,  true,  true]],
        ["Buy orders · /v1/bids",        [false, true,  true,  true]],
        ["Batch prices · /prices/batch", [false, true,  true,  true]],
        ["Batch bids · /bids/batch",     [false, true,  true,  true]],
        ["Sales · /v1/sales",            [false, false, true,  true]],
        ["Price history · /prices/history", [false, false, true,  true]],
        ["Candles full · all intervals", ["1d/30d", "1d/30d", true, true]],
        ["Market items · /market/items", [false, false, true,  true]],
        ["Arbitrage · /market/arbitrage",[false, false, false, true]],
        ["Indicators · /market/indicators", [false, false, false, true]],
        ["Market indexes · /market/indexes", [false, false, false, true]],
      ] },
    { name: "PLATFORM",
      rows: [
        ["Watchlist items",     ["50",   "—",    "250",   "1,000"]],
        ["Portfolios",          ["20",   "—",    "50",    "1,000"]],
        ["Active alerts",       ["0",    "0",    "25",    "200"]],
        ["Child API keys",      ["0",    "0",    "0",     "25"]],
        ["Webhook destinations",["0",    "0",    "0",     "5"]],
        ["Bulk snapshots",      [false,  false,  true,    true]],
        ["Listing URLs",        [false,  false,  true,    true]],
      ] },
    { name: "SUPPORT",
      rows: [
        ["Support",            ["—",      "Basic",  "Basic",  "Priority"]],
        ["SLA",                ["—",      "—",      "—",      "24h"]],
      ] },
  ];
  return (
    <div style={{ border: "2px solid var(--line)" }}>
      <MatrixRow feature="FEATURE" values={["FREE", "STARTER", "PRO", "QUANT"]} header />
      {sections.map((sec) => (
        <React.Fragment key={sec.name}>
          <div style={{
            padding: "10px 18px", background: "hsl(220 18% 7%)",
            font: "700 11px var(--font-mono)", letterSpacing: "0.2em",
            color: "var(--brand)", borderBottom: "1px solid var(--line)",
          }}>// {sec.name}</div>
          {sec.rows.map((row) => (
            <MatrixRow key={row[0]} feature={row[0]} values={row[1]} />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

const FAQ_ITEMS = [
  { q: "What counts as a request?",
    a: "Any HTTP call to api.cs2c.app/v1/* counts as one request. Batch endpoints (e.g. /v1/prices/batch) count once per call regardless of how many items you return — that's the cheapest way to fetch a portfolio." },
  { q: "Can I switch billing rails?",
    a: "Yes. Stripe (card / SEPA / Apple-Google Pay) and NowPayments (crypto) are both supported. Quarterly billing on NowPayments saves 16% on every paid plan; on Stripe the quarterly discount only applies to STARTER right now." },
  { q: "Can I change plans at any time?",
    a: "Yes. Upgrades take effect immediately and are prorated. Downgrades take effect at the end of the current billing cycle." },
  { q: "Is the free tier rate-limited per IP or per key?",
    a: "Per API key. Anonymous (unauthenticated) requests are limited to 10/min per IP." },
  { q: "Which marketplaces have buy orders?",
    a: "BUFF163, Youpin898, Buff Market, C5GAME, CSFloat, DMarket, ECOSteam, Market.CSGO, Steam Community Market, WAXPEER, white.market — that's 11 of the 39 supported markets. The full list is on /api-info." },
  { q: "Do you offer refunds?",
    a: "Within 7 days of a new subscription, contact support for a full refund. Annual plans are refundable on a prorated basis within the first 30 days." },
];

const FAQ = () => {
  const [open, setOpen] = React.useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--line)",
                  border: "2px solid var(--line)" }}>
      {FAQ_ITEMS.map((item, i) => (
        <div key={item.q} style={{ background: "var(--surface)" }}>
          <button onClick={() => setOpen(open === i ? -1 : i)}
            style={{ width: "100%", padding: "18px 24px", background: "transparent",
                     border: "none", cursor: "pointer", display: "flex",
                     alignItems: "center", justifyContent: "space-between",
                     gap: 16, textAlign: "left" }}>
            <span style={{ font: "700 15px var(--font-sans)", letterSpacing: "-0.01em",
                           color: "var(--fg)" }}>{item.q}</span>
            {open === i ? <Minus size={18} /> : <Plus size={18} />}
          </button>
          {open === i && (
            <div style={{ padding: "0 24px 22px",
                          font: "400 14px/1.6 var(--font-mono)", color: "var(--fg-muted)" }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const PricingScreen = ({ onNavigate }) => {
  return (
    <main>
      {/* Header */}
      <section className="bg-grid" style={{ padding: "64px 0 40px" }}>
        <Container>
          <Eyebrow>// PRICING</Eyebrow>
          <h1 style={{
            fontFamily: "var(--font-sans)", fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 4.5rem)", lineHeight: 0.96,
            letterSpacing: "-0.035em", margin: "0 0 24px", maxWidth: 900,
          }}>
            PRICED FOR<br/>
            <span className="t-gradient">DEVELOPERS &amp; TRADERS</span>.
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontWeight: 400,
                       fontSize: "clamp(14px, 1.2vw, 16px)", lineHeight: 1.55,
                       color: "var(--fg-muted)", maxWidth: 680, margin: 0 }}>
            Start free, no card required. Upgrade when you need buy orders,
            sales history, multi-year candles, or higher rate limits.
          </p>
        </Container>
      </section>

      {/* Plan cards · 4-up */}
      <section style={{ padding: "32px 0 80px" }}>
        <Container>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 18, alignItems: "stretch" }} className="plans-grid">
            {PLANS.map((p) => (
              <PlanCard key={p.code} plan={p}
                        onSubscribe={() => onNavigate("billing")} />
            ))}
          </div>
          <div className="t-p-mono" style={{ marginTop: 28, textAlign: "center",
                                              fontSize: 12, color: "var(--fg-muted)" }}>
            Quarterly &amp; crypto rates available at checkout · −16% on NowPayments quarterly · 
            Need more than QUANT? <a onClick={() => onNavigate("contact")}
              style={{ color: "var(--brand)", cursor: "pointer", textDecoration: "underline" }}>
              Talk to us
            </a>.
          </div>
        </Container>
      </section>

      {/* "How billing works" */}
      <section style={{ borderTop: "2px solid var(--line)", padding: "80px 0",
                         background: "var(--surface)" }}>
        <Container>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr",
                        gap: 56, alignItems: "center" }} className="hiw-grid">
            <div>
              <Eyebrow>// HOW BILLING WORKS</Eyebrow>
              <h2 style={{
                fontFamily: "var(--font-sans)", fontWeight: 900,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)", lineHeight: 1,
                letterSpacing: "-0.03em", margin: "0 0 20px",
              }}>
                BATCH ENDPOINTS<br/>= ONE REQUEST.
              </h2>
              <p className="t-p-mono" style={{ marginBottom: 16, fontSize: 14 }}>
                Bulk endpoints don't multiply. <code style={{ color: "var(--brand)",
                background: "var(--bg)", padding: "2px 6px",
                font: "500 12px var(--font-mono)" }}>/v1/prices/batch</code> with 50 items
                is one request, not fifty.
              </p>
              <p className="t-p-mono" style={{ fontSize: 14 }}>
                The <code style={{ color: "var(--brand)", background: "var(--bg)",
                padding: "2px 6px", font: "500 12px var(--font-mono)" }}>limit</code> param
                caps how many items come back per batch call — 100 on FREE, 1,000 on every paid tier.
              </p>
            </div>
            <div style={{ background: "var(--bg)", border: "2px solid var(--line)",
                          padding: 24 }}>
              <div className="t-label-xs" style={{ marginBottom: 14 }}>EXAMPLE · PRO PLAN · MONTH-TO-DATE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1,
                            background: "var(--line)", border: "1px solid var(--line)" }}>
                {[
                  ["Watchlist refresh · 250 items × 6 markets · /prices/batch", "1 req"],
                  ["Buy-order pull · 50 items · /bids/batch", "1 req"],
                  ["Sales lookup · AWP Asiimov · /v1/sales", "1 req"],
                  ["Price history · 365d · /prices/history", "1 req"],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: "var(--surface)",
                                             padding: "12px 16px",
                                             display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span className="t-code" style={{ fontSize: 12 }}>{label}</span>
                    <span style={{ font: "700 12px var(--font-mono)",
                                    color: "var(--brand)", flexShrink: 0 }}>{val}</span>
                  </div>
                ))}
                <div style={{ background: "var(--bg)", padding: "12px 16px",
                              display: "flex", justifyContent: "space-between" }}>
                  <span style={{ font: "700 13px var(--font-mono)", color: "var(--fg)" }}>
                    USED MONTH-TO-DATE
                  </span>
                  <span style={{ font: "700 13px var(--font-mono)", color: "var(--fg)" }}>
                    142,300 / 500,000
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Feature matrix */}
      <section style={{ padding: "80px 0", borderTop: "2px solid var(--line)" }}>
        <Container>
          <Eyebrow>// FEATURE MATRIX</Eyebrow>
          <h2 style={{
            fontFamily: "var(--font-sans)", fontWeight: 900,
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)", lineHeight: 1,
            letterSpacing: "-0.03em", margin: "0 0 32px",
          }}>
            EVERYTHING <span className="t-gradient">SIDE BY SIDE</span>.
          </h2>
          <FeatureMatrix />
        </Container>
      </section>

      {/* FAQ */}
      <section style={{ padding: "80px 0", borderTop: "2px solid var(--line)",
                         background: "var(--surface)" }}>
        <Container>
          <Eyebrow>// FAQ</Eyebrow>
          <h2 style={{
            fontFamily: "var(--font-sans)", fontWeight: 900,
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)", lineHeight: 1,
            letterSpacing: "-0.03em", margin: "0 0 32px",
          }}>
            FREQUENTLY <span className="t-gradient">ASKED</span>.
          </h2>
          <FAQ />
        </Container>
      </section>

      <style>{`
        @media (max-width: 1200px) {
          .plans-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .plans-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1000px) {
          .hiw-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
};

Object.assign(window, { PricingScreen });
