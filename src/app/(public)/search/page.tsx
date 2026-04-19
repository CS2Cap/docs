import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { getSearchPageData, type SearchFilterValues } from "@/lib/api/compositions";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    item_type?: string;
    item_subtype?: string;
    weapon_type?: string;
    wear_name?: string;
    rarity_name?: string;
    collection?: string;
    page?: string;
  }>;
};

const FILTER_FIELDS: Array<{
  key: keyof SearchFilterValues;
  label: string;
  metadataKey:
    | "item_type"
    | "item_subtype"
    | "weapon_type"
    | "wear_name"
    | "rarity_name"
    | "collection";
}> = [
  { key: "item_type", label: "Type", metadataKey: "item_type" },
  { key: "item_subtype", label: "Category", metadataKey: "item_subtype" },
  { key: "weapon_type", label: "Weapon", metadataKey: "weapon_type" },
  { key: "wear_name", label: "Wear", metadataKey: "wear_name" },
  { key: "rarity_name", label: "Rarity", metadataKey: "rarity_name" },
  { key: "collection", label: "Collection", metadataKey: "collection" },
];

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

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `/search?${search}` : "/search";
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

function SearchResultsFallback({ currentPage }: { currentPage: number }) {
  return (
    <div className="container">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="h-3 w-24 animate-pulse rounded-sm bg-secondary/70" />
          <div className="mt-2 h-3 w-32 animate-pulse rounded-sm bg-secondary/70" />
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(0,1.5fr)_140px_110px_120px] gap-4 border-b-2 border-border px-4 py-2 md:grid">
        <div className="h-3 w-16 animate-pulse rounded-sm bg-secondary/70" />
        <div className="h-3 w-12 animate-pulse justify-self-end rounded-sm bg-secondary/70" />
        <div className="h-3 w-10 animate-pulse justify-self-end rounded-sm bg-secondary/70" />
        <div className="h-3 w-14 animate-pulse justify-self-end rounded-sm bg-secondary/70" />
      </div>

      <div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="border-b border-border px-4 py-4">
            <div className="md:grid md:grid-cols-[minmax(0,1.5fr)_140px_110px_120px] md:items-center md:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-12 animate-pulse rounded-sm bg-secondary/70" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-full max-w-md animate-pulse rounded-sm bg-secondary/70" />
                  <div className="mt-2 h-3 w-40 animate-pulse rounded-sm bg-secondary/70" />
                </div>
                <div className="h-4 w-16 animate-pulse rounded-sm bg-secondary/70 md:hidden" />
              </div>

              <div className="mt-3 hidden h-4 w-16 animate-pulse justify-self-end rounded-sm bg-secondary/70 md:block md:mt-0" />
              <div className="mt-3 hidden h-4 w-12 animate-pulse justify-self-end rounded-sm bg-secondary/70 md:block md:mt-0" />
              <div className="mt-3 hidden h-4 w-14 animate-pulse justify-self-end rounded-sm bg-secondary/70 md:block md:mt-0" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="border-brutal px-4 py-2 font-mono text-xs tracking-wider opacity-40">PREV</div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
          LOADING PAGE {currentPage}...
        </div>
        <div className="border-brutal px-4 py-2 font-mono text-xs tracking-wider opacity-40">NEXT</div>
      </div>
    </div>
  );
}

async function SearchResultsSection({
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

  const totalPages = data.pagination ? Math.max(Math.ceil(data.pagination.total / 24), 1) : 1;
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="container">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-primary">
            {data.pagination?.total.toLocaleString() ?? 0} MATCHES
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Showing page {currentPage} of {totalPages}
          </div>
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(0,1.5fr)_140px_110px_120px] gap-4 border-b-2 border-border px-4 py-2 font-mono text-[10px] tracking-widest text-muted-foreground md:grid">
        <div>ITEM</div>
        <div className="text-right">PRICE</div>
        <div className="text-right">24H</div>
        <div className="text-right">VOLUME</div>
      </div>

      {data.results.length === 0 ? (
        <div className="py-20 text-center">
          <div className="font-mono text-sm text-muted-foreground">
            No skins found for that search. Try a different name or relax your filters.
          </div>
        </div>
      ) : (
        data.results.map(({ item, priceUsd, priceChange24hPct, volume24h }) => (
          <Link
            key={item.item_id ?? item.market_hash_name}
            href={item.item_id ? `/item/${item.item_id}` : "/search"}
            className="block border-b border-border px-4 py-4 transition-colors hover:bg-card/40"
          >
            <div className="md:grid md:grid-cols-[minmax(0,1.5fr)_140px_110px_120px] md:items-center md:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border-brutal bg-secondary/50">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.market_hash_name}
                      width={48}
                      height={48}
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
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {[item.wear_name, item.rarity_name, item.collection].filter(Boolean).join(" • ") ||
                      "Catalog item"}
                  </div>
                </div>
                <div className="ml-auto font-mono text-sm font-bold text-foreground md:hidden">
                  {formatUsdMajor(priceUsd)}
                </div>
              </div>

              <div className="hidden font-mono text-sm font-bold text-foreground md:block md:text-right">
                {formatUsdMajor(priceUsd)}
              </div>

              <div
                className={`hidden font-mono text-sm font-bold md:block md:text-right ${priceChangeClass(
                  priceChange24hPct,
                )}`}
              >
                {formatSignedPercent(priceChange24hPct)}
              </div>

              <div className="hidden font-mono text-sm text-muted-foreground md:block md:text-right">
                {formatWholeNumber(volume24h)}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4 md:hidden">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  24H
                </div>
                <div className={`font-mono text-sm font-bold ${priceChangeClass(priceChange24hPct)}`}>
                  {formatSignedPercent(priceChange24hPct)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  VOLUME
                </div>
                <div className="font-mono text-sm text-muted-foreground">
                  {formatWholeNumber(volume24h)}
                </div>
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

async function FilterControls({
  query,
  filters,
}: {
  query: string;
  filters: SearchFilterValues;
}) {
  // Fetch metadata for option lists. This is cached via getSearchPageData too,
  // but rendering the form needs the option arrays directly.
  const data = await getSearchPageData({ q: query, filters, page: 1 });
  const meta = data.metadata?.filters;

  const activeCount = FILTER_FIELDS.reduce(
    (count, field) => (filters[field.key] ? count + 1 : count),
    0,
  );

  return (
    <form action="/search" className="space-y-4">
      {/* Preserve query in form submission */}
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-3 border-brutal bg-card px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            name="q"
            placeholder="Search skins, knives, gloves..."
            defaultValue={query}
            className="w-full bg-transparent py-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="border-2 border-primary bg-primary px-6 py-3 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover"
        >
          SEARCH
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {FILTER_FIELDS.map((field) => {
          const rawOptions = meta?.[field.metadataKey] ?? [];
          const sortedKeys: Array<keyof SearchFilterValues> = [
            "item_type",
            "item_subtype",
            "weapon_type",
          ];
          const options = sortedKeys.includes(field.key)
            ? [...rawOptions].sort((a, b) => a.localeCompare(b))
            : rawOptions;
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
                className="border-brutal bg-card px-3 py-2 font-mono text-sm text-foreground outline-none"
              >
                <option value="">All</option>
                {options.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {activeCount > 0 ? (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-widest text-primary">
            {activeCount} ACTIVE FILTER{activeCount === 1 ? "" : "S"}
          </span>
          <Link
            href={buildSearchHref(query, {})}
            className="border-brutal px-3 py-1 font-mono text-[10px] tracking-widest text-muted-foreground hover:border-primary hover:text-foreground"
          >
            CLEAR
          </Link>
        </div>
      ) : null}
    </form>
  );
}

function FilterControlsFallback() {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <div className="h-12 w-full animate-pulse rounded-sm bg-secondary/70" />
        <div className="h-12 w-full animate-pulse rounded-sm bg-secondary/70 md:w-32" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-14 w-full animate-pulse rounded-sm bg-secondary/70" />
        ))}
      </div>
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const query = resolved.q?.trim() ?? "";
  const filters: SearchFilterValues = {
    item_type: resolved.item_type?.trim() || undefined,
    item_subtype: resolved.item_subtype?.trim() || undefined,
    weapon_type: resolved.weapon_type?.trim() || undefined,
    wear_name: resolved.wear_name?.trim() || undefined,
    rarity_name: resolved.rarity_name?.trim() || undefined,
    collection: resolved.collection?.trim() || undefined,
  };
  const page = Number.parseInt(resolved.page ?? "1", 10);
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;

  const filterKey = [
    query,
    filters.item_type ?? "",
    filters.item_subtype ?? "",
    filters.weapon_type ?? "",
    filters.wear_name ?? "",
    filters.rarity_name ?? "",
    filters.collection ?? "",
  ].join("|");

  return (
    <>
      <section className="border-b-2 border-border bg-grid py-12">
        <div className="container">
          <div className="mb-4 font-mono text-xs tracking-widest text-primary">// SEARCH</div>
          <h1 className="mb-4 text-4xl font-black tracking-tighter md:text-5xl">
            FIND <span className="text-gradient-brand">ANY SKIN</span>
          </h1>
          <p className="mb-6 max-w-2xl font-mono text-sm text-muted-foreground">
            Search every skin in the catalog and filter by type, weapon, wear, rarity and more.
          </p>

          <Suspense key={`controls:${filterKey}`} fallback={<FilterControlsFallback />}>
            <FilterControls query={query} filters={filters} />
          </Suspense>
        </div>
      </section>

      <section className="py-8">
        <Suspense key={`results:${filterKey}:${currentPage}`} fallback={<SearchResultsFallback currentPage={currentPage} />}>
          <SearchResultsSection query={query} filters={filters} currentPage={currentPage} />
        </Suspense>
      </section>

      <FooterSection />
    </>
  );
}
