import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { WatchItemButton } from "@/components/WatchItemButton";
import { CollapsibleAsksList } from "@/components/item/CollapsibleAsksList";
import {
  formatPriceMinor,
  getProvider,
  providerLabel,
  rarityColor,
} from "@/lib/api";
import { getItemDetailPageCoreData } from "@/lib/api/compositions";
import {
  ItemConditionVariants,
  ItemConditionVariantsFallback,
  ItemMarketInsightsFallback,
  ItemMarketInsightsSection,
  ItemPriceHistoryFallback,
  ItemPriceHistorySection,
  ItemRecentSalesFallback,
  ItemRecentSalesSection,
  ItemRelatedItemsFallback,
  ItemRelatedItemsSection,
} from "./ItemDetailDeferredSections";

type ItemPageProps = {
  params: Promise<{
    itemId: string;
  }>;
};

function formatNumber(value?: number | null) {
  if (value == null) {
    return "N/A";
  }

  return value.toLocaleString();
}

function normalizeHexColor(value?: string | null): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized}`;
  }

  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`;
  }

  return null;
}

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const { itemId } = await params;
  const numericItemId = Number.parseInt(itemId, 10);

  if (!Number.isFinite(numericItemId)) {
    notFound();
  }

  const data = await getItemDetailPageCoreData(numericItemId);
  if (!data) {
    notFound();
  }

  const askRows = [...(data.prices?.items ?? [])].sort(
    (left, right) => left.lowest_ask - right.lowest_ask,
  );
  const bidRows = [...(data.bids?.items ?? [])].sort(
    (left, right) => right.highest_bid - left.highest_bid,
  );
  const rarityClass = rarityColor(data.item.rarity_name);
  const rarityHex = normalizeHexColor(data.item.rarity_color);
  const rarityBadgeStyle = rarityHex
    ? {
        color: rarityHex,
        borderColor: `${rarityHex}33`,
        backgroundColor: `${rarityHex}1a`,
      }
    : undefined;

  const itemFacts = [
    { label: "Weapon", value: data.item.weapon_type },
    { label: "Category", value: data.item.item_subtype },
    { label: "Type", value: data.item.item_type },
    { label: "Collection", value: data.item.collection },
    { label: "Finish Style", value: data.item.style_name },
    { label: "Phase", value: data.item.phase },
  ].filter((entry) => entry.value);

  const bestAskProvider = data.bestAsk ? getProvider(data.bestAsk.provider, data.providers) : null;

  return (
    <>
      <section className="border-b-2 border-border bg-secondary/20 py-3">
        <div className="container flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <span>/</span>
          <Link href="/search" className="transition-colors hover:text-primary">
            Search
          </Link>
          <span>/</span>
          <span className="text-foreground">{data.item.market_hash_name}</span>
        </div>
      </section>

      <section className="py-6">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-4 xl:col-span-3">
              <div className="border-brutal bg-card">
                <div className="px-4 pt-4 pb-2">
                  <span
                    className={`inline-flex border px-2 py-0.5 font-mono text-[10px] tracking-wider ${rarityClass}`}
                    style={rarityBadgeStyle}
                  >
                    {data.item.rarity_name ?? "Item"}
                  </span>
                </div>

                <div className="px-4 pb-4">
                  <div className="aspect-square overflow-hidden border-brutal bg-secondary/50">
                    {data.item.image_url ? (
                      <Image
                        src={data.item.image_url}
                        alt={data.item.market_hash_name}
                        width={512}
                        height={512}
                        className="h-full w-full object-contain p-6"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        ITEM PREVIEW
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <h1 className="text-xl font-black tracking-tighter">
                    {data.item.market_hash_name}
                  </h1>
                  {data.item.wear_name ? (
                    <div className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                      {data.item.wear_name}
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-mono text-[9px] tracking-widest text-muted-foreground">
                        LOWEST ASK
                      </div>
                      <div className="font-mono text-sm font-bold text-success">
                        {formatPriceMinor(data.bestAsk?.lowest_ask)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] tracking-widest text-muted-foreground">
                        HIGHEST BID
                      </div>
                      <div className="font-mono text-sm font-bold text-foreground">
                        {formatPriceMinor(data.bestBid?.highest_bid)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-mono text-[9px] tracking-widest text-muted-foreground">
                        MARKETS WITH ASKS
                      </div>
                      <div className="font-mono text-sm font-bold text-foreground">
                        {data.coverage.askProviders}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] tracking-widest text-muted-foreground">
                        BEST ASK AT
                      </div>
                      <div className="text-sm font-bold text-primary">
                        {data.bestAsk ? (
                          <ProviderIdentity
                            provider={bestAskProvider}
                            fallback={providerLabel(data.bestAsk.provider, data.providers)}
                            logoSize={16}
                            textClassName="font-mono text-sm font-bold text-primary"
                          />
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <WatchItemButton itemId={numericItemId} />
                    <Link
                      href={`/alerts?itemId=${numericItemId}`}
                      className="flex items-center justify-center gap-1.5 border-brutal px-3 py-2 font-mono text-[10px] tracking-wider brutalist-hover"
                    >
                      <Bell className="h-3 w-3" />
                      ALERT
                    </Link>
                  </div>
                </div>
              </div>

              <div className="border-brutal bg-card p-4">
                <div className="mb-3 font-mono text-[10px] tracking-widest text-primary">
                  FLOAT RANGE
                </div>
                <div className="mb-3 h-2 bg-linear-to-r from-success via-warning to-destructive" />
                <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
                  <span>{data.item.min_float?.toFixed(2) ?? "N/A"}</span>
                  <span>{data.item.max_float?.toFixed(2) ?? "N/A"}</span>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-px bg-border">
                  {["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"].map(
                    (wear) => (
                      <div
                        key={wear}
                        className={`px-2 py-1 text-center font-mono text-[9px] ${
                          data.item.wear_name === wear
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {wear
                          .split("-")
                          .map((part) => part[0])
                          .join("")}
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="border-brutal bg-card p-4">
                <div className="mb-3 font-mono text-[10px] tracking-widest text-primary">
                  DETAILS
                </div>
                <div className="space-y-2">
                  {itemFacts.map((fact) => (
                    <div key={fact.label} className="flex justify-between gap-4">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {fact.label}
                      </span>
                      <span className="text-right font-mono text-[10px] font-bold text-foreground">
                        {fact.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Suspense fallback={<ItemConditionVariantsFallback />}>
                <ItemConditionVariants item={data.item} currentItemId={numericItemId} />
              </Suspense>

              {data.item.collection ? (
                <div className="border-brutal bg-card p-4">
                  <div className="mb-3 font-mono text-[10px] tracking-widest text-primary">
                    COLLECTION
                  </div>
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="font-mono text-[11px] text-foreground">
                      {data.item.collection}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-6 lg:col-span-8 xl:col-span-9">
              <div className="border-brutal bg-card">
                <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
                  <span className="font-mono text-xs tracking-widest text-primary">
                    WHERE TO BUY
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {askRows.length} live listings
                  </span>
                </div>

                <div className="hidden grid-cols-[44px_minmax(140px,1.7fr)_72px_88px_minmax(120px,1fr)_72px_88px] gap-3 border-b border-border px-4 py-2 font-mono text-[9px] tracking-widest text-muted-foreground md:grid">
                  <div>#</div>
                  <div>PROVIDER</div>
                  <div className="text-right">QTY</div>
                  <div className="text-right">PRICE</div>
                  <div className="text-right">VS BEST</div>
                  <div className="text-right">UPDATED</div>
                  <div />
                </div>

                <CollapsibleAsksList rows={askRows} providers={data.providers} />
              </div>

              <div className="border-brutal bg-card">
                <div className="border-b-2 border-border px-4 py-3">
                  <span className="font-mono text-xs tracking-widest text-primary">
                    BUY ORDERS
                  </span>
                </div>

                <div className="hidden grid-cols-[minmax(0,1.2fr)_100px_120px] gap-4 border-b border-border px-4 py-2 font-mono text-[9px] tracking-widest text-muted-foreground md:grid">
                  <div>PROVIDER</div>
                  <div className="text-right">BIDS</div>
                  <div className="text-right">PRICE</div>
                </div>

                {bidRows.length === 0 ? (
                  <div className="px-4 py-8 font-mono text-sm text-muted-foreground">
                    No buy orders found across tracked markets.
                  </div>
                ) : (
                  bidRows.map((row) => (
                    <div
                      key={`${row.provider}-${row.highest_bid}`}
                      className="grid gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[minmax(0,1.2fr)_100px_120px] md:items-center"
                    >
                      <div>
                        <ProviderIdentity
                          provider={getProvider(row.provider, data.providers)}
                          fallback={providerLabel(row.provider, data.providers)}
                          logoSize={18}
                          textClassName="font-mono text-xs font-bold text-foreground"
                        />
                      </div>
                      <div className="font-mono text-xs text-muted-foreground md:text-right">
                        {formatNumber(row.num_bids)}
                      </div>
                      <div className="font-mono text-xs font-bold text-success md:text-right">
                        {formatPriceMinor(row.highest_bid)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Suspense fallback={<ItemPriceHistoryFallback />}>
                <ItemPriceHistorySection itemId={numericItemId} />
              </Suspense>

              <Suspense fallback={<ItemMarketInsightsFallback />}>
                <ItemMarketInsightsSection
                  itemId={numericItemId}
                  listingProvidersCount={data.coverage.askProviders}
                />
              </Suspense>

              <Suspense fallback={<ItemRecentSalesFallback />}>
                <ItemRecentSalesSection itemId={numericItemId} providers={data.providers} />
              </Suspense>

              <Suspense fallback={<ItemRelatedItemsFallback />}>
                <ItemRelatedItemsSection item={data.item} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <FooterSection />
    </>
  );
}
