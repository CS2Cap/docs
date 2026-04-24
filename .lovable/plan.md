

## Add SDKs Section to API Page

A new section dedicated to the official Python and TypeScript SDKs, placed between the "Simple Integration" block and the "API Reference" section so developers see SDK options before browsing raw endpoints. Both SDKs live in the same monorepo: `https://github.com/CS2Cap/SDKs`.

### Layout

```text
┌────────────────────────────────────────────────────────────┐
│ // OFFICIAL SDKs                                           │
│ SHIP FASTER WITH OUR LIBRARIES                             │
│                                                            │
│ ┌──────────────────────────┐  ┌──────────────────────────┐ │
│ │ 🐍 PYTHON SDK            │  │ {} TYPESCRIPT SDK        │ │
│ │ Type-safe client for     │  │ Fully typed client for   │ │
│ │ Python 3.9+.             │  │ Node.js & browsers.      │ │
│ │                          │  │                          │ │
│ │ $ pip install cs2cap     │  │ $ npm i @cs2cap/sdk      │ │
│ │                          │  │                          │ │
│ │ [VIEW ON GITHUB →]       │  │ [VIEW ON GITHUB →]       │ │
│ └──────────────────────────┘  └──────────────────────────┘ │
│                                                            │
│   Browse both SDKs in the CS2Cap/SDKs monorepo on GitHub → │
└────────────────────────────────────────────────────────────┘
```

### How users are pointed to GitHub

1. **Primary CTA per SDK card** — Each card has a bold "VIEW ON GITHUB →" button. Both link to `https://github.com/CS2Cap/SDKs`, with deep-link anchors to the relevant subdirectory (e.g. `/SDKs/tree/main/python` and `/SDKs/tree/main/typescript`) so users land directly on the right folder when those paths exist in the repo.
2. **Install snippet** — Each card shows the install command in a terminal-style block (`pip install cs2cap`, `npm i @cs2cap/sdk`) so the package name is immediately visible.
3. **Section footer link** — A secondary "View the full CS2Cap/SDKs repo on GitHub →" link reinforces the destination and signals that more languages may follow.
4. **Anchor target** — Section gets `id="sdks"` so it can later be linked from the hero or nav.
5. **GitHub icon** — A small `Github` lucide icon next to each CTA so the destination is recognizable at a glance.

### Visual style

- Matches the existing brutalist aesthetic: `border-brutal`, `bg-card`, mono fonts, primary accent color, same spacing as the "Developer Experience" section above.
- Icons from `lucide-react`: `FileCode2` for Python card, `Braces` for TypeScript card, `Github` on each CTA.
- Install snippet rendered in a `bg-secondary/50 border border-border` block with a muted `$` prefix.
- CTA button styled like the existing "GET ACCESS →" button (filled primary, brutalist hover).

### Files to edit

- `src/app/(public)/api-info/page.tsx`
  - Add `Github`, `FileCode2` to the `lucide-react` imports.
  - Insert a new `<section id="sdks">` between the "Developer Experience" section (ends line 245) and the "Endpoints" section (starts line 247).
  - Both card CTAs and the footer link target `https://github.com/CS2Cap/SDKs` (with `/tree/main/python` and `/tree/main/typescript` for the cards).

