# CS2Cap Website — UI Kit

A high-fidelity, interactive recreation of the cs2cap.com web app. Click around `index.html` to navigate between screens; the prototype uses fake data but every component (navbar, ticker, pricing cards, item detail, account dropdown) is built from the canonical token system in `../../colors_and_type.css` and mirrors the production code at [`github.com/dadscap/cs2cap`](https://github.com/dadscap/cs2cap).

## What's covered

This UI kit **addresses the redesign brief directly** (see project README) — not a pixel-for-pixel copy of the current live site, but a faithful brutalist recreation that explicitly fixes the navigation, CTA, pricing, and component-size complaints.

### Screens
| Screen | Source | Notes |
|---|---|---|
| **Home** (`screens/Home.jsx`) | `src/app/(public)/page.tsx` + `HeroSection.tsx` | Hero, Top-3 feature spotlight (BUFF163 / Youpin · Doppler phases · multi-year history), how-it-works terminal panel, marketplaces grid, footer. |
| **Pricing** (`screens/Pricing.jsx`) | NEW — no dedicated page exists in the codebase today | Full plan comparison, FAQ, "what's a request?" panel, in-depth feature matrix. This is the new page the brief asks for. |
| **Item detail** (`screens/Item.jsx`) | `src/app/(public)/item/.../page.tsx` (re-imagined larger) | Bigger item hero, price-history chart, multi-market ask/bid panels, recent sales table. Components 1.4–1.7× the original sizes. |
| **Dashboard** (`screens/Dashboard.jsx`) | `src/app/(auth)/dashboard/page.tsx` | API key, usage chart, recent calls, watchlist tile. Always-visible account dropdown in the navbar. |

### Components
All factored into `components/` and shared across screens:
- `Navbar.jsx` — streamlined: logo · 4 primary links · search · **always-visible account button** (mobile inclusive). The pain point about buttons getting hidden on mobile is fixed by keeping the avatar in the top-right at every breakpoint and moving secondary nav into the avatar dropdown when narrow.
- `Footer.jsx` — 4-column links, social row, "ALL SYSTEMS OPERATIONAL" status.
- `LiveTicker.jsx` — 30s scrolling rail of recent quotes.
- `Hero.jsx` — bigger headline (clamp up to 9rem), bigger CTAs (padding 16 × 32), bigger stat strip.
- `Top3Features.jsx` — visual-first spotlight on the three SEO targets the brief lists.
- `MarketplacesSection.jsx` — 39-marketplace hairline grid with capability badges.
- `PricingPlans.jsx` — 3-up monthly/quarterly with PRO highlight.
- `Button.jsx`, `Tag.jsx`, `Eyebrow.jsx` — primitives.
- `Icons.jsx` — inline SVG icons mirroring the Lucide set the codebase uses.

## How to view

Open `index.html` in a browser. Use the top-nav to jump between screens. The current screen is reflected in the URL hash so refreshes preserve position.

## Brief-driven changes from the live site

1. **Dedicated `/pricing` page** — was a fragment (`/api-info#pricing`); now a full page with plan-vs-plan grid, FAQ, and clear feature matrix.
2. **Streamlined navbar** — 4 primary links (Search · Pricing · API · Docs) instead of 6. Inventory and Dashboard are reachable via the account dropdown.
3. **Always-visible account dropdown** — at every breakpoint. The hamburger only collapses the *primary nav*, never the account access.
4. **Bigger components** — hero typography clamp(3.5rem, 8vw, 9rem); CTA padding 16 × 32; pricing card padding 32; item-page price tiles 64px tall; table row height 56px (was 40).
5. **More visual, less text** — `Top3Features` section is image-first with a single tagline per feature instead of the existing 8-card grid copy block.
6. **Bigger body text** — root font-size 16px → 17px; mono labels bumped one step (10 → 12, 11 → 13).
