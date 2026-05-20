# CS2Cap Design System

> Visual + interaction language for **[cs2cap.com](https://cs2cap.com)** — a unified REST API for Counter-Strike 2 skin market data across 39+ marketplaces (Buff163, Youpin, CSFloat, Skinport, Steam, etc.).

This is a working design system: tokens, type, components, and a full UI-kit recreation of the site. It is the source-of-truth for both refreshing the live site and producing any future marketing/product surface in-brand.

---

## What CS2Cap is

**Audience:** developers building trading bots, analytics dashboards, and price-comparison tools for the CS2 skin economy. Secondary audience: serious traders who want unified market data.

**Core product:** a free + paid REST API delivering live prices, buy orders, recent sales, candlestick charts, technical indicators, Doppler-phase pricing, and arbitrage signals. There's also a thin web app on top (search, item pages, inventory valuation, account/dashboard, alerts, watchlist).

**Plan tiers** (shipped as logo lockups in `assets/`):
- **STARTER** — green wordmark
- **PRO** — blue wordmark
- **QUANT** — yellow wordmark

**Tech stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Radix UI · TanStack Query · PostHog · Vercel.

---

## Sources

The system was rebuilt from these inputs. Reader does not need access, but they're noted for re-derivation:

- **Codebase:** [github.com/dadscap/cs2cap](https://github.com/dadscap/cs2cap) — the production Next.js app. Explore [`src/app/globals.css`](https://github.com/dadscap/cs2cap/blob/main/src/app/globals.css) for tokens and `src/components/` for the canonical implementations of Navbar, HeroSection, FeaturesGrid, PricingPlans, etc. For deeper work, read those files directly — they're the truth.
- **Uploaded brand assets:** logos (`logo-512.png`, `logo-stroked-512.png`) and the three tier badges. These are not in the codebase, only as separate uploads.
- **User brief:** the site is fine performance-wise but the design feels small, the navigation is muddled, the CTAs are weak, and there's no dedicated pricing page. The redesign in `ui_kits/website/` addresses these explicitly — bigger components, streamlined navbar, account dropdown that survives mobile, dedicated pricing page, less text and more visuals.

---

## Index — what's in this folder

```
README.md                          ← you are here (foundations + content + visuals + iconography)
SKILL.md                           ← portable skill manifest for use with Claude Code
colors_and_type.css                ← every CSS var + utility class (drop in and go)

assets/                            ← logos, tier badges, favicon, market icons
  logo.svg                          (primary mark — blue trending-arrow)
  logo-512.png                      (filled variant)
  logo-stroked-512.png              (full lockup with circle + bar chart)
  pro-tier.png / quant-tier.png / starter-tier.png
  favicon.ico
  steam.svg

data/                              ← real product data, kept verbatim
  tiers.json                        (the 4 real plans: FREE / STARTER / PRO / QUANT
                                     with monthly_price_cents, rate limits, quotas,
                                     allowed endpoints, feature flags, Stripe + crypto rails)
  providers.json                    (all 38 marketplaces — key, logo URL, market_type,
                                     fees, capability flags, health/coverage stats)

fonts/                             ← Google Fonts — see "Type" section below

preview/                           ← design-system cards (registered, shown in the DS tab)

ui_kits/website/                   ← high-fidelity recreation of the site
  README.md                         (kit-level guide + screen index)
  index.html                        (interactive click-through prototype)
  components/                       (Navbar with TOOLS dropdown, LiveTicker,
                                     Footer, Icons, Primitives)
  screens/                          (Home, Pricing, Item, Dashboard)
```

There are **no slides** in this system — the brief didn't ask for them and no deck templates were attached. If you need decks later, derive title/section layouts from `t-display-*` and `.bg-grid` and reuse `.brutalist-hover` cards.

---

## CONTENT FUNDAMENTALS

CS2Cap writes like a **trading terminal**, not a marketing site. Think Bloomberg crossed with a brutalist zine. Tone is **dry, technical, builder-to-builder.** No exclamation marks. No emoji.

### Voice rules
- **Second person ("you"), occasionally first person plural ("we pull from…").** Never "I". Audience is developers, so address them directly.
- **Imperative for CTAs:** `EXPLORE THE API`, `VIEW DOCS`, `SIGN IN TO SUBSCRIBE`, `SEE ENDPOINTS`. All caps, JetBrains Mono, wide letter-spacing.
- **Declarative for facts:** `39 MARKETPLACES.` — full stop, often with a period rendered as the brand-blue accent (`<span class="text-primary">.</span>`). The period IS punctuation.
- **Slash-comment eyebrows:** Section pre-titles read like code comments — `// HOW IT WORKS`, `// WHAT YOU GET`, `// WHERE WE PULL FROM`, `// YOUR EDGE`, `// EXPLORE THE API`. Always primary-blue, mono, 12px, wide tracking.
- **Two-line displays** are the signature: a black 900-weight line in foreground colour, line break, second line in the cyan→blue gradient. Example: `CS2 SKIN / MARKET / API.` or `EVERY TOOL / YOU NEED`. The gradient line carries the brand emphasis.

### Casing
- **DISPLAY HEADINGS** — `ALL CAPS`, very tight tracking (`letter-spacing: -0.035em`), 800–900 weight Inter.
- **LABELS / NAV / BUTTONS / TAGS** — `ALL CAPS`, wide tracking (`0.12em–0.2em`), JetBrains Mono.
- **Body copy** — sentence case, JetBrains Mono at 13–14px. Yes, mono for body — it's deliberate, part of the terminal feel. Long-form (privacy/terms) drops back to Inter.
- **Numbers** — always tabular-nums when in tables/stats. Prices use 2 decimals (`$1,299.50`). Compact for large counts (`9.2K`, `365+`).

### Length
- Short sentences. Often fragments. `One free REST API for real-time CS2 skin prices, buy orders, sales history, items, and analytics across 39+ marketplaces. Built for developers, trading tools, and data teams.` — that's the whole hero subtitle.
- Feature cards: title (3 words mono caps) + a single 12-word descriptive sentence.
- Pricing rows: feature is 3–6 words, mono.

### Vocabulary (canonical phrasing)
- **buy orders** (lower-case), **recent sales**, **candlestick charts**, **Doppler phases** (capitalize Doppler), **arbitrage signals**, **technical indicators**, **historical data**, **365+ days of history**.
- **marketplaces**, not "exchanges" or "stores". `39 MARKETPLACES.` is a signature stat.
- Source markets are named with original casing: `Buff163`, `Youpin`, `CSFloat`, `Skinport`, `Steam`, `BitSkins`, `DMarket`.
- Plan tier names: `STARTER`, `PRO`, `QUANT` — always all-caps in UI.
- Avoid: "amazing", "powerful", "best-in-class", any superlatives, any emoji, any exclamation marks.

### Sample copy (steal these)
- Hero status pill: `39 MARKETS · LIVE` (success-green dot, wide tracking)
- Hero secondary pill: `FREE TIER — NO CARD`
- Feature card tags: `LIVE`, `DATA`, `CHARTS`, `365D+`, `TA`, `ANALYSIS`
- Footer kicker: `ALL SYSTEMS OPERATIONAL` (success dot, wide tracking)
- Footer attribution: `© 2026 CS2CAP. ALL RIGHTS RESERVED.`
- Pricing button: `SIGN IN TO SUBSCRIBE` (or `… (3 MONTHS)` when quarterly active)

---

## VISUAL FOUNDATIONS

### Colors

| Token | HSL | Use |
|---|---|---|
| `--background`        | `220 20% 4%`  | App background — near-black with cool tint |
| `--card`              | `220 18% 7%`  | Card / panel surface |
| `--secondary`         | `220 15% 12%` | Hover surface, segmented controls |
| `--muted`             | `220 15% 10%` | Input bg, deep surfaces |
| `--foreground`        | `210 20% 90%` | Body text |
| `--muted-foreground`  | `215 12% 50%` | Captions, labels |
| `--border`            | `217 40% 20%` | Every 2px border, every 1px hairline grid |
| `--primary`           | `217 90% 55%` | THE brand blue — CTAs, links, accents |
| `--accent`            | `190 95% 50%` | Cyan — only in gradient pair w/ primary |
| `--success`           | `145 70% 45%` | Live dots, "operational", positive %  |
| `--warning`           | `40 90% 55%`  | Warnings, traffic-light dots |
| `--destructive`       | `0 70% 50%`   | Destructive actions, "LOG OUT" |
| `--chart-2`           | `200 80% 55%` | Buy Orders charts |
| `--chart-4`           | `145 70% 45%` | Recent Sales charts |

**Color rules of thumb**
- Default to **monochrome navy + one shot of primary blue per region**. Cyan only appears inside the gradient.
- The brand gradient is **`linear-gradient(135deg, primary, accent)`** — apply it to text via `background-clip: text` (see `.t-gradient`), never to backgrounds.
- Success/warning/destructive are functional indicators, not decoration.

### Type

- **Display / body:** Inter (400/500/600/700/800/**900**). 900 black is used liberally on display headings.
- **Mono / labels / tags / body-on-marketing:** JetBrains Mono (400/500/600/700).
- Loaded from Google Fonts via `@import` in `colors_and_type.css`. **No local TTFs are needed.** If you want offline copies, download from [Google Fonts](https://fonts.google.com/specimen/Inter) and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono); a `fonts/` folder is set aside but empty.
- Numbers prefer `font-variant-numeric: tabular-nums`.

**Type scale lives in `colors_and_type.css`:** `.t-display-1/2/3`, `.t-h1/2/3`, `.t-eyebrow`, `.t-label-xs/sm`, `.t-tag`, `.t-p`, `.t-p-mono`, `.t-small`, `.t-code`, `.t-num-lg/md`, `.t-gradient`.

### Spacing

- **Container:** `max-width: 1400px`, `padding-inline: 2rem`.
- **Section padding-block:** `96px` (24 in Tailwind) — the dominant rhythm. `64px` on smaller sections.
- **Card padding:** `32px` for marketing cards, `20px × 16px` for feature tiles, `16px × 12px` for table rows.
- **Inline gap:** `12px` between siblings is the default; `8px` for tight clusters.
- **The 1px gap grid:** Grids use `gap: 1px` over a `background: var(--border)` parent and `background: var(--card)` on children. This produces the signature hairline grid (see `.hairline-grid` in CSS). Never use light borders around grid cells — always do this trick.

### Borders

- **Standard line weight: 2px.** That's the brand. `border-brutal` (border + border-color), `border-brutal-brand` (primary). Inputs use 1px occasionally; everything chunkier uses 2.
- **Radius: 0.** Nothing is rounded. `--radius` is `0px`. This is the most opinionated tenet — no rounded corners anywhere except (a) tiny dots (`rounded-full` on a 2×2 LED), (b) circular avatars when an image is supplied.

### Backgrounds

- **Default background:** flat near-black (`--background`).
- **Sectional accent:** `.bg-grid` — a 40px grid of `border @ 30% opacity` lines. Used on hero, "how it works", features. Adds the "trading-screen" feel without being noisy.
- **No gradients on surfaces.** Gradients are reserved for text (the primary→accent gradient) and the occasional ambient blur behind a hero image.
- **No imagery as fill.** The only photographic asset is the hero "market card" PNG (we don't have it copied here — leaving a placeholder slot in the UI kit). Otherwise: solid surfaces, grid texture, mono labels.

### Animation

- **Easing:** `ease-out` on entry, `ease-in-out` on loops, `ease` on micro-interactions.
- **Durations:** **50ms** for hover transforms (extremely snappy — feels mechanical), **0.6s** for fade-in-up entries, **0.35s** for small fades, **30s** for the ticker loop, **2s** for the pulse-glow live indicators, **6s** for the hero image float.
- **No bounces. No springs.** The brand is a trading terminal — animations should feel digital, decisive. Linear or cubic-bezier-ease only.
- **Stagger entry delays in 0.1s steps** (`0.1s`, `0.2s`, `0.3s`, `0.4s`) on hero elements.

### Hover states

- **`.brutalist-hover`** is the canonical pattern: `translate(-2px, -2px)` + `box-shadow: 4px 4px 0 var(--primary)` over 50ms. No background change. The element "pops off the page" toward the upper-left, leaving a hard blue shadow.
- **Text links:** colour shifts from `--foreground` (or `--muted-foreground`) → `--primary`. No underline.
- **Cards in grids:** subtle background tint (`hover:bg-secondary/50`) — no transform.
- **Icon-only buttons / avatar:** border colour shifts to `--primary` over `transition-colors`.

### Press / active states

- **No shrink-down on press.** The press is implied by the hover translate snapping back. Buttons don't have a separate `:active`.
- **Focus rings:** `2px solid var(--ring)` with `2px offset`. `--ring === --primary`.

### Shadows

- **No soft shadows.** Brutalist: every shadow is a hard, sharp, offset solid color.
- `--shadow-brutal: 4px 4px 0 hsl(var(--primary))` — the only standard shadow.
- The `.glow-blue` and `.glow-text` utilities are exceptions for hero ambience (large blurred halos). Use sparingly.

### Transparency & blur

- **Backdrop blur** appears in exactly one place: the fixed navbar (`bg-background/90 backdrop-blur-sm`) so content scrolls under it cleanly.
- **Translucent overlays:** `card/80`, `secondary/50` for hover tints. `primary/10–30` for selection / focus rings.
- Avoid heavy frosted glass elsewhere — it conflicts with the terminal aesthetic.

### Layout rules

- **Fixed navbar** at the top, 56px (`h-14`), full-bleed, bordered bottom 2px.
- **Optional LiveTicker** sits directly under the navbar — full-bleed, 2px borders top/bottom, scrolling mono content.
- **Container** rule applies everywhere inside `<main>`; sections themselves are full-bleed (so the grid background and 2px section dividers go edge-to-edge).
- **Section dividers** are always 2px borders, not whitespace alone.

### Cards

- 2px border or hairline-grid background. Never rounded. Padding scales by density.
- Header pattern: small mono eyebrow → black display heading (with gradient on second line) → mono description.
- "Trader-terminal cards" (code/data blocks): mono header with traffic-light dots (red/yellow/green at 60% opacity), then mono content.

### Iconography vibe

- **Lucide React** at 1.5 stroke-width, 14px–24px. Cool, geometric, line-only. See ICONOGRAPHY below.

---

## ICONOGRAPHY

CS2Cap uses **[lucide-react](https://lucide.dev)** (v1.8 in the codebase). Every UI icon is a Lucide glyph, **stroke-width 1.5**, sized between 14 and 24px, coloured `--primary` for emphasis or `--foreground` for neutral. Never filled. Never decorative beyond purpose.

**Approach**
- One icon system. No icon-font, no emoji, no unicode pictograms.
- Icons sit beside mono labels — `<Icon class="h-4 w-4 text-primary" /> LIVE`. The icon is small, the label carries weight.
- Brand mark (`logo.svg` / `logo-512.png` / `logo-stroked-512.png`) is the only non-line illustration in the system, and is treated as type — placed beside the wordmark `CS2Cap` with the `Cap` in the brand gradient.

**Canonical icons by use case** (all Lucide)
- Nav: `Menu`, `X`, `Search`, `LayoutDashboard`, `Eye`, `Bell`, `User`, `Key`, `BarChart3`, `CreditCard`, `Settings`, `LogOut`
- Hero / features: `Activity`, `BarChart3`, `TrendingUp`, `Search`, `Layers`, `LineChart`, `Zap`, `GitCompare`, `Globe`, `Code2`, `ArrowRight`, `ExternalLink`
- Status: `Check` (pricing rows), 2×2px coloured dots (live indicators — these are not icons, they're styled `<div>`s)

**In this design system**
- The HTML UI kit loads Lucide from the CDN: `<script src="https://unpkg.com/lucide@latest"></script>` and renders icons via `data-lucide="zap"` attributes. Output matches the React app exactly.
- Social icons (X, Discord, YouTube, GitHub) are inline SVGs because they're brand marks, not generic UI icons. Copies live in `ui_kits/website/components/Footer.jsx`.
- Steam logo (`assets/steam.svg`) is provided for marketplace badges. Other marketplace logos are not bundled — the live app fetches them by `provider.logo_url`. In mocks, use a 32×32 mono square as a logo placeholder.

**Emoji?** No. Anywhere. This is a developer/trader product — emoji read as childish in this context.

**Unicode glyphs?** Only the vertical bar `│` used as a separator inside the LiveTicker between items, and `·` used as a separator inside small status pills. Both rendered in mono.

---

## Font substitution flag

Inter and JetBrains Mono are loaded from **Google Fonts** — these match the production site exactly. No substitution. The `fonts/` directory is reserved if you want to drop in `.woff2` self-hosted copies later (recommended for offline / privacy-sensitive deployments).

---

## Working with this system

- **For one-off mocks / slides / prototypes:** import `colors_and_type.css` and use the utility classes (`t-display-2`, `t-eyebrow`, `brutalist-hover`, `border-brutal`, `bg-grid`, `hairline-grid`, `t-gradient`). The cards in `preview/` show every primitive.
- **For new product surfaces:** open `ui_kits/website/index.html` to see how components compose, then lift them. Each component file is plain JSX with no build step.
- **For going deeper:** read the original Next.js source at [github.com/dadscap/cs2cap](https://github.com/dadscap/cs2cap) — that codebase has the entire data layer, OpenAPI spec, and SEO machinery that this design system intentionally leaves out.

---

## Caveats

1. **Marketplace logos are loaded from the live CDN** (`https://cdn.cs2c.app/images/providers/*.png`). They render correctly in any real browser, but Anthropic's internal screenshot tool can't capture cross-origin images, so card previews here may show broken icons that are perfectly fine in production.
2. **No PostHog work was done** — the brief mentioned "less overwhelming PostHog config (we don't use surveys)" but that's runtime config, not a design concern. Happy to draft a config diff separately.
3. **Hero "market card" PNG** referenced in the live `HeroSection` isn't tracked in the repo, so the kit builds its own terminal-style data card instead. In-brand experiment, can be swapped.
4. **No real Lucide library** — icons are inline SVG copies of the Lucide shapes (matching 1.5 stroke). For pixel-perfect parity, swap `Icons.jsx` for the actual `lucide-react` import in production.
5. **Quarterly billing is mentioned but not toggled.** The Stripe rail only discounts STARTER quarterly; NowPayments discounts every paid plan 16%. A toggle would be misleading without dual rails, so it's a checkout-time decision instead.
6. **Mobile breakpoints are approximate.** Verify on the real site before shipping.
7. **No slides.** The brief didn't ask for a deck template and none was attached.


