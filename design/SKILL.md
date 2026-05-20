---
name: cs2cap-design
description: Use this skill to generate well-branded interfaces and assets for CS2Cap (cs2cap.com — the unified CS2 skin market API), either for production or throwaway prototypes / mocks / decks. Contains the brutalist + cyber-trading design language, color and type tokens, JetBrains Mono / Inter font setup, brand logos, plan tier badges, and an interactive UI-kit recreation of the website (Home, Pricing, Item, Dashboard).
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files:

- `colors_and_type.css` — drop-in design tokens (CSS vars + utility classes: `t-display-*`, `t-eyebrow`, `t-tag`, `border-brutal`, `bg-grid`, `hairline-grid`, `brutalist-hover`, `t-gradient`).
- `assets/` — `logo.svg`, `logo-512.png`, `logo-stroked-512.png`, the three tier badges (`starter-tier.png` / `pro-tier.png` / `quant-tier.png`), `favicon.ico`, `steam.svg`.
- `preview/` — small visual cards demonstrating every primitive (colors, type, spacing, components). Good source material to lift from.
- `ui_kits/website/` — full interactive recreation of the cs2cap.com web app. Read `ui_kits/website/components/*.jsx` for the canonical component implementations and `ui_kits/website/screens/*.jsx` for full page layouts.

**Voice & content rules** (essential — see README "Content Fundamentals" for examples):
- Tone is **dry, technical, builder-to-builder**. No exclamation marks. No emoji. No superlatives.
- Display headings: **Inter 900, ALL CAPS, tracking −0.035em**. Two-line pattern where the second line uses `.t-gradient`.
- Labels / buttons / nav: **JetBrains Mono, ALL CAPS, wide tracking** (0.12–0.2em).
- Section eyebrows: `// COMMENT_LIKE_THIS` in primary-blue.
- Stat lines often end with a period rendered as the brand-blue accent: `39 MARKETPLACES.`

**Visual rules:**
- Radius is **0** everywhere except 50% on small dots / avatars.
- Borders are **2px** by default; **1px** for inputs/dividers.
- Card grids use the **hairline-grid** trick: `gap: 1px` over `background: var(--border)`.
- The signature interaction is `.brutalist-hover` — `translate(-2px,-2px)` + `4px 4px 0 var(--brand)` hard shadow, 50ms.
- Backgrounds: flat near-black + the 40px-grid pattern for marketing sections. Never gradient fills (gradients are for text only, via `background-clip: text`).
- Icons: **Lucide stroke-width 1.5**, sized 14–24px. Never emoji.

**If creating visual artifacts** (slides, mocks, throwaway prototypes, marketing pages):
- Copy `assets/` and `colors_and_type.css` into the destination folder.
- Build static HTML files for the user to view. Use the utility classes directly — they cover 90% of cases.
- For full page mocks, lean on the components in `ui_kits/website/components/` as scaffolding.

**If working on production code** (the live Next.js app at `github.com/dadscap/cs2cap`):
- Tokens here match `src/app/globals.css` 1:1. Edits to the live app should preserve the same HSL triplets.
- Components in this kit are simplified, cosmetic versions — for production, use the real Radix-based components in `src/components/ui/`.

**If the user invokes this skill without other guidance**, ask them what they want to build, ask a few targeted questions (audience, screen / surface, fidelity, variants), then act as an expert designer who outputs HTML artifacts — or production code, when the user asks for it.
