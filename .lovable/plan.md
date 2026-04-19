

## Goal
Add a CS2-related hero-side visual on the right of the homepage hero, matching the dark navy / cyan brand and the existing brutalist/technical aesthetic.

## Investigation notes
- Hero lives in `src/components/HeroSection.tsx` (already viewed). Currently uses `max-w-4xl` content on the left and the right side is empty.
- Hero is rendered from `src/app/(public)/page.tsx`.
- Brand: dark navy/near-black, cyan accents, Space Grotesk headings / Inter body, restrained glow (per `mem://style/branding`).
- We can generate a high-quality image via Lovable AI image gateway (Nano banana pro for hero quality) and store it in `public/assets/`.
- Layout currently uses `max-w-4xl` single column. We need to convert to a two-column grid on `lg:` while keeping mobile stacked, and ensure the stats grid + CTAs still look right.

## Plan

### 1. Generate the hero artwork
Write a one-off Node script (run via `code--exec`) that calls the Lovable AI gateway with `google/gemini-3-pro-image-preview` to render the visual described by the user. Save it as `public/assets/hero-market-card.png`.

Prompt distilled from the brief, with brand specifics:
- Dark navy / near-black bg with subtle cyan grid + faint geometric wireframes
- Floating angled "market item card" / inspect panel
- Centerpiece: AWP Asiimov (primary choice — most iconic, fits cyan/orange contrast, best rendered by image models). Fallback: Karambit Doppler.
- Card overlays: Best Ask, Best Bid, 24h Volume, 7d Trend, # marketplaces, mini sparkline
- Cyan/blue accents, subtle glassmorphism, premium engineered look
- Negative space preserved, no characters/explosions, no logos

QA the image (view it back) and regenerate if it has artifacts, garbled text, or off-brand colors.

### 2. Wire image into `HeroSection.tsx`
- Change the inner container from a single `max-w-4xl` column to a responsive grid:
  - Mobile / `md`: current single column, image hidden or below
  - `lg`: two-column `grid-cols-12` — text spans 7 cols, visual spans 5 cols on the right
- Add the visual as a `next/image` with `priority`, sized responsively, with subtle ambient glow (cyan radial behind it) and a faint border to match the brutalist frame language already in the page.
- Keep the existing decorative squares/dots but reposition so they don't collide with the new visual.
- Stats grid stays under the left column (does not extend under the image) so the visual reads as a clean centerpiece.

### 3. Verify
- Run `npx tsc --noEmit` to confirm no type regressions.
- Visually check at the user's current viewport (1541×859) and on mobile widths via the layout rules — image hidden below `lg`, text fills width.

## Technical details
- Files touched:
  - `public/assets/hero-market-card.png` (new, generated)
  - `src/components/HeroSection.tsx` (layout + image)
- No new dependencies. Uses existing `next/image`.
- Image generation uses `LOVABLE_API_KEY` env var (already available in sandbox via Lovable AI gateway). Output base64 → decoded to PNG file in `public/assets/`.
- Responsive rules:
  ```
  grid lg:grid-cols-12 gap-12 items-center
  left:  lg:col-span-7
  right: hidden lg:block lg:col-span-5
  ```
- The visual gets a subtle wrapper:
  ```
  relative
  ::before  cyan radial blur (opacity ~20%)
  border border-border/60
  rounded-none (brutalist)
  ```

## Out of scope
- No copy/CTA changes.
- No new sections.
- No changes to other pages.

