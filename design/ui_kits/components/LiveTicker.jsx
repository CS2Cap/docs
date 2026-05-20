// LiveTicker — 30s scrolling rail under the navbar.
const TICKER_ITEMS = [
  { name: "AWP | Asiimov (FT)",          price: "$74.21",   provider: "BUFF163",  trend: "+1.2%" },
  { name: "AK-47 | Redline (MW)",        price: "$12.99",   provider: "CSFLOAT",  trend: "−0.4%" },
  { name: "★ Karambit | Doppler P2",     price: "$1,820.00", provider: "YOUPIN",   trend: "+3.8%" },
  { name: "M4A4 | Howl (FT)",            price: "$6,540.00", provider: "BUFF163",  trend: "+0.6%" },
  { name: "Glock-18 | Fade (FN)",        price: "$1,099.00", provider: "SKINPORT", trend: "−1.1%" },
  { name: "USP-S | Kill Confirmed (MW)", price: "$162.40",  provider: "BUFF163",  trend: "+0.9%" },
  { name: "Desert Eagle | Printstream",  price: "$245.00",  provider: "CSFLOAT",  trend: "+2.1%" },
  { name: "★ Butterfly | Tiger Tooth",   price: "$2,899.00", provider: "YOUPIN",   trend: "+0.3%" },
];

const TickerRow = ({ items, hidden = false }) => (
  <React.Fragment>
    {items.map((item, i) => (
      <React.Fragment key={i}>
        <a aria-hidden={hidden} tabIndex={hidden ? -1 : 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "0 22px", cursor: "pointer", flexShrink: 0,
            transition: "background 80ms ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "hsl(220 15% 12% / .8)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ width: 28, height: 28, background: "var(--surface-2)",
                         display: "inline-block", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ font: "500 13px var(--font-mono)", color: "var(--fg-muted)" }}>{item.name}</span>
          <span style={{ font: "700 13px var(--font-mono)", color: "var(--fg)" }}>{item.price}</span>
          <span style={{ font: "700 12px var(--font-mono)",
                         color: item.trend.startsWith("+") ? "var(--success)" : "hsl(0 70% 60%)" }}>
            {item.trend}
          </span>
          <span style={{ font: "700 12px var(--font-mono)", color: "var(--brand)" }}>{item.provider}</span>
        </a>
        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center",
                                          color: "var(--line)", font: "400 14px var(--font-mono)" }}>│</span>
      </React.Fragment>
    ))}
  </React.Fragment>
);

const LiveTicker = () => (
  <div style={{
    borderTop: "2px solid var(--line)",
    borderBottom: "2px solid var(--line)",
    background: "hsl(220 15% 12% / .5)",
    overflow: "hidden",
  }}>
    <div style={{
      display: "inline-flex", width: "max-content", whiteSpace: "nowrap",
      padding: "8px 0", animation: "ticker 35s linear infinite",
      willChange: "transform",
    }}>
      <div style={{ display: "flex", flexShrink: 0 }}><TickerRow items={TICKER_ITEMS} /></div>
      <div style={{ display: "flex", flexShrink: 0 }}><TickerRow items={TICKER_ITEMS} hidden /></div>
    </div>
  </div>
);

Object.assign(window, { LiveTicker });
