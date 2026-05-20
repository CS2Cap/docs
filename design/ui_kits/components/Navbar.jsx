// ───────────────────────────────────────────────────────────
// NAVBAR — streamlined per the redesign brief:
//   • 4 primary links (Search · Pricing · API · Docs)
//   • Search inline at every desktop breakpoint
//   • Avatar + account dropdown ALWAYS visible (even on mobile)
//   • Hamburger only collapses the primary nav, never the avatar
// ───────────────────────────────────────────────────────────

const TOOLS_ITEMS = [
  { label: "SEARCH ITEMS",     to: "search",    Icon: Search,
    desc: "Browse 30,000+ skins across every marketplace" },
  { label: "INVENTORY VALUE",  to: "inventory", Icon: BarChart3,
    desc: "Calculate your CS2 inventory worth from Steam" },
  { label: "PRICE HISTORY",    to: "history",   Icon: TrendingUp,
    desc: "Multi-year candlestick data per item" },
  { label: "ARBITRAGE SCAN",   to: "arbitrage", Icon: GitCompare,
    desc: "Cross-market price gaps in real time" },
];

const NAV_LINKS = [
  { label: "TOOLS",   tools: true },
  { label: "PRICING", to: "pricing" },
  { label: "API",     to: "api" },
  { label: "DOCS",    to: "docs", external: true, href: "https://docs.cs2cap.com/" },
];

const ACCOUNT_ITEMS = [
  { label: "Dashboard",  to: "dashboard", Icon: LayoutDashboard },
  { label: "Watchlist",  to: "watchlist", Icon: Eye },
  { label: "Alerts",     to: "alerts",    Icon: Bell },
  { divider: true },
  { label: "API Keys",   to: "api-keys",  Icon: Key },
  { label: "Billing",    to: "billing",   Icon: CreditCard },
  { label: "Usage",      to: "usage",     Icon: BarChart3 },
  { divider: true },
  { label: "Account",    to: "account",   Icon: User },
  { label: "Settings",   to: "settings",  Icon: Settings },
];

const Navbar = ({ screen, onNavigate, authed = true }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const accountRef = React.useRef(null);
  const toolsRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navTo = (to) => {
    setMobileOpen(false); setAccountOpen(false); setToolsOpen(false);
    onNavigate(to);
  };

  const isActive = (to) => screen === to;
  const isToolsActive = TOOLS_ITEMS.some((t) => isActive(t.to));

  return (
    <nav
      style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "2px solid var(--line)",
        background: "hsl(220 20% 4% / 0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <Container style={{ height: 64, display: "flex", alignItems: "center", gap: 24 }}>
        {/* Logo */}
        <a
          onClick={() => navTo("home")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}
        >
          <img src="../../assets/logo.svg" alt="" width={32} height={32} />
          <span style={{ font: "700 20px var(--font-mono)", letterSpacing: "-0.02em" }}>
            CS2<span className="t-gradient">Cap</span>
          </span>
        </a>

        {/* Primary links — hidden under 800px, replaced by hamburger */}
        <div className="nav-primary" style={{ display: "flex", gap: 4 }}>
          {NAV_LINKS.map((l) => {
            if (l.tools) {
              return (
                <div key={l.label} ref={toolsRef} style={{ position: "relative" }}>
                  <button onClick={() => setToolsOpen((v) => !v)}
                    style={{
                      ...navLinkStyle(isToolsActive || toolsOpen),
                      background: "transparent", border: "none",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}>
                    {l.label}
                    <ChevronDown size={12} style={{
                      transform: toolsOpen ? "rotate(180deg)" : "rotate(0)",
                      transition: "transform 100ms ease",
                    }} />
                  </button>
                  {toolsOpen && (
                    <div style={{
                      position: "absolute", left: 0, top: "calc(100% + 6px)",
                      width: 320, background: "var(--bg)",
                      border: "2px solid var(--line)",
                      boxShadow: "6px 6px 0 hsl(217 90% 55% / .25)",
                      zIndex: 60,
                    }}>
                      {TOOLS_ITEMS.map((item) => (
                        <a key={item.to} onClick={() => navTo(item.to)}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 14,
                            padding: "14px 16px",
                            color: isActive(item.to) ? "var(--brand)" : "var(--fg)",
                            background: isActive(item.to) ? "var(--surface-2)" : "transparent",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--line)",
                            transition: "background 80ms ease",
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = isActive(item.to) ? "var(--surface-2)" : "transparent";
                          }}
                        >
                          <item.Icon size={16} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ font: "700 12px var(--font-mono)",
                                           letterSpacing: "0.14em" }}>{item.label}</div>
                            <div className="t-code" style={{ marginTop: 4, fontSize: 11,
                                           lineHeight: 1.45, color: "var(--fg-muted)" }}>{item.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return l.external ? (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                 style={navLinkStyle(false)}>
                {l.label}
              </a>
            ) : (
              <a key={l.label} onClick={() => navTo(l.to)} style={navLinkStyle(isActive(l.to))}>
                {l.label}
              </a>
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          {/* Search — visible whenever there's room */}
          <form className="nav-search" onSubmit={(e) => { e.preventDefault(); navTo("search"); }}
                style={{ position: "relative" }}>
            <Search size={14} className="search-ico"/>
            <input placeholder="Search items…"
              style={{
                width: 220, height: 36, padding: "0 14px 0 36px",
                background: "hsl(220 15% 10% / .6)", border: "1px solid var(--line)",
                color: "var(--fg)", font: "400 13px var(--font-mono)", outline: "none",
              }} />
          </form>

          {/* Avatar — ALWAYS visible. The fix. */}
          {authed ? (
            <div ref={accountRef} style={{ position: "relative" }}>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                aria-label="Account menu"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  height: 36, padding: "0 12px 0 6px",
                  border: "2px solid var(--line)", background: "var(--surface-2)",
                  color: "var(--fg)", font: "700 12px var(--font-mono)", letterSpacing: "0.1em",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                <span style={{
                  width: 24, height: 24, background: "var(--brand)", color: "hsl(220 20% 4%)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  font: "900 11px var(--font-mono)",
                }}>DG</span>
                <span className="nav-name">DADSCAP</span>
                <ChevronDown size={12} />
              </button>
              {accountOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)",
                  width: 260, background: "var(--bg)",
                  border: "2px solid var(--line)",
                  boxShadow: "6px 6px 0 hsl(217 90% 55% / .25)",
                }}>
                  <div style={{ padding: "12px 14px", borderBottom: "2px solid var(--line)" }}>
                    <div style={{ font: "700 13px var(--font-mono)", color: "var(--fg)" }}>Dadscap</div>
                    <div className="t-code" style={{ marginTop: 2 }}>dad@cs2cap.com</div>
                    <Tag color="var(--brand)" >PRO · ACTIVE</Tag>
                  </div>
                  {ACCOUNT_ITEMS.map((item, i) =>
                    item.divider ? (
                      <div key={"d" + i} style={{ height: 2, background: "var(--line)" }} />
                    ) : (
                      <a key={item.to} onClick={() => navTo(item.to)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "11px 14px",
                          font: "500 12px var(--font-mono)", letterSpacing: "0.1em",
                          color: isActive(item.to) ? "var(--brand)" : "var(--fg)",
                          background: isActive(item.to) ? "var(--surface-2)" : "transparent",
                          textTransform: "uppercase", cursor: "pointer",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--brand)"; }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = isActive(item.to) ? "var(--surface-2)" : "transparent";
                          e.currentTarget.style.color = isActive(item.to) ? "var(--brand)" : "var(--fg)";
                        }}
                      >
                        <item.Icon size={14} />
                        {item.label}
                      </a>
                    )
                  )}
                  <div style={{ height: 2, background: "var(--line)" }} />
                  <a onClick={() => navTo("logout")}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 14px",
                      font: "700 12px var(--font-mono)", letterSpacing: "0.12em",
                      color: "hsl(0 70% 60%)", textTransform: "uppercase", cursor: "pointer",
                    }}>
                    <LogOut size={14} />
                    LOG OUT
                  </a>
                </div>
              )}
            </div>
          ) : (
            <SmallButton variant="ghost" onClick={() => navTo("login")}>SIGN IN</SmallButton>
          )}

          {/* Hamburger — toggles primary nav. Doesn't affect avatar (always visible). */}
          <button className="nav-burger" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu"
            style={{ background: "transparent", border: "none", color: "var(--fg)", cursor: "pointer", padding: 6 }}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </Container>

      {mobileOpen && (
        <div style={{ borderTop: "2px solid var(--line)", background: "var(--bg)" }}>
          <Container style={{ padding: "14px 32px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_LINKS.map((l) => {
              if (l.tools) {
                return (
                  <div key={l.label} style={{ paddingTop: 6 }}>
                    <div className="t-label-xs" style={{ padding: "8px 4px" }}>{l.label}</div>
                    {TOOLS_ITEMS.map((t) => (
                      <a key={t.to} onClick={() => navTo(t.to)}
                         style={{ display: "flex", alignItems: "center", gap: 12,
                                   padding: "10px 16px",
                                   font: "600 13px var(--font-mono)", letterSpacing: "0.12em",
                                   color: isActive(t.to) ? "var(--brand)" : "var(--fg)" }}>
                        <t.Icon size={14} />
                        {t.label}
                      </a>
                    ))}
                  </div>
                );
              }
              return (
                <a key={l.label} onClick={() => l.external ? null : navTo(l.to)}
                   href={l.external ? l.href : undefined}
                   target={l.external ? "_blank" : undefined}
                   style={{ padding: "12px 4px", font: "700 14px var(--font-mono)",
                            letterSpacing: "0.14em",
                            color: isActive(l.to) ? "var(--brand)" : "var(--fg)" }}>
                  {l.label}
                </a>
              );
            })}
          </Container>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .nav-name { display: none; }
        }
        @media (max-width: 800px) {
          .nav-primary { display: none !important; }
          .nav-search { display: none; }
        }
        @media (min-width: 801px) {
          .nav-burger { display: none; }
        }
        .search-ico { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-muted); }
      `}</style>
    </nav>
  );
};

function navLinkStyle(active) {
  return {
    padding: "8px 14px",
    font: "700 13px var(--font-mono)",
    letterSpacing: "0.14em",
    color: active ? "var(--brand)" : "hsl(210 20% 90% / 0.85)",
    textDecoration: "none",
    cursor: "pointer",
    transition: "color 80ms ease",
  };
}

Object.assign(window, { Navbar });
