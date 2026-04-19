

## Homepage API-First Positioning Pass

### Files to change

| File | Action |
|------|--------|
| `src/app/(public)/page.tsx` | Add page-level metadata; reorder sections; add compact SEO link module |
| `src/components/HeroSection.tsx` | Rewrite H1, subtitle, CTAs to be API-first |
| `src/app/(public)/api-info/page.tsx` | Add page-level metadata export |

No changes to: robots, sitemap, footer, navbar, route structure, SEO landing pages, layout system.

---

### 1. Homepage metadata — `src/app/(public)/page.tsx`

Add a `metadata` export:

```ts
export const metadata: Metadata = {
  title: "CS2 API — Real-Time Skin Market Data Across 39+ Marketplaces",
  description: "Unified REST API for CS2 and CSGO skin market data. Real-time prices, buy orders, sales history, and candlestick charts from Buff163, CSFloat, Skinport, and 35+ more marketplaces.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CS2 API — Real-Time Skin Market Data | CS2Cap",
    description: "...", // same as above
    url: "https://cs2cap.com",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CS2 API — Real-Time Skin Market Data | CS2Cap",
    description: "...",
  },
};
```

### 2. Hero rewrite — `src/components/HeroSection.tsx`

Keep the exact same layout structure, decorative elements, stats bar, and animation classes.

Changes:
- **H1**: `CS2 SKIN` / `MARKET` / `API.` (keeps the 3-line brutalist style, adds "API")
- **Subtitle**: "One REST API for real-time CS2 skin prices, buy orders, sales history, and analytics across {providerCount}+ marketplaces. Built for developers and trading tools."
- **Primary CTA**: `EXPLORE THE API` → links to `/api-info` (replaces `/dashboard` + "START TRACKING")
- **Secondary CTA**: `VIEW DOCS` → links to `https://docs.cs2cap.com/` (replaces scroll-to-features button)
- **Stats bar**: keep all 4 stats as-is (marketplaces, items tracked, live prices, days of history)
- **Status bar**: keep as-is

### 3. Homepage body reorder — `src/app/(public)/page.tsx`

Current order: LiveTicker → Hero → FeaturesGrid → MarketplacesSection → API/Developer section → Footer

New order: LiveTicker → Hero → **API/Developer section (moved up)** → FeaturesGrid → MarketplacesSection → **Compact SEO links module (new)** → Footer

The API/developer section (the curl example + bullet points) moves to directly after the hero, reinforcing the API-first message before the features grid.

Adjust the developer section heading from "// FOR DEVELOPERS" to "// HOW IT WORKS" and subtitle from "BUILD WITH CS2CAP API" to "ONE API, EVERY MARKETPLACE" — keeping the same visual structure.

### 4. Compact SEO link module — new section in `page.tsx`

A small, clean section before the footer with 7 high-value links. Structured as a single row of compact cards:

```
// EXPLORE THE API
├── CS2 API          ├── CSGO API         ├── CS2 Price API
├── CS2 Buy Order API ├── Buff163 API      ├── YouPin API       ├── C5 API
```

Uses existing design patterns: `font-mono text-xs`, grid with `gap-px bg-border`, hover states. Not a keyword dump — a clean navigation module.

### 5. `/api-info` metadata — `src/app/(public)/api-info/page.tsx`

Add metadata export at the top:

```ts
export const metadata: Metadata = {
  title: "CS2 API Documentation — Endpoints, Pricing & Integration Guide",
  description: "Complete API reference for CS2Cap. REST endpoints for real-time prices, buy orders, sales, candlestick charts, and arbitrage detection across 39+ CS2 skin marketplaces.",
  alternates: { canonical: "/api-info" },
};
```

---

### What stays the same
- All design language, animations, brutalist styling
- LiveTicker, FeaturesGrid, MarketplacesSection components untouched
- Footer untouched
- Navbar untouched
- Route structure untouched
- SEO landing page system untouched
- robots/sitemap untouched

### How homepage becomes API-first
- H1 now contains "API" explicitly
- Subtitle leads with "REST API" and "marketplaces" rather than "analytics for traders"
- Primary CTA goes to `/api-info` instead of `/dashboard`
- API/developer section appears second on the page instead of last
- Page metadata targets "CS2 API" intent directly
- Compact internal links reinforce API topic cluster without spamming

