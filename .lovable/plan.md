# Inventory Value page — implementation plan

Add a public tool at `/inventory-value` that lets anyone paste a Steam ID, vanity name, or Steam profile URL and see the live USD value of that user's CS2 inventory. The browser never calls CS2Cap upstream directly — it only calls an app-owned route that injects a dedicated server-side key.

This plan matches the spec you pasted. Confirming it here so I can flip to build mode and ship the files.

## What gets built

**New files**
- `src/app/api/inventory-value/route.ts` — anonymous valuation boundary. Validates input, normalizes Steam URLs to SteamID64 / vanity, calls upstream with `Bearer ${CS2CAP_PUBLIC_TOOL_API_KEY}`, resolves catalog `item_id`s server-side via `/v1/web/items?market_hash_name=...`, batches `/v1/portfolio/value` at 100 distinct IDs per call, merges line items back with inventory metadata, applies short-TTL Upstash cache + in-memory rate limit, and returns `InventoryValueToolResponse`.
- `src/app/(public)/inventory-value/page.tsx` — server component, `metadata` for SEO, renders the client tool + how-it-works grid + about copy + `<FooterSection />`.
- `src/app/(public)/inventory-value/InventoryValueTool.tsx` — `"use client"`. Form, submit, loading, error states. Calls `webApi.valueSteamInventory`.
- `src/components/inventory/InventoryStatsStrip.tsx` — 4-cell brutalist stats grid (TOTAL VALUE / ITEMS PRICED / ITEMS UNPRICED / PROVIDERS QUERIED).
- `src/components/inventory/InventoryItemsTable.tsx` — sortable table (default: line value desc). Columns: icon, name+phase+wear, qty, best ask, line value, provider. Each priced row links to `/item/[itemId]`. UNTRADABLE pill where applicable.
- `src/lib/inventory-value-cache.ts` — small Upstash helper for short-TTL JSON cache + sliding-window rate limit, separate from the market-snapshot cache so its specifics don't leak.

**Edited files**
- `src/lib/api/types.ts` — add: `SteamInventoryItem`, `SteamInventoryLookupResponse`, `PortfolioValueRequest`, `PortfolioValueLineItem`, `PortfolioValueResponse`, `InventoryValueRequest`, `InventoryValueResolvedItem`, `InventoryValueUnmatchedItem`, `InventoryValueStats`, `InventoryValueMeta`, `InventoryValueToolResponse`. Money fields stay as integer minor units.
- `src/lib/api/client.ts` — add `webApi.valueSteamInventory(body) → POST /api/inventory-value`. No browser methods that hit `/v1/inventory/...` or `/v1/portfolio/...` directly.
- `src/components/Navbar.tsx` — insert `{ label: "INVENTORY", href: "/inventory-value" }` between SEARCH and API (desktop + mobile).
- `src/app/sitemap.ts` — add `/inventory-value`.

`src/app/api/cs2c/[...path]/route.ts` is **not** touched — the new route is the anonymous boundary.

## Server route behavior

```text
POST /api/inventory-value  { steam_id }
   |
   v
1. Validate body shape, trim, length cap, return 400 on bad input
2. Normalize:
     - "steamcommunity.com/profiles/<id64>"  -> id64
     - "steamcommunity.com/id/<vanity>"      -> vanity
     - bare 17-digit numeric                  -> id64
     - everything else                        -> vanity
3. If !CS2CAP_PUBLIC_TOOL_API_KEY -> 503 service_unavailable
4. Sliding-window rate limit (per IP + per normalized target). On hit -> 429.
5. Cache lookup by normalized target. If hit -> return with meta.cache_hit=true.
6. GET /v1/inventory/steam/lookup?steam_id=<value>  Bearer key
     - 401/403 from upstream -> 503 (do not leak)
     - 404 / "no profile"    -> 404 not_found
     - private inventory     -> 403 private_inventory
     - 429                   -> 429 upstream_rate_limited
7. For each inventory item:
     - look up { market_hash_name, phase } in /v1/web/items
       (batched by unique key, cached in-process for the request)
     - phased items must match a phased catalog row exactly,
       phaseless items must match a phaseless catalog row.
     - misses -> unmatched (reason: no_catalog_match | phase_mismatch)
8. Group resolved items by item_id, sum quantity. Keep one display row
   per item_id (icon_url/name/phase/tradable/marketable from the first asset).
9. Batch POST /v1/portfolio/value in chunks of 100 distinct item_ids.
   Sum total_value across chunks. Items not in line_items but resolved
   become unmatched (reason: valuation_missing). Resolved items priced
   at null best_ask are kept in `items` and counted as items_unpriced.
10. Cache success briefly (60s). Do not cache 401/403/503/429.
11. Respond { meta, stats, items, unmatched_items }.
```

## Edge cases & UX

- Private inventory → "This inventory is private. The owner needs to set their CS2 inventory to public on Steam."
- Empty inventory → "No CS2 items found in this inventory."
- Vanity not resolvable → "Couldn't find a Steam profile for that name."
- Missing `CS2CAP_PUBLIC_TOOL_API_KEY` → "This tool is temporarily unavailable. Try again soon."
- App-side or upstream 429 → "Too many lookups right now — try again in a moment."
- Resolved item with `best_ask: null` → counted as unpriced, still visible in table with `—` price.
- `tradable: false` items still counted in valuation, flagged with a small UNTRADABLE pill.
- Phased items only match phased catalog entries — never fall back to phaseless prices.

## Style

- Heading: Space Grotesk black, tracking-tighter (`HeroSection` vocabulary).
- Stats strip: copy of HeroSection's 4-cell `gap-px bg-border` grid.
- Tables/cards: `border-2 border-border`, `bg-card`, hover `bg-secondary/50`.
- Icons: plain `<img>` from Steam CDN at 48px, no `next.config.ts` change.
- Money: divide minor units by 100, format `Intl.NumberFormat("en-US", { style:"currency", currency:"USD" })`.
- Copy: "inventory value", "items", "best ask". No "investment" / "portfolio worth" / "net worth".

## One thing you'll need to do

The page only works once `CS2CAP_PUBLIC_TOOL_API_KEY` exists as a runtime env var. After approval I'll prompt you to add it via Lovable Cloud → Secrets (separate from `CS2C_EXPORT_API_KEY`, which stays scoped to the cron exporter). Until it's set the route returns a clean "temporarily unavailable" response so nothing crashes.

Approve this plan to start the build.