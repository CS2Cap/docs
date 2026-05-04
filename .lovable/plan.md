# Mobile UX & Pricing Discoverability Fixes

Four focused changes to address mobile layout, missing menu items, and upgrade discoverability.

## 1. Navbar — replace UPTIME with PRICING, fix dropdown

**File:** `src/components/Navbar.tsx`

- Replace the `UPTIME` nav item with `PRICING` linking to `/api-info#pricing`. Keep the in-page anchor scroll behavior (Next handles it natively).
- Move `UPTIME` into the account dropdown footer area (or drop it entirely — it stays in the footer). Recommendation: drop from primary nav, keep accessible via footer only.
- Account dropdown currently lists Dashboard, Watchlist, Alerts, Account, API Keys, Usage, Billing, Settings — all 8 are already in `accountMenuItems`. The reported "hidden Billing" issue is that the dropdown is taller than the viewport on small screens / has no scroll. Fix:
  - Add `max-h-[calc(100vh-5rem)] overflow-y-auto` to `DropdownMenuContent`.
  - Add a visible **BILLING** shortcut as a secondary chip in the dropdown header (or move Billing above Account so it's never below the fold).

## 2. Mobile hero — single-column on small screens

**File:** `src/app/(public)/api-info/page.tsx` (and verify `src/app/(public)/page.tsx`)

The hero uses `grid lg:grid-cols-2` which is already responsive in principle, but the right-hand 2x2 stat grid is cramped on phones. Changes:
- Keep `lg:grid-cols-2` but tighten gap on mobile: `gap-8 lg:gap-12`.
- Stat grid: change `grid-cols-2` → `grid-cols-2 sm:grid-cols-2` (keep 2x2 — readable). Reduce stat card padding on mobile (`p-4 md:p-6`) and shrink value text (`text-xl md:text-2xl`).
- Hero h1: `text-4xl sm:text-5xl md:text-7xl` to avoid overflow on 360px-wide viewports.
- CTA buttons: ensure they stack full-width on mobile via `w-full sm:w-auto` and the wrapping flex stays `flex-wrap`.

Audit other landing sections (`SeoLandingPage.tsx`, `HeroSection.tsx`) for the same `lg:grid-cols-2` pattern and apply the same gap/padding tightening if needed.

## 3. Add upgrade CTAs inside the API dashboard

Users want to upgrade from where they live (dashboard / usage), not hunt for it.

**Files:**
- `src/app/(auth)/dashboard/page.tsx`
- `src/app/(auth)/account/usage/page.tsx`
- `src/app/(auth)/account/api-keys/page.tsx`

Add a compact "Plan" card to each:
- Shows current plan name (from `session.usage` / billing overview) + usage bar.
- Primary button: **UPGRADE PLAN** → links to `/account/billing`.
- Secondary link: **VIEW PLANS** → `/api-info#pricing`.
- On `usage/page.tsx`, when `usage.projection.upgrade_recommended` is true, surface the CTA prominently (replace the current passive Badge with a clickable card).

Reuse existing brutalist Card styles already used on those pages — no new components required.

## 4. Sitemap / minor

**File:** `src/app/sitemap.ts`
- No URL changes needed; `/api-info` already covers pricing via the anchor.

## Out of scope

- No redesign of the billing page itself.
- No changes to plan data or checkout flow.
- Uptime link stays available in the footer.
