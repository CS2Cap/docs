import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download, ExternalLink, Search as SearchIcon } from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { getSearchPageData, type SearchFilterValues } from "@/lib/api/compositions";
import type {
  WebSearchDirection,
  WebSearchFacetBucket,
  WebSearchItem,
  WebSearchResponse,
  WebSearchSort,
} from "@/lib/api/types";
import { buildItemPath } from "@/lib/seo/itemSlug";
import { PendingResults } from "./PendingResults";

type SearchParams = {
  q?: string | string[];
  item_type?: string | string[];
  base_name?: string | string[];
  weapon_type?: string | string[];
  wear_name?: string | string[];
  rarity_name?: string | string[];
  collection?: string | string[];
  phase?: string | string[];
  min_price_usd?: string | string[];
  max_price_usd?: string | string[];
  sort?: string | string[];
  direction?: string | string[];
  page?: string | string[];
};

type SearchPageProps = {
  searchParams: Promise<SearchParams>;
};

type FilterField = {
  key: Extract<
    keyof SearchFilterValues,
    "item_type" | "base_name" | "wear_name" | "rarity_name" | "collection" | "phase"
  >;
  label: string;
};

const SEARCH_CANONICAL_PARAMS = [
  "q",
  "item_type",
  "base_name",
  "wear_name",
  "rarity_name",
  "collection",
  "phase",
] as const;

const FILTER_FIELDS: FilterField[] = [
  { key: "item_type", label: "Type" },
  { key: "base_name", label: "Weapon" },
  { key: "rarity_name", label: "Rarity" },
  { key: "wear_name", label: "Wear" },
  { key: "phase", label: "Phase" },
  { key: "collection", label: "Collection" },
];

const FACET_MAX_VISIBLE: Partial<Record<FilterField["key"], number>> = {
  item_type: 20,
  rarity_name: 20,
  base_name: 80,
  collection: 200,
};
const DEFAULT_FACET_MAX = 8;

const SORT_OPTIONS: Array<{ value: WebSearchSort; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "rank", label: "Rank" },
  { value: "best_ask_usd", label: "Ask" },
  { value: "best_bid_usd", label: "Bid" },
  { value: "spread_pct", label: "Spread" },
  { value: "price_rate_24h", label: "24H" },
  { value: "price_rate_7d", label: "7D" },
  { value: "sales_1d", label: "Volume" },
  { value: "provider_count", label: "Markets" },
  { value: "marketcap", label: "Market Cap" },
  { value: "name", label: "Name" },
];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | string[] | undefined): string | undefined {
  const normalized = firstValue(value)?.trim();
  return normalized || undefined;
}

function defaultSortFor(query: string): WebSearchSort {
  return query ? "relevance" : "rank";
}

function defaultDirectionFor(sort: WebSearchSort): WebSearchDirection {
  return sort === "relevance" ? "desc" : "asc";
}

function sanitizeSort(value: string | string[] | undefined, query: string): WebSearchSort {
  const normalized = clean(value);
  return SORT_OPTIONS.some((option) => option.value === normalized)
    ? (normalized as WebSearchSort)
    : defaultSortFor(query);
}

function sanitizeDirection(
  value: string | string[] | undefined,
  sort: WebSearchSort,
): WebSearchDirection {
  const normalized = clean(value);
  if (normalized === "desc") return "desc";
  if (normalized === "asc") return "asc";
  return defaultDirectionFor(sort);
}

function buildPendingSnapshot(
  query: string,
  filters: SearchFilterValues,
  page: number,
): string {
  return [
    query,
    filters.item_type ?? "",
    filters.base_name ?? "",
    filters.wear_name ?? "",
    filters.rarity_name ?? "",
    filters.collection ?? "",
    filters.phase ?? "",
    filters.min_price_usd ?? "",
    filters.max_price_usd ?? "",
    filters.sort ?? "rank",
    filters.direction ?? "asc",
    String(page),
  ].join("|");
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCanonicalSearchPath(
  values: Record<(typeof SEARCH_CANONICAL_PARAMS)[number], string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const key of SEARCH_CANONICAL_PARAMS) {
    const value = values[key];
    if (value) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function buildSearchHref(
  query: string,
  filters: SearchFilterValues,
  page = 1,
  overrides: Partial<SearchFilterValues> = {},
) {
  const params = new URLSearchParams();
  const merged: SearchFilterValues = { ...filters, ...overrides };

  if (query) {
    params.set("q", query);
  }

  for (const { key } of FILTER_FIELDS) {
    const value = merged[key];
    if (value) {
      params.set(key, value);
    }
  }

  if (merged.min_price_usd) {
    params.set("min_price_usd", merged.min_price_usd);
  }
  if (merged.max_price_usd) {
    params.set("max_price_usd", merged.max_price_usd);
  }
  const defaultSort = defaultSortFor(query);
  if (merged.sort && merged.sort !== defaultSort) {
    params.set("sort", merged.sort);
  }
  if (
    merged.direction &&
    merged.direction !== defaultDirectionFor(merged.sort ?? defaultSort)
  ) {
    params.set("direction", merged.direction);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `/search?${search}` : "/search";
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const resolved = await searchParams;
  const q = clean(resolved.q);
  const itemType = clean(resolved.item_type);
  const baseName = clean(resolved.base_name);
  const weaponType = clean(resolved.weapon_type);
  const wearName = clean(resolved.wear_name);
  const rarityName = clean(resolved.rarity_name);
  const collection = clean(resolved.collection);
  const phase = clean(resolved.phase);

  const titleParts: string[] = [];
  if (q) titleParts.push(titleCase(q));
  if (baseName) titleParts.push(baseName);
  else if (weaponType) titleParts.push(weaponType);
  if (wearName) titleParts.push(wearName);
  if (rarityName) titleParts.push(rarityName);
  if (phase) titleParts.push(phase);
  if (itemType && titleParts.length === 0) titleParts.push(`CS2 ${itemType}`);
  if (collection) titleParts.push(collection);

  const titleSubject = titleParts.length > 0 ? titleParts.join(" ") : null;
  const title = titleSubject
    ? `${titleSubject} CS2 Skin Prices - Live Market Data`
    : "Search CS2 Skins - Live Prices Across 40+ Markets";
  const description = titleSubject
    ? `Live CS2 skin prices for ${titleSubject}. Compare ask prices, buy orders, and market analytics across 40+ marketplaces with the CS2Cap API.`
    : "Search every CS2 skin in the catalog and compare live prices, buy orders, and analytics across 40+ marketplaces.";
  const canonical = buildCanonicalSearchPath({
    q,
    item_type: itemType,
    base_name: baseName ?? weaponType,
    wear_name: wearName,
    rarity_name: rarityName,
    collection,
    phase,
  });

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: `https://cs2cap.com${canonical}`,
      siteName: "CS2Cap",
      type: "website",
      images: [
        {
          url: "https://cs2cap.com/api/og?slug=cs2-skins-api",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://cs2cap.com/api/og?slug=cs2-skins-api"],
    },
  };
}

function formatUsdMajor(value: string | null | undefined) {
  if (value == null) {
    return "—";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatSignedPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatWholeNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function priceChangeClass(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "text-muted-foreground";
  }

  if (value > 0) {
    return "text-emerald-400";
  }

  if (value < 0) {
    return "text-rose-400";
  }

  return "text-foreground";
}

const WEAR_SUFFIXES = [
  " (Factory New)",
  " (Minimal Wear)",
  " (Field-Tested)",
  " (Well-Worn)",
  " (Battle-Scarred)",
];

function stripWearSuffix(name: string) {
  const suffix = WEAR_SUFFIXES.find((s) => name.endsWith(s));
  return suffix ? name.slice(0, -suffix.length) : name;
}

function itemSubtitle(item: WebSearchItem) {
  return [
    item.rarity_name,
    item.wear_name,
    item.phase,
  ]
    .filter(Boolean)
    .join(" / ") || "Catalog item";
}

function facetOptions(data: WebSearchResponse, key: FilterField["key"], currentValue?: string) {
  const buckets = (data.facets[key] ?? []) as WebSearchFacetBucket[];
  if (!currentValue || buckets.some((bucket) => bucket.value === currentValue)) {
    return buckets;
  }

  return [{ value: currentValue, count: 0 }, ...buckets];
}

function priceBucketLabel(bucket: WebSearchResponse["price_histogram"][number]) {
  const min = Number(bucket.min_price_usd);
  const max = bucket.max_price_usd == null ? null : Number(bucket.max_price_usd);
  const minLabel = Number.isFinite(min) ? `$${min.toLocaleString()}` : "$0";
  if (max == null || !Number.isFinite(max)) {
    return `${minLabel}+`;
  }
  return `${minLabel}-$${max.toLocaleString()}`;
}

function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  return `"${raw.replaceAll("\"", "\"\"")}"`;
}

function buildSearchCsvHref(items: WebSearchItem[]): string {
  const rows = [
    [
      "item_id",
      "market_hash_name",
      "best_ask_usd",
      "best_bid_usd",
      "avg_spread_pct",
      "price_rate_24h",
      "price_rate_7d",
      "sales_1d",
      "provider_count",
      "marketcap",
    ],
    ...items.map((item) => [
      item.item_id,
      item.market_hash_name,
      item.best_ask_usd,
      item.best_bid_usd,
      item.avg_spread_pct,
      item.price_rate_24h,
      item.price_rate_7d,
      item.sales_1d,
      item.provider_count,
      item.marketcap,
    ]),
  ];

  return `data:text/csv;charset=utf-8,${encodeURIComponent(
    rows.map((row) => row.map(csvCell).join(",")).join("\n"),
  )}`;
}

function paginationPages(currentPage: number, totalPages: number): number[] {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function resultWindow(data: WebSearchResponse): string {
  const total = data.pagination.total;
  if (total <= 0) return "0";
  const start = data.pagination.offset + 1;
  const end = Math.min(data.pagination.offset + data.pagination.limit, total);
  return `${start.toLocaleString()}-${end.toLocaleString()}`;
}

function facetHref(
  query: string,
  filters: SearchFilterValues,
  key: FilterField["key"],
  value: string | undefined,
) {
  return buildSearchHref(query, filters, 1, {
    [key]: value,
  } as Partial<SearchFilterValues>);
}

function activeChips(query: string, filters: SearchFilterValues) {
  const chips: Array<{ label: string; href: string }> = [];

  if (query) {
    chips.push({
      label: `QUERY: ${query}`,
      href: buildSearchHref("", filters, 1),
    });
  }

  for (const field of FILTER_FIELDS) {
    const value = filters[field.key];
    if (!value) continue;
    chips.push({
      label: `${field.label.toUpperCase()}: ${value}`,
      href: facetHref(query, filters, field.key, undefined),
    });
  }

  if (filters.min_price_usd) {
    chips.push({
      label: `MIN: $${filters.min_price_usd}`,
      href: buildSearchHref(query, filters, 1, { min_price_usd: undefined }),
    });
  }

  if (filters.max_price_usd) {
    chips.push({
      label: `MAX: $${filters.max_price_usd}`,
      href: buildSearchHref(query, filters, 1, { max_price_usd: undefined }),
    });
  }

  return chips;
}

function HiddenFilterInputs({
  filters,
  query,
}: {
  filters: SearchFilterValues;
  query: string;
}) {
  const defaultSort = defaultSortFor(query);
  return (
    <>
      {FILTER_FIELDS.map(({ key }) =>
        filters[key] ? (
          <input key={key} type="hidden" name={key} value={filters[key]} />
        ) : null,
      )}
      {filters.min_price_usd ? (
        <input type="hidden" name="min_price_usd" value={filters.min_price_usd} />
      ) : null}
      {filters.max_price_usd ? (
        <input type="hidden" name="max_price_usd" value={filters.max_price_usd} />
      ) : null}
      {filters.sort && filters.sort !== defaultSort ? (
        <input type="hidden" name="sort" value={filters.sort} />
      ) : null}
      {filters.direction &&
      filters.direction !== defaultDirectionFor(filters.sort ?? defaultSort) ? (
        <input type="hidden" name="direction" value={filters.direction} />
      ) : null}
    </>
  );
}

function SearchExperienceFallback({ currentPage }: { currentPage: number }) {
  return (
    <div className="container">
      <div className="mb-4 terminal-panel p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="h-3 w-32 animate-pulse rounded-sm bg-secondary/70" />
            <div className="mt-2 h-3 w-56 animate-pulse rounded-sm bg-secondary/70" />
          </div>
          <div className="h-8 w-40 animate-pulse rounded-sm bg-secondary/70" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-sm bg-secondary/70" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-3 terminal-panel p-3">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-secondary/70" />
          <div className="h-10 w-full animate-pulse rounded-sm bg-secondary/70" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 w-full animate-pulse rounded-sm bg-secondary/70" />
          ))}
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between terminal-panel p-3">
            <div>
              <div className="h-3 w-24 animate-pulse rounded-sm bg-secondary/70" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded-sm bg-secondary/70" />
            </div>
          </div>
          <div className="hidden grid-cols-[minmax(220px,1.4fr)_90px_90px_80px_75px_75px_90px_60px] gap-3 border border-border px-3 py-2 md:grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-3 w-14 animate-pulse rounded-sm bg-secondary/70" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="border-x border-b border-border px-3 py-3">
              <div className="h-12 w-full animate-pulse rounded-sm bg-secondary/70" />
            </div>
          ))}
          <div className="mt-8 flex items-center justify-between">
            <div className="border-brutal px-4 py-2 font-mono text-xs tracking-wider opacity-40">PREV</div>
            <div className="font-mono text-xs tracking-widest text-muted-foreground">
              LOADING PAGE {currentPage}...
            </div>
            <div className="border-brutal px-4 py-2 font-mono text-xs tracking-wider opacity-40">NEXT</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchTerminalHeader({
  data,
  query,
  filters,
}: {
  data: WebSearchResponse;
  query: string;
  filters: SearchFilterValues;
}) {
  return (
    <div className="terminal-panel mb-4 overflow-hidden">
      <div className="flex flex-col gap-3 border-b terminal-rule px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-xs font-bold tracking-widest text-primary">
            // CATALOG::QUERY
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold tracking-widest">
          <a
            href={buildSearchCsvHref(data.items)}
            download="cs2cap-search-page.csv"
            className="inline-flex h-10 items-center gap-1 border border-border px-3 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Download className="h-3 w-3" />
            EXPORT CSV
          </a>
          <Link
            href="/api-info"
            className="inline-flex h-10 items-center gap-1 border border-border px-3 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            QUERY API
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <form action="/search" className="grid gap-2 p-3 md:grid-cols-[1fr_auto]">
        <HiddenFilterInputs filters={filters} query={query} />
        <div className="flex min-w-0 items-center border border-border bg-background/80 px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            name="q"
            placeholder="AK-47 Redline, Doppler, M9..."
            defaultValue={query}
            className="min-w-0 flex-1 bg-transparent py-2.5 pl-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="border border-primary bg-primary px-5 py-2.5 font-mono text-xs font-black tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
        >
          SEARCH
        </button>
      </form>
    </div>
  );
}

function FacetList({
  field,
  data,
  query,
  filters,
}: {
  field: FilterField;
  data: WebSearchResponse;
  query: string;
  filters: SearchFilterValues;
}) {
  const currentValue = filters[field.key] ?? "";
  const allOptions = facetOptions(data, field.key, currentValue);
  const maxVisible = FACET_MAX_VISIBLE[field.key] ?? DEFAULT_FACET_MAX;
  const options = allOptions.slice(0, maxVisible);
  const isScrollable = options.length > DEFAULT_FACET_MAX;

  return (
    <div className="border-t terminal-rule pt-3">
      <div className="mb-2 flex items-center justify-between gap-3 font-mono text-xs font-bold tracking-widest">
        <span className="text-muted-foreground">{field.label.toUpperCase()}</span>
        <span className="text-muted-foreground/70">
          {options.length}
          {allOptions.length > options.length ? `/${allOptions.length}` : ""}
        </span>
      </div>
      <div
        className={`space-y-1 ${
          isScrollable ? "terminal-scroll max-h-64 overflow-y-auto pr-1" : ""
        }`}
      >
        {options.map((bucket) => {
          const isActive = currentValue === bucket.value;
          return (
            <Link
              key={bucket.value}
              href={facetHref(query, filters, field.key, isActive ? undefined : bucket.value)}
              scroll={false}
              className={`grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 px-1 py-2 font-mono text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center border text-xs leading-none ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent"
                }`}
                aria-hidden="true"
              >
                X
              </span>
              <span className="truncate">{bucket.value}</span>
              <span className="text-muted-foreground/80">{bucket.count.toLocaleString()}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FilterControls({
  data,
  query,
  filters,
}: {
  data: WebSearchResponse;
  query: string;
  filters: SearchFilterValues;
}) {
  const activeCount =
    FILTER_FIELDS.reduce((count, field) => (filters[field.key] ? count + 1 : count), 0) +
    (filters.min_price_usd ? 1 : 0) +
    (filters.max_price_usd ? 1 : 0);
  const histogramBuckets = (() => {
    const cutoff = 1000;
    const below = data.price_histogram.filter(
      (bucket) => Number(bucket.min_price_usd) < cutoff,
    );
    const aboveCount = data.price_histogram.reduce(
      (sum, bucket) =>
        Number(bucket.min_price_usd) >= cutoff ? sum + bucket.count : sum,
      0,
    );
    if (aboveCount === 0) return below;
    return [
      ...below,
      { min_price_usd: String(cutoff), max_price_usd: null, count: aboveCount },
    ];
  })();
  const maxHistogramCount = Math.max(
    ...histogramBuckets.map((bucket) => bucket.count),
    1,
  );
  const chips = activeChips(query, filters);

  return (
    <aside className="terminal-panel min-w-0 p-3">
      <form action="/search" className="min-w-0 space-y-3">
        {query ? <input type="hidden" name="q" value={query} /> : null}
        {FILTER_FIELDS.map(({ key }) =>
          filters[key] ? (
            <input key={key} type="hidden" name={key} value={filters[key]} />
          ) : null,
        )}

        <div className="grid min-w-0 grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1 font-mono text-xs font-bold tracking-widest text-muted-foreground">
            <span>SORT</span>
            <select
              name="sort"
              defaultValue={filters.sort ?? "rank"}
              className="min-w-0 w-full border border-border bg-background px-2 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 font-mono text-xs font-bold tracking-widest text-muted-foreground">
            <span>DIR</span>
            <select
              name="direction"
              defaultValue={filters.direction ?? "asc"}
              className="min-w-0 w-full border border-border bg-background px-2 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="w-full border border-primary bg-primary px-4 py-2.5 font-mono text-xs font-black tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
        >
          APPLY FILTERS
        </button>

        {activeCount > 0 ? (
          <div className="border-t terminal-rule pt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-bold tracking-widest text-primary">
                {activeCount} FILTERS
              </span>
              <Link
                href={query ? buildSearchHref(query, {}) : "/search"}
                scroll={false}
                className="font-mono text-xs font-bold tracking-widest text-muted-foreground hover:text-foreground"
              >
                CLEAR ALL
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <Link
                  key={`${chip.label}:${chip.href}`}
                  href={chip.href}
                  scroll={false}
                  className="border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-xs font-bold tracking-widest text-primary hover:border-primary"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>
        ) : query ? (
          <div className="border-t terminal-rule pt-3">
            <Link
              href="/search"
              scroll={false}
              className="font-mono text-xs font-bold tracking-widest text-muted-foreground hover:text-foreground"
            >
              CLEAR QUERY
            </Link>
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1 font-mono text-xs font-bold tracking-widest text-muted-foreground">
            <span>MIN USD</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="min_price_usd"
              defaultValue={filters.min_price_usd ?? ""}
              className="min-w-0 w-full border border-border bg-background px-2 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 font-mono text-xs font-bold tracking-widest text-muted-foreground">
            <span>MAX USD</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="max_price_usd"
              defaultValue={filters.max_price_usd ?? ""}
              className="min-w-0 w-full border border-border bg-background px-2 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
        </div>

        {histogramBuckets.length > 0 ? (
          <div>
            <div className="mb-2 font-mono text-xs tracking-widest text-muted-foreground">
              PRICE DIST
            </div>
            <div className="space-y-1">
              {histogramBuckets.map((bucket) => {
                const bucketMin = String(Number(bucket.min_price_usd));
                const bucketMax =
                  bucket.max_price_usd == null
                    ? undefined
                    : String(Number(bucket.max_price_usd));
                const isActive =
                  (filters.min_price_usd ?? "") === bucketMin &&
                  (filters.max_price_usd ?? "") === (bucketMax ?? "");
                const href = buildSearchHref(query, filters, 1, {
                  min_price_usd: isActive ? undefined : bucketMin,
                  max_price_usd: isActive ? undefined : bucketMax,
                });
                return (
                  <Link
                    key={priceBucketLabel(bucket)}
                    href={href}
                    scroll={false}
                    className={`grid min-w-0 grid-cols-[68px_minmax(0,1fr)_42px] items-center gap-2 px-1 py-1 transition-colors sm:grid-cols-[78px_minmax(0,1fr)_42px] ${
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <span className="truncate font-mono text-xs">
                      {priceBucketLabel(bucket)}
                    </span>
                    <span className="h-2 bg-background">
                      <span
                        className={`block h-2 ${isActive ? "bg-accent" : "bg-primary"}`}
                        style={{ width: `${Math.max((bucket.count / maxHistogramCount) * 100, 4)}%` }}
                      />
                    </span>
                    <span className="text-right font-mono text-xs">
                      {bucket.count.toLocaleString()}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {FILTER_FIELDS.map((field) => (
          <FacetList
            key={field.key}
            field={field}
            data={data}
            query={query}
            filters={filters}
          />
        ))}

      </form>
    </aside>
  );
}

function SearchResultsTable({
  data,
  query,
  filters,
  currentPage,
}: {
  data: WebSearchResponse;
  query: string;
  filters: SearchFilterValues;
  currentPage: number;
}) {
  const limit = data.pagination.limit || 24;
  const totalPages = Math.max(Math.ceil(data.pagination.total / limit), 1);
  const hasPrev = data.pagination.has_prev;
  const hasNext = data.pagination.has_next;
  const totalDisplay = data.pagination.total.toLocaleString();
  const pages = paginationPages(currentPage, totalPages);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 terminal-panel px-3 py-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-mono text-xs font-bold tracking-widest text-primary">
            {totalDisplay} VARIANTS
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Showing {resultWindow(data)} · page {currentPage} / {totalPages}
          </div>
        </div>
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          UPDATED {new Date(data.meta.generated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(240px,1.4fr)_88px_88px_72px_72px_82px_52px] gap-3 border border-border bg-card/80 px-3 py-2 font-mono text-xs font-bold tracking-widest text-muted-foreground md:grid">
        <div>ITEM</div>
        <div className="text-right">ASK</div>
        <div className="text-right">BID</div>
        <div className="text-right">24H</div>
        <div className="text-right">7D</div>
        <div className="text-right">VOL 24H</div>
        <div className="text-right">MKTS</div>
      </div>

      {data.items.length === 0 ? (
        <div className="border-x border-b border-border py-20 text-center">
          <div className="font-mono text-sm text-muted-foreground">
            No variants found. Try a different query or relax your filters.
          </div>
        </div>
      ) : (
        data.items.map((item) => (
          <Link
            key={item.item_id}
            href={buildItemPath(item.item_id, item.market_hash_name)}
            className="block border-x border-b border-border bg-background/40 px-3 py-4 transition-colors hover:bg-card/60"
          >
            <div className="md:grid md:grid-cols-[minmax(240px,1.4fr)_88px_88px_72px_72px_82px_52px] md:items-center md:gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-border bg-secondary/50">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.market_hash_name}
                      width={56}
                      height={56}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="h-4 w-4 bg-primary/30" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-bold text-foreground md:hover:text-primary">
                    {stripWearSuffix(item.market_hash_name)}
                  </div>
                  <div className="truncate font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {item.rank ? `#${item.rank} · ` : ""}{itemSubtitle(item)}
                  </div>
                </div>
                <div className="ml-auto font-mono text-sm font-bold text-foreground md:hidden">
                  {formatUsdMajor(item.best_ask_usd)}
                </div>
              </div>

              <div className="hidden font-mono text-sm font-bold text-foreground md:block md:text-right">
                {formatUsdMajor(item.best_ask_usd)}
              </div>
              <div className="hidden font-mono text-sm text-muted-foreground md:block md:text-right">
                {formatUsdMajor(item.best_bid_usd)}
              </div>
              <div className={`hidden font-mono text-sm font-bold md:block md:text-right ${priceChangeClass(item.price_rate_24h)}`}>
                {formatSignedPercent(item.price_rate_24h)}
              </div>
              <div className={`hidden font-mono text-sm font-bold md:block md:text-right ${priceChangeClass(item.price_rate_7d)}`}>
                {formatSignedPercent(item.price_rate_7d)}
              </div>
              <div className="hidden font-mono text-sm text-muted-foreground md:block md:text-right">
                {formatWholeNumber(item.sales_1d)}
              </div>
              <div className="hidden font-mono text-sm text-muted-foreground md:block md:text-right">
                {item.provider_count}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-3 md:hidden">
              <div>
                <div className="font-mono text-xs tracking-widest text-muted-foreground">BID</div>
                <div className="font-mono text-sm text-muted-foreground">
                  {formatUsdMajor(item.best_bid_usd)}
                </div>
              </div>
              <div>
                <div className="font-mono text-xs tracking-widest text-muted-foreground">24H</div>
                <div className={`font-mono text-sm font-bold ${priceChangeClass(item.price_rate_24h)}`}>
                  {formatSignedPercent(item.price_rate_24h)}
                </div>
              </div>
              <div>
                <div className="font-mono text-xs tracking-widest text-muted-foreground">7D</div>
                <div className={`font-mono text-sm font-bold ${priceChangeClass(item.price_rate_7d)}`}>
                  {formatSignedPercent(item.price_rate_7d)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs tracking-widest text-muted-foreground">MKTS</div>
                <div className="font-mono text-sm text-muted-foreground">{item.provider_count}</div>
              </div>
            </div>
          </Link>
        ))
      )}

      <div className="mt-4 flex flex-col gap-3 terminal-panel px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Showing {resultWindow(data)} of {totalDisplay} · page {currentPage} / {totalPages}
        </div>
        <div className="flex flex-wrap items-center gap-1 font-mono text-xs font-bold tracking-widest">
        <Link
          href={hasPrev ? buildSearchHref(query, filters, 1) : "#"}
          prefetch={hasPrev}
          className={`border border-border px-3 py-2.5 ${
            hasPrev
              ? "text-muted-foreground hover:border-primary hover:text-foreground"
              : "pointer-events-none opacity-40"
          }`}
        >
          FIRST
        </Link>
        <Link
          href={hasPrev ? buildSearchHref(query, filters, currentPage - 1) : "#"}
          prefetch={hasPrev}
          className={`border border-border px-3 py-2.5 ${
            hasPrev
              ? "text-muted-foreground hover:border-primary hover:text-foreground"
              : "pointer-events-none opacity-40"
          }`}
        >
          PREV
        </Link>
        {pages.map((page) => (
          <Link
            key={page}
            href={buildSearchHref(query, filters, page)}
            prefetch={page === currentPage}
            className={`border px-3 py-2.5 ${
              page === currentPage
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {page}
          </Link>
        ))}
        <Link
          href={hasNext ? buildSearchHref(query, filters, currentPage + 1) : "#"}
          prefetch={hasNext}
          className={`border border-border px-3 py-2.5 ${
            hasNext
              ? "text-muted-foreground hover:border-primary hover:text-foreground"
              : "pointer-events-none opacity-40"
          }`}
        >
          NEXT
        </Link>
        <Link
          href={hasNext ? buildSearchHref(query, filters, totalPages) : "#"}
          prefetch={false}
          className={`border border-border px-3 py-2.5 ${
            hasNext
              ? "text-muted-foreground hover:border-primary hover:text-foreground"
              : "pointer-events-none opacity-40"
          }`}
        >
          LAST
        </Link>
        </div>
      </div>
    </div>
  );
}

async function SearchExperience({
  query,
  filters,
  currentPage,
}: {
  query: string;
  filters: SearchFilterValues;
  currentPage: number;
}) {
  const data = await getSearchPageData({
    q: query,
    filters,
    page: currentPage,
  });

  const snapshot = buildPendingSnapshot(query, filters, currentPage);

  return (
    <div className="container">
      <SearchTerminalHeader data={data} query={query} filters={filters} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <FilterControls data={data} query={query} filters={filters} />
        <div className="min-w-0">
          <PendingResults snapshot={snapshot}>
            <SearchResultsTable data={data} query={query} filters={filters} currentPage={currentPage} />
          </PendingResults>
        </div>
      </div>
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const query = clean(resolved.q) ?? "";
  const sort = sanitizeSort(resolved.sort, query);
  const filters: SearchFilterValues = {
    item_type: clean(resolved.item_type),
    base_name: clean(resolved.base_name) ?? clean(resolved.weapon_type),
    wear_name: clean(resolved.wear_name),
    rarity_name: clean(resolved.rarity_name),
    collection: clean(resolved.collection),
    phase: clean(resolved.phase),
    min_price_usd: clean(resolved.min_price_usd),
    max_price_usd: clean(resolved.max_price_usd),
    sort,
    direction: sanitizeDirection(resolved.direction, sort),
  };
  const page = Number.parseInt(clean(resolved.page) ?? "1", 10);
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;

  return (
    <>
      <section className="terminal-page border-b border-border py-4 md:py-5">
        <Suspense fallback={<SearchExperienceFallback currentPage={currentPage} />}>
          <SearchExperience query={query} filters={filters} currentPage={currentPage} />
        </Suspense>
      </section>

      <FooterSection />
    </>
  );
}
