import "server-only";

import type { ItemsSnapshotData } from "@/lib/blob-snapshot-cache";
import type {
  ItemOut,
  ItemSuggestion,
  MarketItemAnalyticsSummary,
  MarketItemsSnapshotResponse,
  WebSearchDirection,
  WebSearchFacetBucket,
  WebSearchFacets,
  WebSearchItem,
  WebSearchPriceHistogramBucket,
  WebSearchResponse,
  WebSearchSort,
} from "@/lib/api/types";

// ── Ported scoring config (mirror of cs2c-api query_parser.py) ────────────────

const ALIASES: Record<string, string> = {
  ak: "ak-47", m4: "m4a4", m4a1: "m4a1-s", aug: "aug", sg: "sg 553", famas: "famas",
  galil: "galil ar", awp: "awp", ssg: "ssg 08", scout: "ssg 08", scar: "scar-20",
  g3: "g3sg1", usp: "usp-s", p2k: "p2000", deagle: "desert eagle", r8: "r8 revolver",
  tec: "tec-9", fn57: "five-seven", "57": "five-seven", mp7: "mp7", mp9: "mp9",
  mp5: "mp5-sd", p90: "p90", mac10: "mac-10", "mac-10": "mac-10", bizon: "pp-bizon",
  ump: "ump-45", nova: "nova", xm: "xm1014", mag7: "mag-7", sawed: "sawed-off",
  neg: "negev", m249: "m249", fn: "factory new", mw: "minimal wear", ft: "field-tested",
  ww: "well-worn", bs: "battle-scarred", st: "stattrak", stat: "stattrak",
  sv: "souvenir", souv: "souvenir",
};

// Per-field match weights; the relevance score is the sum over tokens of the
// max weight among fields the token appears in.
const FIELD_WEIGHTS: Array<[keyof CandidateFields, number]> = [
  ["market_hash_name", 4],
  ["weapon_type", 3],
  ["base_name", 2],
  ["skin_name", 2],
  ["wear_name", 2],
  ["item_subtype", 1],
];

const FACET_FIELDS = [
  "item_type",
  "base_name",
  "weapon_type",
  "rarity_name",
  "wear_name",
  "phase",
  "collection",
] as const;
type FacetField = (typeof FACET_FIELDS)[number];

// base_name facet is restricted to actual weapon/knife/glove base names.
const WEAPON_BASE_NAMES = new Set<string>([
  "Galil AR", "Glock-18", "Five-SeveN", "G3SG1", "M4A4", "P2000", "Butterfly Knife",
  "Paracord Knife", "Survival Knife", "Classic Knife", "Falchion Knife", "Flip Knife",
  "Gut Knife", "Navaja Knife", "M4A1-S", "Bowie Knife", "Karambit", "Huntsman Knife",
  "Ursus Knife", "Kukri Knife", "M9 Bayonet", "Talon Knife", "Nomad Knife", "MAC-10",
  "Shadow Daggers", "Skeleton Knife", "Stiletto Knife", "MAG-7", "M249", "MP7", "MP9",
  "Nova", "MP5-SD", "Negev", "P250", "P90", "Bayonet", "R8 Revolver", "Sawed-Off",
  "SCAR-20", "SG 553", "SSG 08", "Zeus x27", "Tec-9", "UMP-45", "USP-S", "XM1014",
  "AK-47", "AUG", "AWP", "PP-Bizon", "CZ75-Auto", "Desert Eagle", "Dual Berettas",
  "FAMAS", "Moto Gloves", "Driver Gloves", "Specialist Gloves", "Sport Gloves",
  "Hand Wraps", "Hydra Gloves", "Bloodhound Gloves", "Broken Fang Gloves",
]);

const PRICE_BUCKETS = [0, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

// ── Candidate model ───────────────────────────────────────────────────────────

interface CandidateFields {
  market_hash_name: string;
  weapon_type: string;
  base_name: string;
  skin_name: string;
  wear_name: string;
  item_subtype: string;
}

interface Candidate {
  itemId: number;
  marketHashName: string;
  phase: string | null;
  catalog: ItemOut | undefined;
  summary: MarketItemAnalyticsSummary;
  fields: CandidateFields; // lowercased, for scoring
  nameLower: string; // for word-prefix typeahead matching
}

export interface SnapshotSearchParams {
  q?: string;
  item_type?: string[];
  base_name?: string[];
  weapon_type?: string[];
  rarity_name?: string[];
  wear_name?: string[];
  phase?: string[];
  collection?: string[];
  is_stattrak?: boolean;
  is_souvenir?: boolean;
  min_price_usd?: string;
  max_price_usd?: string;
  sort?: WebSearchSort;
  direction?: WebSearchDirection;
  limit?: number;
  offset?: number;
}

// ── Candidate construction (memoized by snapshot identity) ────────────────────

let candidateCache: { key: string; candidates: Candidate[] } | null = null;

function buildCandidates(
  items: ItemsSnapshotData,
  market: MarketItemsSnapshotResponse,
): Candidate[] {
  const key = `${market.meta.generated_at}|${items.timestamp}`;
  if (candidateCache?.key === key) return candidateCache.candidates;

  const byId = items.byItemId;
  const candidates: Candidate[] = market.data.items.map((row) => {
    const catalog = byId[row.item_id];
    const marketHashName = catalog?.market_hash_name || row.market_hash_name;
    return {
      itemId: row.item_id,
      marketHashName,
      phase: catalog?.phase ?? row.phase ?? null,
      catalog,
      summary: row.summary,
      fields: {
        market_hash_name: marketHashName.toLowerCase(),
        weapon_type: (catalog?.weapon_type ?? "").toLowerCase(),
        base_name: (catalog?.base_name ?? "").toLowerCase(),
        skin_name: (catalog?.skin_name ?? "").toLowerCase(),
        wear_name: (catalog?.wear_name ?? "").toLowerCase(),
        item_subtype: (catalog?.item_subtype ?? "").toLowerCase(),
      },
      nameLower: marketHashName.toLowerCase(),
    };
  });

  candidateCache = { key, candidates };
  return candidates;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function expandAliases(tokens: string[]): string[] {
  return tokens.map((token) => ALIASES[token] ?? token);
}

function scoreMatch(tokens: string[], fields: CandidateFields): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [field, weight] of FIELD_WEIGHTS) {
      if (weight > best && fields[field].includes(token)) best = weight;
    }
    score += best;
  }
  return score;
}

// ── Filtering ─────────────────────────────────────────────────────────────────

function parseNum(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function facetValue(candidate: Candidate, field: FacetField): string | null {
  if (field === "phase") return candidate.phase;
  const value = candidate.catalog?.[field];
  if (typeof value !== "string" || !value) return null;
  if (field === "base_name" && !WEAPON_BASE_NAMES.has(value)) return null;
  return value;
}

interface FilterOptions {
  tokens: string[];
  params: SnapshotSearchParams;
  excludeFacet?: FacetField;
  includePrice?: boolean;
}

// Returns { rows, scores }: scores aligned with rows when a query is present.
function applyFilters(
  candidates: Candidate[],
  { tokens, params, excludeFacet, includePrice = true }: FilterOptions,
): { rows: Candidate[]; scores: Map<number, number> } {
  const scores = new Map<number, number>();
  let rows = candidates;

  if (tokens.length > 0) {
    rows = rows.filter((row) => {
      const score = scoreMatch(tokens, row.fields);
      if (score > 0) {
        scores.set(row.itemId, score);
        return true;
      }
      return false;
    });
  }

  for (const field of FACET_FIELDS) {
    if (field === excludeFacet) continue;
    const values = params[field];
    if (values && values.length > 0) {
      const accepted = new Set(values.map((v) => v.toLowerCase()));
      rows = rows.filter((row) => {
        const value = facetValue(row, field);
        return value != null && accepted.has(value.toLowerCase());
      });
    }
  }

  if (params.is_stattrak != null) {
    rows = rows.filter((row) => row.catalog?.is_stattrak === params.is_stattrak);
  }
  if (params.is_souvenir != null) {
    rows = rows.filter((row) => row.catalog?.is_souvenir === params.is_souvenir);
  }

  if (includePrice) {
    const min = parseNum(params.min_price_usd);
    const max = parseNum(params.max_price_usd);
    if (min != null) {
      rows = rows.filter((row) => {
        const ask = parseNum(row.summary.best_ask_usd);
        return ask != null && ask >= min;
      });
    }
    if (max != null) {
      rows = rows.filter((row) => {
        const ask = parseNum(row.summary.best_ask_usd);
        return ask != null && ask <= max;
      });
    }
  }

  return { rows, scores };
}

// ── Sorting ───────────────────────────────────────────────────────────────────

function sortValue(
  candidate: Candidate,
  sort: WebSearchSort,
  scores: Map<number, number>,
): number | null {
  const s = candidate.summary;
  switch (sort) {
    case "relevance": return scores.get(candidate.itemId) ?? 0;
    case "rank": return s.rank ?? null;
    case "best_ask_usd": return parseNum(s.best_ask_usd);
    case "best_bid_usd": return parseNum(s.best_bid_usd);
    case "spread_pct": return s.avg_spread_pct ?? null;
    case "price_rate_24h": return s.price_rate_24h ?? null;
    case "price_rate_7d": return s.price_rate_7d ?? null;
    case "sales_1d": return s.sales_1d ?? null;
    case "provider_count": return s.provider_count ?? null;
    case "marketcap": return parseNum(s.marketcap);
    default: return s.rank ?? null;
  }
}

function sortCandidates(
  rows: Candidate[],
  sort: WebSearchSort,
  direction: WebSearchDirection,
  scores: Map<number, number>,
): Candidate[] {
  if (sort === "name") {
    const sorted = [...rows].sort((a, b) => {
      const cmp = a.nameLower < b.nameLower ? -1 : a.nameLower > b.nameLower ? 1 : a.itemId - b.itemId;
      return cmp;
    });
    return direction === "desc" ? sorted.reverse() : sorted;
  }

  return [...rows].sort((a, b) => {
    const va = sortValue(a, sort, scores);
    const vb = sortValue(b, sort, scores);
    // Nulls always sort last, regardless of direction.
    if (va == null || vb == null) {
      if (va == null && vb == null) return a.itemId - b.itemId;
      return va == null ? 1 : -1;
    }
    if (va !== vb) return direction === "desc" ? vb - va : va - vb;
    // Relevance ties: break by popularity (rank asc, nulls last) rather than
    // item_id. The backend ties by item_id, which floods equal-score matches
    // with low-id graffiti/stickers; ranking by popularity surfaces the real,
    // liquid items the user means.
    if (sort === "relevance") {
      const ra = a.summary.rank ?? Number.POSITIVE_INFINITY;
      const rb = b.summary.rank ?? Number.POSITIVE_INFINITY;
      if (ra !== rb) return ra - rb;
    }
    return a.itemId - b.itemId; // stable final tie-break
  });
}

// ── Response assembly ─────────────────────────────────────────────────────────

function toResponseItem(candidate: Candidate, watchlisted: Set<number>): WebSearchItem {
  const c = candidate.catalog;
  const s = candidate.summary;
  return {
    item_id: candidate.itemId,
    market_hash_name: candidate.marketHashName,
    phase: candidate.phase,
    image_url: c?.image_url ?? null,
    item_type: c?.item_type ?? null,
    item_subtype: c?.item_subtype ?? null,
    weapon_type: c?.weapon_type ?? null,
    base_name: c?.base_name ?? null,
    skin_name: c?.skin_name ?? null,
    wear_name: c?.wear_name ?? null,
    rarity_name: c?.rarity_name ?? null,
    collection: c?.collection ?? null,
    is_stattrak: c?.is_stattrak ?? null,
    is_souvenir: c?.is_souvenir ?? null,
    best_ask_usd: s.best_ask_usd ?? null,
    best_bid_usd: s.best_bid_usd ?? null,
    avg_spread_pct: s.avg_spread_pct ?? null,
    price_rate_24h: s.price_rate_24h ?? null,
    price_rate_7d: s.price_rate_7d ?? null,
    sales_1d: s.sales_1d ?? 0,
    sales_7d: s.sales_7d ?? 0,
    provider_count: s.provider_count,
    marketcap: s.marketcap ?? null,
    rank: s.rank ?? null,
    is_watchlisted: watchlisted.has(candidate.itemId),
  };
}

function buildFacets(candidates: Candidate[], tokens: string[], params: SnapshotSearchParams): WebSearchFacets {
  const result = {} as Record<FacetField, WebSearchFacetBucket[]>;
  for (const field of FACET_FIELDS) {
    const { rows } = applyFilters(candidates, { tokens, params, excludeFacet: field });
    const counts = new Map<string, number>();
    const colors = new Map<string, string>();
    for (const row of rows) {
      const value = facetValue(row, field);
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
      if (field === "rarity_name" && row.catalog?.rarity_color && !colors.has(value)) {
        colors.set(value, row.catalog.rarity_color);
      }
    }
    result[field] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([value, count]) => {
        const color = colors.get(value);
        return color ? { value, count, color } : { value, count };
      });
  }
  return result as WebSearchFacets;
}

function buildPriceHistogram(
  candidates: Candidate[],
  tokens: string[],
  params: SnapshotSearchParams,
): WebSearchPriceHistogramBucket[] {
  const { rows } = applyFilters(candidates, { tokens, params, includePrice: false });
  const buckets = PRICE_BUCKETS.map((min, index) => ({
    min_price_usd: String(min),
    max_price_usd: index + 1 < PRICE_BUCKETS.length ? String(PRICE_BUCKETS[index + 1]) : null,
    count: 0,
  }));
  for (const row of rows) {
    const price = parseNum(row.summary.best_ask_usd);
    if (price == null) continue;
    for (const bucket of buckets) {
      const upper = bucket.max_price_usd == null ? null : Number(bucket.max_price_usd);
      if (price >= Number(bucket.min_price_usd) && (upper == null || price < upper)) {
        bucket.count += 1;
        break;
      }
    }
  }
  return buckets.filter((bucket) => bucket.count > 0);
}

// ── Public entry points ───────────────────────────────────────────────────────

export function searchSnapshot(
  items: ItemsSnapshotData,
  market: MarketItemsSnapshotResponse,
  params: SnapshotSearchParams,
  watchlistedItemIds: Set<number> = new Set(),
): WebSearchResponse {
  const candidates = buildCandidates(items, market);
  const q = params.q?.trim() || null;
  const tokens = q ? expandAliases(tokenize(q)) : [];

  const sort: WebSearchSort = params.sort ?? (q ? "relevance" : "rank");
  const direction: WebSearchDirection = params.direction ?? (sort === "relevance" ? "desc" : "asc");
  const limit = params.limit ?? 24;
  const offset = params.offset ?? 0;

  const { rows: filtered, scores } = applyFilters(candidates, { tokens, params });
  const sorted = sortCandidates(filtered, sort, direction, scores);
  const page = sorted.slice(offset, offset + limit);

  const generatedAt = market.meta.generated_at;
  return {
    meta: {
      generated_at: generatedAt,
      data_source: "cache",
      freshness_sec: Math.max(0, Math.floor((Date.now() - new Date(generatedAt).getTime()) / 1000)),
      query: q,
      filters: {
        item_type: params.item_type ?? [],
        base_name: params.base_name ?? [],
        weapon_type: params.weapon_type ?? [],
        rarity_name: params.rarity_name ?? [],
        wear_name: params.wear_name ?? [],
        phase: params.phase ?? [],
        collection: params.collection ?? [],
        is_stattrak: params.is_stattrak ?? null,
        is_souvenir: params.is_souvenir ?? null,
        min_price_usd: params.min_price_usd ?? null,
        max_price_usd: params.max_price_usd ?? null,
      },
      sort,
      direction,
    },
    items: page.map((row) => toResponseItem(row, watchlistedItemIds)),
    facets: buildFacets(candidates, tokens, params),
    price_histogram: buildPriceHistogram(candidates, tokens, params),
    pagination: {
      limit,
      offset,
      total: filtered.length,
      has_next: offset + limit < filtered.length,
      has_prev: offset > 0,
    },
  };
}

// Lightweight typeahead: word-prefix match on the displayed name, ranked by
// match count then popularity. Shares the same candidate set as full search.
export function suggestItems(
  items: ItemsSnapshotData,
  market: MarketItemsSnapshotResponse,
  query: string,
  limit = 12,
): ItemSuggestion[] {
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const matchers = tokens.map((token) => new RegExp(`(^|[^a-z0-9])${token}`));
  const candidates = buildCandidates(items, market);

  const scored: Array<{ candidate: Candidate; matched: number; rank: number }> = [];
  for (const candidate of candidates) {
    let matched = 0;
    for (const matcher of matchers) {
      if (matcher.test(candidate.nameLower)) matched += 1;
    }
    if (matched === 0) continue;
    scored.push({ candidate, matched, rank: candidate.summary.rank ?? Number.POSITIVE_INFINITY });
  }

  scored.sort((a, b) => b.matched - a.matched || a.rank - b.rank);

  return scored.slice(0, limit).map(({ candidate }) => ({
    item_id: candidate.itemId,
    market_hash_name: candidate.marketHashName,
    image_url: candidate.catalog?.image_url ?? null,
    item_type: candidate.catalog?.item_type ?? null,
    wear_name: candidate.catalog?.wear_name ?? null,
  }));
}
