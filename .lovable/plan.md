

## Problem
The hero PNG has a dark navy fill across the whole canvas. Even though it's close to the page bg, the rectangle edges are visible as a hard vertical seam (see image 2: a clear value step between the image's bg and the page bg).

The user circled the actual subject (the floating market card + AWP). Everything outside that ellipse should be fully transparent so only the card/weapon shows on top of the real page background.

## Approach
Replace the full-rectangle PNG with one that has a **transparent background**, where only the floating card UI + the AWP + their natural glow are visible. No painted backdrop at all.

Two viable ways to produce that asset:

**Option A — Re-isolate the existing image (recommended)**
Use Python + Pillow on `public/assets/hero-market-card.png` to:
1. Build an alpha mask from luminance (dark navy → transparent, bright cyan/orange/white card pixels → opaque).
2. Apply a soft radial falloff centered on the card so the card's own ambient cyan glow fades smoothly to 0 alpha (no hard ellipse edge).
3. Crop tight bounding box around non-transparent pixels to remove wasted space.
4. Save back to `public/assets/hero-market-card.png` (PNG with alpha).

This keeps the exact visual the user already approved, just removes the backdrop.

**Option B — Regenerate from scratch** with a prompt that demands a pure black/transparent background. Less reliable (models often paint in subtle gradients) and slower. Use only as fallback if A's mask looks dirty.

Plan: do A first, QA by compositing the result onto the actual page bg color (`hsl(220 20% 4%)`) and inspecting. If edges still show, iterate on the luminance threshold + feather radius. Only fall back to B if A can't produce a clean result.

## Steps

1. **Isolate subject** — Python script reads current PNG, builds luminance-based alpha with smooth threshold (e.g. linear ramp from L=0.04 → L=0.12), multiplies by a soft radial mask centered on the card, crops to content bbox.
2. **QA** — composite onto a flat `hsl(220 20% 4%)` canvas and view; check the seam area from image 2 to confirm no rectangle edge is visible. Iterate thresholds if needed.
3. **No component changes needed** — `HeroSection.tsx` already renders the PNG without a frame; the new transparent PNG will simply float on the page bg. Width/height props will be updated to the new cropped dimensions.
4. **Verify** — `tsc --noEmit`, then visual check at 1541×859.

## Files touched
- `public/assets/hero-market-card.png` — replaced with transparent-bg, cropped version
- `src/components/HeroSection.tsx` — only updates `width`/`height` to match new dimensions

## Out of scope
- Changing the artwork itself (skin, layout, stats).
- Changing hero copy or layout grid.

