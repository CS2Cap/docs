import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { getSearchPageData } from "@/lib/api/compositions";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
  }>;
};

const SEARCH_CATEGORIES = ["All", "Rifles", "Pistols", "Knives", "Gloves", "SMGs", "Heavy"];

function buildSearchHref(query: string, category: string, page = 1) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (category && category !== "All") {
    params.set("category", category);
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

            <div className="mt-3 grid grid-cols-2 gap-4 md:hidden">
              <div>
                <div className="h-3 w-10 animate-pulse rounded-sm bg-secondary/70" />
                <div className="mt-2 h-4 w-14 animate-pulse rounded-sm bg-secondary/70" />
              </div>
              <div className="text-right">
                <div className="ml-auto h-3 w-12 animate-pulse rounded-sm bg-secondary/70" />
                <div className="mt-2 ml-auto h-4 w-16 animate-pulse rounded-sm bg-secondary/70" />
              </div>
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
  category,
  currentPage,
}: {
  query: string;
  category: string;
  currentPage: number;
}) {
  const data = await getSearchPageData({
    q: query,
    category,
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
            No skins found for that search. Try a different name or category.
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
          href={hasPrev ? buildSearchHref(query, category, currentPage - 1) : "#"}
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
          href={hasNext ? buildSearchHref(query, category, currentPage + 1) : "#"}
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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;
  const query = resolved.q?.trim() ?? "";
  const category = resolved.category?.trim() || "All";
  const page = Number.parseInt(resolved.page ?? "1", 10);
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;

  return (
    <>
      <section className="border-b-2 border-border bg-grid py-12">
        <div className="container">
          <div className="mb-4 font-mono text-xs tracking-widest text-primary">// SEARCH</div>
          <h1 className="mb-4 text-4xl font-black tracking-tighter md:text-5xl">
            FIND <span className="text-gradient-brand">ANY SKIN</span>
          </h1>
          <p className="mb-6 max-w-2xl font-mono text-sm text-muted-foreground">
            Search every skin in the catalog and see the best current price across all connected markets.
          </p>

          <form action="/search" className="mb-6 grid gap-2 md:grid-cols-[1fr_220px_auto]">
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
            <div className="flex items-center gap-3 border-brutal bg-card px-4">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
              <select
                name="category"
                defaultValue={category}
                className="w-full bg-transparent py-3 font-mono text-sm text-foreground outline-none"
              >
                {SEARCH_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="border-2 border-primary bg-primary px-6 py-3 font-mono text-sm font-bold tracking-wider text-primary-foreground brutalist-hover"
            >
              SEARCH
            </button>
          </form>

          <div className="flex flex-wrap gap-px bg-border">
            {SEARCH_CATEGORIES.map((value) => (
              <Link
                key={value}
                href={buildSearchHref(query, value)}
                prefetch
                className={`px-4 py-2 font-mono text-[10px] tracking-wider transition-colors ${
                  category === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {value.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8">
        <Suspense key={`${query}:${category}:${currentPage}`} fallback={<SearchResultsFallback currentPage={currentPage} />}>
          <SearchResultsSection query={query} category={category} currentPage={currentPage} />
        </Suspense>
      </section>

      <FooterSection />
    </>
  );
}
