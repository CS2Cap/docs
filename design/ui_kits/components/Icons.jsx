// Inline SVG icons matching Lucide stroke-width 1.5 — used app-wide.
// Each icon is a stateless functional component that accepts `size`, `stroke`, `className`.
const Icon = ({ children, size = 16, stroke = 1.5, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
);

const ArrowRight = (p) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7" /></Icon>;
const ArrowUpRight = (p) => <Icon {...p}><path d="M7 17L17 7M7 7h10v10" /></Icon>;
const ExternalLink = (p) => <Icon {...p}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><path d="M15 3h6v6M10 14L21 3" /></Icon>;
const Search = (p) => <Icon {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Icon>;
const Menu = (p) => <Icon {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Icon>;
const X = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12" /></Icon>;
const Check = (p) => <Icon {...p}><path d="M20 6L9 17l-5-5" /></Icon>;
const Zap = (p) => <Icon {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Icon>;
const Layers = (p) => <Icon {...p}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></Icon>;
const Activity = (p) => <Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Icon>;
const TrendingUp = (p) => <Icon {...p}><path d="M22 7l-9 9-4-4-7 7M16 7h6v6" /></Icon>;
const BarChart3 = (p) => <Icon {...p}><path d="M3 3v18h18" /><path d="M7 16V8M12 16v-5M17 16v-9" /></Icon>;
const LineChart = (p) => <Icon {...p}><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 6-6" /></Icon>;
const GitCompare = (p) => <Icon {...p}><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 012 2v7M11 18H8a2 2 0 01-2-2V9" /></Icon>;
const Globe = (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20a15.3 15.3 0 010-20z" /></Icon>;
const Code2 = (p) => <Icon {...p}><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></Icon>;
const LayoutDashboard = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></Icon>;
const Eye = (p) => <Icon {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Icon>;
const Bell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0" /></Icon>;
const User = (p) => <Icon {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>;
const Key = (p) => <Icon {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" /></Icon>;
const CreditCard = (p) => <Icon {...p}><rect x="2" y="5" width="20" height="14" /><line x1="2" y1="10" x2="22" y2="10" /></Icon>;
const Settings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></Icon>;
const LogOut = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></Icon>;
const ChevronDown = (p) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
const Copy = (p) => <Icon {...p}><rect x="9" y="9" width="13" height="13" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></Icon>;
const Plus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
const Minus = (p) => <Icon {...p}><path d="M5 12h14" /></Icon>;

// Brand glyph icons for socials — kept inline as filled paths
const XSocial = ({ size = 18, className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const DiscordSocial = ({ size = 18, className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className}>
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);
const GithubSocial = ({ size = 18, className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

Object.assign(window, {
  ArrowRight, ArrowUpRight, ExternalLink, Search, Menu, X, Check, Zap, Layers, Activity,
  TrendingUp, BarChart3, LineChart, GitCompare, Globe, Code2, LayoutDashboard, Eye, Bell,
  User, Key, CreditCard, Settings, LogOut, ChevronDown, Copy, Plus, Minus,
  XSocial, DiscordSocial, GithubSocial,
});
