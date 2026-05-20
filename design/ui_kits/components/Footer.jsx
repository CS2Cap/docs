// Site footer — 4-column links, social row, all-systems-operational kicker.

const Footer = ({ onNavigate }) => {
  const link = (label, to, external = false) => (
    <a key={label}
      onClick={external ? undefined : () => onNavigate(to)}
      href={external ? to : undefined}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      style={{
        font: "400 13px var(--font-mono)", color: "var(--fg)", textDecoration: "none",
        cursor: "pointer", transition: "color 80ms ease",
        padding: "2px 0", display: "inline-block",
      }}
      onMouseOver={(e) => (e.currentTarget.style.color = "var(--brand)")}
      onMouseOut={(e) => (e.currentTarget.style.color = "var(--fg)")}
    >{label}</a>
  );

  const col = (heading, links) => (
    <div>
      <div className="t-label-xs" style={{ marginBottom: 16 }}>{heading}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{links}</div>
    </div>
  );

  return (
    <footer style={{ borderTop: "2px solid var(--line)", padding: "72px 0 24px" }}>
      <Container>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 2fr) repeat(3, 1fr)",
          gap: 48,
          marginBottom: 56,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <img src="../../assets/logo.svg" alt="" width={32} height={32} />
              <span style={{ font: "700 20px var(--font-mono)", letterSpacing: "-0.02em" }}>
                CS2<span className="t-gradient">Cap</span>
              </span>
            </div>
            <div className="t-p-mono" style={{ maxWidth: 280 }}>
              Built for CS2 traders and developers. One free REST API for every marketplace.
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 22, color: "var(--fg-muted)" }}>
              <a href="https://x.com/dadscap" target="_blank" rel="noopener noreferrer"
                 style={{ color: "inherit" }}
                 onMouseOver={(e) => (e.currentTarget.style.color = "var(--brand)")}
                 onMouseOut={(e) => (e.currentTarget.style.color = "var(--fg-muted)")}>
                <XSocial size={20} />
              </a>
              <a href="https://discord.gg/MGxFtyV8xM" target="_blank" rel="noopener noreferrer"
                 style={{ color: "inherit" }}
                 onMouseOver={(e) => (e.currentTarget.style.color = "var(--brand)")}
                 onMouseOut={(e) => (e.currentTarget.style.color = "var(--fg-muted)")}>
                <DiscordSocial size={22} />
              </a>
              <a href="https://github.com/CS2Cap" target="_blank" rel="noopener noreferrer"
                 style={{ color: "inherit" }}
                 onMouseOver={(e) => (e.currentTarget.style.color = "var(--brand)")}
                 onMouseOut={(e) => (e.currentTarget.style.color = "var(--fg-muted)")}>
                <GithubSocial size={20} />
              </a>
            </div>
          </div>
          {col("PLATFORM", [
            link("Search", "search"),
            link("Pricing", "pricing"),
            link("Inventory Value", "inventory"),
            link("Dashboard", "dashboard"),
          ])}
          {col("DEVELOPERS", [
            link("API Reference", "api"),
            link("Docs", "https://docs.cs2cap.com/", true),
            link("GitHub", "https://github.com/CS2Cap", true),
            link("Status", "https://status.cs2c.app/", true),
          ])}
          {col("LEGAL", [
            link("Terms", "terms"),
            link("Privacy", "privacy"),
            link("Contact", "contact"),
          ])}
        </div>
        <div style={{
          paddingTop: 24, borderTop: "2px solid var(--line)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
        }}>
          <span className="t-label-xs">© 2026 CS2CAP. ALL RIGHTS RESERVED.</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <LiveDot color="var(--success)" />
            <span className="t-label-xs" style={{ color: "var(--success)" }}>ALL SYSTEMS OPERATIONAL</span>
          </span>
        </div>
      </Container>
    </footer>
  );
};

Object.assign(window, { Footer });
