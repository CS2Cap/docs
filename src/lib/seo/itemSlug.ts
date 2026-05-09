/**
 * Item URL slug helpers.
 *
 * Pattern: `/item/{slug}-{itemId}` (e.g. `/item/karambit-fade-factory-new-9879`).
 * The numeric ID is the source of truth — slugs are derived from market_hash_name
 * and used for keyword signals + canonical redirects.
 */

const STAR = /★/g;
const TRADEMARK = /™/g;

export function slugifyMarketHashName(name: string): string {
  return name
    .replace(STAR, " ")
    .replace(TRADEMARK, "")
    .replace(/StatTrak/gi, "stattrak")
    .replace(/Souvenir/gi, "souvenir")
    .toLowerCase()
    .replace(/[|()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildItemPath(
  itemId: number | null | undefined,
  marketHashName?: string | null,
): string {
  if (itemId == null || !Number.isFinite(itemId)) {
    return "/search";
  }
  const slug = marketHashName ? slugifyMarketHashName(marketHashName) : "";
  return slug ? `/item/${slug}-${itemId}` : `/item/${itemId}`;
}

/**
 * Parse the dynamic `[itemId]` route param. Accepts both bare numeric strings
 * (`9879`) and slug-suffixed forms (`karambit-fade-factory-new-9879`). Returns
 * the numeric ID and the slug prefix (or null if the param was numeric only).
 */
export function parseItemRouteParam(
  param: string,
): { id: number; slug: string | null } | null {
  if (/^\d+$/.test(param)) {
    const id = Number.parseInt(param, 10);
    return Number.isFinite(id) ? { id, slug: null } : null;
  }
  const match = param.match(/^(.+)-(\d+)$/);
  if (!match) {
    return null;
  }
  const id = Number.parseInt(match[2], 10);
  if (!Number.isFinite(id)) {
    return null;
  }
  return { id, slug: match[1] };
}
