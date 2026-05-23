import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
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

type SearchParams = {
  q?: string | string[];
  item_type?: string | string[];
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
    "item_type" | "weapon_type" | "wear_name" | "rarity_name" | "collection" | "phase"
  >;
  label: string;
};

const SEARCH_CANONICAL_PARAMS = [
  "q",
  "item_type",
  "weapon_type",
  "wear_name",
  "rarity_name",
  "collection",
  "phase",
] as const;

const FILTER_FIELDS: FilterField[] = [
  { key: "item_type", label: "Type" },
  { key: "weapon_type", label: "Weapon" },
  { key: "rarity_name", label: "Rarity" },
  { key: "wear_name", label: "Wear" },
  { key: "phase", label: "Phase" },
  { key: "collection", label: "Collection" },
];

const SORT_OPTIONS: Array<{ value: WebSearchSort; label: string }> = [
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

function sanitizeSort(value: string | string[] | undefined): WebSearchSort {
  const normalized = clean(value);
  return SORT_OPTIONS.some((option) => option.value === normalized)
    ? (normalized as WebSearchSort)
    : "rank";
}

function sanitizeDirection(value: string | string[] | undefined): WebSearchDirection {
  return clean(value) === "desc" ? "desc" : "asc";
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
  if (merged.sort && merged.sort !== "rank") {
    params.set("sort", merged.sort);
  }
  if (merged.direction && merged.direction !== "asc") {
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
  const weaponType = clean(resolved.weapon_type);
  const wearName = clean(resolved.wear_name);
  const rarityName = clean(resolved.rarity_name);
  const collection = clean(resolved.collection);
  const phase = clean(resolved.phase);

  const titleParts: string[] = [];
  if (q) titleParts.push(titleCase(q));
  if (weaponType) titleParts.push(weaponType);
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
  const hasFilter = Boolean(
    q || itemType || weaponType || wearName || rarityName || collection || phase,
  );
  const canonical = buildCanonicalSearchPath({
    q,
    item_type: itemType,
    weapon_type: weaponType,
    wear_name: wearName,
    rarity_name: rarityName,
    collection,
    phase,
  });

  return {
    title,
    description,
    alternates: { canonical },
    robots: hasFilter
      ? { index: true, follow: true }
      : { index: false, follow: true },
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

function itemSubtitle(item: WebSearchItem) {
  return [
    item.wear_name,
    item.phase,
    item.rarity_name,
    item.collection,
  ]
    .filter(Boolean)
    .join(" / ") || "Catalog item";
}

function facetOptions(data: WebSearchResponse, key: FilterField["key"], currentValue?: string) {
  const buckets = data.facets[key] as WebSearchFacetBucket[];
  if (!currentValue || buckets.some((bucket) => bucket.value === currentValue)) {
    return buckets;
  }

  return [{ value: currentValue, count: 0 }, ...buckets];
}

function priceBucketLabel(bucket: WebSearchResponse["price_histogram"][number]) {
  const min = Number(bucket.min_price_usd);
  const max = bucket.max_price_usd == null ? null : Number(bucket.max_price_usd);
  const minLabel = Number.isFinite(min) ? `$${min.toLocaleString()}` : "$0";
  const maxLabel = max != null && Number.isFinite(max) ? `$${max.toLocaleString()}` : "+";
  return `${minLabel}-${maxLabel}`;
}

function SearchExperienceFallback({ currentPage }: { currentPage: number }) {
  return (
    <div className="container">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3 border-brutal bg-card p-4">
          <div className="h-4 w-24 animate-pulse rounded-sm bg-secondary/70" />
          <div className="h-12 w-full animate-pulse rounded-sm bg-secondary/70" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 w-full animate-pulse rounded-sm bg-secondary/70" />
          ))}
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="h-3 w-24 animate-pulse rounded-sm bg-secondary/70" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded-sm bg-secondary/70" />
            </div>
          </div>
          <div className="hidden grid-cols-[minmax(220px,1.4fr)_90px_90px_80px_75px_75px_90px_60px] gap-3 border-b-2 border-border px-4 py-3 md:grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-3 w-14 animate-pulse rounded-sm bg-secondary/70" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="border-b border-border px-4 py-4">
              <div className="h-12 w-full animate-pulse rounded-sm bg-secondary/70" />
            </div>
          ))}
          <div className="mt-8 flex items-center justify-between">
            <div className="border-brutal px-4 py-2 font-mono text-xs tracking-wider opacity-40">PREV</div>
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
              LOADING PAGE {currentPage}...
            </div>
            <div className="border-brutal px-4 py-2 font-mono text-xs tracking-wider opacity-40">NEXT</div>
          </div>
        </div>
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
  const maxHistogramCount = Math.max(
    ...data.price_histogram.map((bucket) => bucket.count),
    1,
  );

  return (
    <aside className="border-brutal bg-card p-4">
      <form action="/search" className="space-y-4">
        <div>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-primary">QUERY</div>
          <div className="flex items-center gap-3 border-brutal bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              name="q"
              placeholder="AK-47 Redline..."
              defaultValue={query}
              className="min-w-0 flex-1 bg-transparent py-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            <span>MIN USD</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="min_price_usd"
              defaultValue={filters.min_price_usd ?? ""}
              className="w-full border-brutal bg-background px-3 py-2 font-mono text-sm text-foreground outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            <span>MAX USD</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="max_price_usd"
              defaultValue={filters.max_price_usd ?? ""}
              className="w-full border-brutal bg-background px-3 py-2 font-mono text-sm text-foreground outline-none"
            />
          </label>
        </div>

        {data.price_histogram.length > 0 ? (
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground">
              PRICE DIST
            </div>
            <div className="space-y-1">
              {data.price_histogram.slice(0, 8).map((bucket) => (
                <div key={priceBucketLabel(bucket)} className="grid grid-cols-[68px_1fr_34px] items-center gap-2">
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {priceBucketLabel(bucket)}
                  </div>
                  <div className="h-2 bg-background">
                    <div
                      className="h-2 bg-primary"
                      style={{ width: `${Math.max((bucket.count / maxHistogramCount) * 100, 4)}%` }}
                    />
                  </div>
                  <div className="text-right font-mono text-[10px] text-muted-foreground">
                    {bucket.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {FILTER_FIELDS.map((field) => {
          const options = facetOptions(data, field.key, filters[field.key]);
          const currentValue = filters[field.key] ?? "";

          return (
            <label
              key={field.key}
              className="flex flex-col gap-1 font-mono text-[10px] tracking-widest text-muted-foreground"
            >
              <span>{field.label.toUpperCase()}</span>
              <select
                name={field.key}
                defaultValue={currentValue}
                className="w-full border-brutal bg-background px-3 py-2 font-mono text-sm text-foreground outline-none"
              >
                <option value="">All</option>
                {options.map((bucket) => (
                  <option key={bucket.value} value={bucket.value}>
                    {bucket.value} ({bucket.count})
                  </option>
                ))}
              </select>
            </label>
          );
        })}

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            <span>SORT</span>
            <select
              name="sort"
              defaultValue={filters.sort ?? "rank"}
              className="w-full border-brutal bg-background px-3 py-2 font-mono text-sm text-foreground outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-mono text-[10px] tracking-widest text-muted-foreground">
            <span>DIR</span>
            <select
              name="direction"
              defaultValue={filters.direction ?? "asc"}
              className="w-full border-brutal bg-background px-3 py-2 font-mono text-sm text-foreground outline-none"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="w-full border-2 border-primary bg-primary px-4 py-3 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover"
        >
          APPLY
        </button>

        {activeCount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] tracking-widest text-primary">
              {activeCount} ACTIVE
            </span>
            <Link
              href={query ? buildSearchHref(query, {}) : "/search"}
              className="border-brutal px-3 py-1 font-mono text-[10px] tracking-widest text-muted-foreground hover:border-primary hover:text-foreground"
            >
              CLEAR
            </Link>
          </div>
        ) : null}
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

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-primary">
            {totalDisplay} VARIANTS
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Page {currentPage} / {totalPages} - {data.meta.data_source} snapshot
          </div>
        </div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
          UPDATED {new Date(data.meta.generated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(220px,1.4fr)_90px_90px_80px_75px_75px_90px_60px] gap-3 border-b-2 border-border px-4 py-3 font-mono text-[10px] tracking-widest text-muted-foreground md:grid">
        <div>ITEM</div>
        <div className="text-right">ASK</div>
        <div className="text-right">BID</div>
        <div className="text-right">SPREAD</div>
        <div className="text-right">24H</div>
        <div className="text-right">7D</div>
        <div className="text-right">VOL 24H</div>
        <div className="text-right">MKTS</div>
      </div>

      {data.items.length === 0 ? (
        <div className="border-b border-border py-20 text-center">
          <div className="font-mono text-sm text-muted-foreground">
            No variants found. Try a different query or relax your filters.
          </div>
        </div>
      ) : (
        data.items.map((item) => (
          <Link
            key={item.item_id}
            href={buildItemPath(item.item_id, item.market_hash_name)}
            className="block border-b border-border px-4 py-4 transition-colors hover:bg-card/40"
          >
            <div className="md:grid md:grid-cols-[minmax(220px,1.4fr)_90px_90px_80px_75px_75px_90px_60px] md:items-center md:gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-brutal bg-secondary/50">
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
                    {item.market_hash_name}
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {itemSubtitle(item)}
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
              <div className="hidden font-mono text-sm text-muted-foreground md:block md:text-right">
                {formatSignedPercent(item.avg_spread_pct)}
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

            <div className="mt-3 grid grid-cols-3 gap-3 md:hidden">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground">BID</div>
                <div className="font-mono text-sm text-muted-foreground">
                  {formatUsdMajor(item.best_bid_usd)}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground">24H</div>
                <div className={`font-mono text-sm font-bold ${priceChangeClass(item.price_rate_24h)}`}>
                  {formatSignedPercent(item.price_rate_24h)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground">MKTS</div>
                <div className="font-mono text-sm text-muted-foreground">{item.provider_count}</div>
              </div>
            </div>
          </Link>
        ))
      )}

      <div className="mt-8 flex items-center justify-between">
        <Link
          href={hasPrev ? buildSearchHref(query, filters, currentPage - 1) : "#"}
          prefetch={hasPrev}
          className={`border-brutal px-4 py-2 font-mono text-xs tracking-wider ${
            hasPrev
              ? "text-foreground brutalist-hover hover:border-primary"
              : "pointer-events-none opacity-40"
          }`}
        >
          PREV
        </Link>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
          PAGE {currentPage} / {totalPages}
        </div>
        <Link
          href={hasNext ? buildSearchHref(query, filters, currentPage + 1) : "#"}
          prefetch={hasNext}
          className={`border-brutal px-4 py-2 font-mono text-xs tracking-wider ${
            hasNext
              ? "text-foreground brutalist-hover hover:border-primary"
              : "pointer-events-none opacity-40"
          }`}
        >
          NEXT
        </Link>
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

  return (
    <div className="container">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <FilterControls data={data} query={query} filters={filters} />
        <SearchResultsTable data={data} query={query} filters={filters} currentPage={currentPage} />
      </div>
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const query = clean(resolved.q) ?? "";
  const filters: SearchFilterValues = {
    item_type: clean(resolved.item_type),
    weapon_type: clean(resolved.weapon_type),
    wear_name: clean(resolved.wear_name),
    rarity_name: clean(resolved.rarity_name),
    collection: clean(resolved.collection),
    phase: clean(resolved.phase),
    min_price_usd: clean(resolved.min_price_usd),
    max_price_usd: clean(resolved.max_price_usd),
    sort: sanitizeSort(resolved.sort),
    direction: sanitizeDirection(resolved.direction),
  };
  const page = Number.parseInt(clean(resolved.page) ?? "1", 10);
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;

  const filterKey = [
    query,
    filters.item_type ?? "",
    filters.weapon_type ?? "",
    filters.wear_name ?? "",
    filters.rarity_name ?? "",
    filters.collection ?? "",
    filters.phase ?? "",
    filters.min_price_usd ?? "",
    filters.max_price_usd ?? "",
    filters.sort ?? "",
    filters.direction ?? "",
  ].join("|");

  return (
    <>
      <section className="border-b-2 border-border bg-grid py-10">
        <div className="container">
          <div className="mb-3 font-mono text-xs tracking-widest text-primary">// SEARCH::V2</div>
          <h1 className="mb-3 text-4xl font-black tracking-tighter md:text-5xl">
            MARKET <span className="text-gradient-brand">SEARCH</span>
          </h1>
          <p className="max-w-2xl font-mono text-sm text-muted-foreground">
            Flat variant search with live asks, bids, movement, liquidity, and sidebar facets.
          </p>
        </div>
      </section>

      <section className="py-8">
        <Suspense
          key={`search:${filterKey}:${currentPage}`}
          fallback={<SearchExperienceFallback currentPage={currentPage} />}
        >
          <SearchExperience query={query} filters={filters} currentPage={currentPage} />
        </Suspense>
      </section>

      <FooterSection />
    </>
  );
}
