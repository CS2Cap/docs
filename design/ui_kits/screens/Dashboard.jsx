// DASHBOARD — authenticated home. Shows usage, API key, recent calls.

const USAGE_DAYS = Array.from({ length: 14 }, (_, i) => ({
  day: i + 1,
  reqs: [840, 1120, 980, 1340, 1610, 1480, 2010, 1820, 2340, 2200, 2710, 2480, 2940, 3110][i],
}));

const RECENT_CALLS = [
  { ts: "09:18:42", method: "GET", path: "/v1/prices?item_id=1234",        status: 200, latency: "42ms" },
  { ts: "09:18:39", method: "GET", path: "/v1/history?item_id=1234&days=365", status: 200, latency: "118ms" },
  { ts: "09:18:35", method: "GET", path: "/v1/doppler/phases?item_id=556",  status: 200, latency: "61ms" },
  { ts: "09:18:31", method: "GET", path: "/v1/buy_orders?item_id=1234",     status: 200, latency: "84ms" },
  { ts: "09:17:58", method: "GET", path: "/v1/sales?item_id=1234&limit=20", status: 200, latency: "52ms" },
  { ts: "09:17:22", method: "GET", path: "/v1/arbitrage?min_spread=5",      status: 429, latency: "8ms" },
];

const STATUS_COLOR = (s) =>
  s < 300 ? "var(--success)" : s < 400 ? "var(--warning)" : s < 500 ? "hsl(0 70% 60%)" : "hsl(0 70% 60%)";

const DashboardScreen = ({ onNavigate }) => {
  const [keyVisible, setKeyVisible] = React.useState(false);
  const maxReqs = Math.max(...USAGE_DAYS.map(d => d.reqs));

  return (
    <main>
      <Container style={{ paddingTop: 56, paddingBottom: 96 }}>
        {/* Title + plan pill */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                       gap: 24, flexWrap: "wrap", marginBottom: 48 }}>
          <div>
            <Eyebrow>// DASHBOARD</Eyebrow>
            <h1 className="t-display-2" style={{ margin: 0 }}>
              WELCOME BACK,<br/>
              <span className="t-gradient">DADSCAP</span>.
            </h1>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <SmallButton onClick={() => onNavigate("api-keys")} icon={<Key size={14} />}>
              MANAGE KEYS
            </SmallButton>
            <SmallButton onClick={() => onNavigate("billing")}
                          variant="primary" icon={<CreditCard size={14} />}>BILLING</SmallButton>
          </div>
        </div>

        {/* 4-up stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 1, background: "var(--line)", border: "2px solid var(--line)",
                      marginBottom: 48 }} className="stat-grid">
          <StatTile label="PLAN" value="PRO" color="var(--brand)"
                    sub="Renews 2026-06-01" />
          <StatTile label="REQUESTS TODAY" value="3,110" color="var(--fg)"
                    sub="of 25,000 daily cap" />
          <StatTile label="RATE LIMIT" value="600 / min" color="var(--fg)"
                    sub="120 active right now" />
          <StatTile label="ACTIVE ALERTS" value="15" color="var(--warning)"
                    sub="3 triggered today" />
        </div>

        {/* Two-col: usage chart + API key */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr",
                      gap: 24, marginBottom: 48 }} className="dash-grid">
          {/* Usage chart */}
          <div style={{ background: "var(--surface)", border: "2px solid var(--line)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "2px solid var(--line)" }}>
              <Eyebrow color="var(--brand)">// USAGE · LAST 14 DAYS</Eyebrow>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={{ font: "900 32px var(--font-mono)", color: "var(--fg)" }}>26,940</span>
                <span className="t-code">requests · +18% vs prior</span>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180 }}>
                {USAGE_DAYS.map((d, i) => (
                  <div key={d.day} style={{ flex: 1, position: "relative", height: "100%" }}>
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: `${(d.reqs / maxReqs) * 100}%`,
                      background: i === USAGE_DAYS.length - 1
                        ? "var(--brand)"
                        : `hsl(217 90% 55% / ${0.3 + (i / USAGE_DAYS.length) * 0.5})`,
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <span className="t-code">May 02</span>
                <span className="t-code">May 15</span>
              </div>
            </div>
          </div>

          {/* API key card */}
          <div style={{ background: "var(--surface)", border: "2px solid var(--line)",
                         padding: 28 }}>
            <Eyebrow>// PRIMARY API KEY</Eyebrow>
            <div className="t-code" style={{ marginBottom: 24, fontSize: 12 }}>
              Created 2025-11-14 · Last used 2 minutes ago
            </div>
            <div style={{ background: "var(--bg)", border: "2px solid var(--line)",
                           padding: "16px 18px", display: "flex",
                           alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <code style={{ font: "500 14px var(--font-mono)", color: "var(--brand)",
                              wordBreak: "break-all", overflow: "hidden",
                              textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {keyVisible ? "cs2c_live_pk_7a91…f04b" : "cs2c_live_pk_••••••••••••••"}
              </code>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setKeyVisible(!keyVisible)} aria-label="Toggle visibility"
                  style={{ background: "transparent", border: "none", color: "var(--fg-muted)",
                            cursor: "pointer", padding: 4 }}>
                  <Eye size={16} />
                </button>
                <button aria-label="Copy"
                  style={{ background: "transparent", border: "none", color: "var(--fg-muted)",
                            cursor: "pointer", padding: 4 }}>
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div style={{ marginTop: 16 }} className="t-code">
              <span style={{ color: "var(--success)" }}>● </span>
              Active · Pro plan · Unrestricted
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <SmallButton onClick={() => onNavigate("api-keys")}>+ NEW KEY</SmallButton>
              <SmallButton onClick={() => onNavigate("api")}>VIEW DOCS</SmallButton>
            </div>
          </div>
        </div>

        {/* Recent API calls */}
        <Eyebrow>// RECENT CALLS</Eyebrow>
        <div style={{ background: "var(--surface)", border: "2px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 80px 1fr 90px 90px",
                         background: "var(--surface-2)", borderBottom: "2px solid var(--line)" }}>
            {["TIME", "METHOD", "ENDPOINT", "STATUS", "LATENCY"].map((h) => (
              <div key={h} className="t-label-xs"
                   style={{ padding: "14px 20px" }}>{h}</div>
            ))}
          </div>
          {RECENT_CALLS.map((c, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "110px 80px 1fr 90px 90px",
              height: 56, alignItems: "center",
              borderBottom: i < RECENT_CALLS.length - 1 ? "1px solid var(--line)" : "none",
            }}>
              <div className="t-code" style={{ padding: "0 20px" }}>{c.ts}</div>
              <div style={{ padding: "0 20px", font: "700 12px var(--font-mono)",
                             color: "var(--brand)", letterSpacing: "0.1em" }}>{c.method}</div>
              <div style={{ padding: "0 20px", font: "500 14px var(--font-mono)",
                             color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis",
                             whiteSpace: "nowrap" }}>{c.path}</div>
              <div style={{ padding: "0 20px" }}>
                <span style={{ font: "700 12px var(--font-mono)",
                                color: STATUS_COLOR(c.status),
                                border: `1px solid ${STATUS_COLOR(c.status)}40`,
                                padding: "3px 8px" }}>{c.status}</span>
              </div>
              <div className="t-code" style={{ padding: "0 20px",
                              color: parseInt(c.latency) > 100 ? "var(--warning)" : "var(--fg-muted)" }}>
                {c.latency}
              </div>
            </div>
          ))}
        </div>
      </Container>

      <style>{`
        @media (max-width: 1100px) {
          .stat-grid { grid-template-columns: 1fr 1fr !important; }
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
};

const StatTile = ({ label, value, sub, color = "var(--fg)" }) => (
  <div style={{ background: "var(--surface)", padding: "28px 26px", minHeight: 132 }}>
    <div className="t-label-xs">{label}</div>
    <div style={{ font: "900 36px/1 var(--font-mono)", color, marginTop: 12,
                   letterSpacing: "-0.01em" }}>{value}</div>
    <div className="t-code" style={{ marginTop: 10, fontSize: 12 }}>{sub}</div>
  </div>
);

Object.assign(window, { DashboardScreen });
