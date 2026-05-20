// Shared brutalist primitives — buttons, tags, eyebrows, container.

const Eyebrow = ({ children, color = "var(--brand)" }) => (
  <div className="t-eyebrow" style={{ color, marginBottom: 12 }}>
    {children}
  </div>
);

const Tag = ({ children, color = "var(--brand)" }) => (
  <span
    style={{
      display: "inline-block",
      border: `1px solid ${color}80`,
      color,
      padding: "3px 8px",
      font: "700 10px var(--font-mono)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </span>
);

// Big brutalist CTA button — addresses the brief's "CTAs feel weak" complaint
// with chunkier padding (16 × 32) and a stronger hover translate (-3,-3).
const BigButton = ({ children, variant = "primary", icon, onClick, href, ariaLabel }) => {
  const [hover, setHover] = React.useState(false);
  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 22px",
    font: "700 13px var(--font-mono)",
    letterSpacing: "0.12em",
    textDecoration: "none",
    cursor: "pointer",
    border: "2px solid",
    transition: "transform 60ms ease, box-shadow 60ms ease",
    transform: hover ? "translate(-2px, -2px)" : "translate(0, 0)",
  };
  const variants = {
    primary: {
      background: "var(--brand)",
      borderColor: "var(--brand)",
      color: "hsl(220 20% 4%)",
      boxShadow: hover ? "4px 4px 0 hsl(190 95% 50%)" : "none",
    },
    secondary: {
      background: "transparent",
      borderColor: "var(--line)",
      color: "var(--fg)",
      boxShadow: hover ? "4px 4px 0 var(--brand)" : "none",
    },
    ghost: {
      background: "transparent",
      borderColor: "var(--brand)",
      color: "var(--brand)",
      boxShadow: hover ? "4px 4px 0 var(--brand)" : "none",
    },
  };
  const Component = href ? "a" : "button";
  return (
    <Component
      onClick={onClick}
      href={href}
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{ ...baseStyle, ...variants[variant] }}
    >
      {children}
      {icon}
    </Component>
  );
};

// Small button used inside table rows, secondary links, etc.
const SmallButton = ({ children, variant = "secondary", icon, onClick, href, active = false }) => {
  const [hover, setHover] = React.useState(false);
  const baseStyle = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "8px 14px",
    font: "700 12px var(--font-mono)",
    letterSpacing: "0.12em",
    textDecoration: "none", cursor: "pointer",
    border: "2px solid",
    transition: "border-color 80ms ease, color 80ms ease, background 80ms ease",
  };
  const styles = variant === "primary"
    ? { background: "var(--brand)", borderColor: "var(--brand)", color: "hsl(220 20% 4%)" }
    : active
    ? { background: "transparent", borderColor: "var(--brand)", color: "var(--brand)" }
    : { background: "transparent", borderColor: hover ? "var(--brand)" : "var(--line)",
        color: hover ? "var(--brand)" : "var(--fg)" };
  const Component = href ? "a" : "button";
  return (
    <Component
      onClick={onClick} href={href}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...baseStyle, ...styles }}
    >
      {children}
      {icon}
    </Component>
  );
};

// Pulsing live dot for status indicators (markets-live, operational, etc).
const LiveDot = ({ color = "var(--success)", size = 8 }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-block", width: size, height: size, background: color,
      animation: "pulse-glow 2s ease-in-out infinite",
    }}
  />
);

// Outer page container — caps width at 1400px, 32px inline padding.
const Container = ({ children, style }) => (
  <div style={{ width: "100%", maxWidth: 1400, marginInline: "auto", padding: "0 32px", ...style }}>
    {children}
  </div>
);

Object.assign(window, { Eyebrow, Tag, BigButton, SmallButton, LiveDot, Container });
