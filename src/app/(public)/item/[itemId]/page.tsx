import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Bell, ChevronRight, Code } from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { ProviderIdentity } from "@/components/ProviderIdentity";
import { WatchItemButton } from "@/components/WatchItemButton";
import { CollapsibleAsksList } from "@/components/item/CollapsibleAsksList";
import { BuyOrdersList } from "@/components/item/BuyOrdersList";
import {
  StructuredData,
  buildBreadcrumbList,
  buildProduct,
} from "@/components/seo/StructuredData";
import {
  formatPriceMinor,
  getProvider,
  providerLabel,
  rarityColor,
} from "@/lib/api";
import { Price } from "@/components/Price";
import { getItemDetailPageCoreData } from "@/lib/api/compositions";
import {
  buildItemPath,
  parseItemRouteParam,
  slugifyMarketHashName,
} from "@/lib/seo/itemSlug";
import {
  ItemMarketInsightsFallback,
  ItemMarketInsightsSection,
  ItemPriceHistoryFallback,
  ItemPriceHistorySection,
  ItemRecentSalesFallback,
  ItemRecentSalesSection,
  ItemRelatedItemsFallback,
  ItemRelatedItemsSection,
} from "./ItemDetailDeferredSections";
import { ItemCasesSection } from "@/components/item/ItemCasesSection";
import {
  ItemConditionVariantTabs,
  ItemConditionVariantTabsFallback,
} from "@/components/item/ItemConditionVariantTabs";
import { ItemMarketDistribution } from "@/components/item/ItemMarketDistribution";

type ItemPageProps = {
  params: Promise<{
    itemId: string;
  }>;
};

const SITE_URL = "https://cs2cap.com";

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { itemId } = await params;
  const parsed = parseItemRouteParam(itemId);
  if (!parsed) {
    return {};
  }

  const data = await getItemDetailPageCoreData(parsed.id);
  if (!data) {
    return {};
  }

  const canonicalSlug = slugifyMarketHashName(data.item.market_hash_name);
  if (canonicalSlug && parsed.slug !== canonicalSlug) {
    redirect(buildItemPath(parsed.id, data.item.market_hash_name));
  }

  const itemName = data.item.market_hash_name;
  const askProviders = data.coverage.askProviders;
  const bestAskUsd =
    data.bestAsk?.lowest_ask != null ? formatPriceMinor(data.bestAsk.lowest_ask) : null;
  const bestBidUsd =
    data.bestBid?.highest_bid != null ? formatPriceMinor(data.bestBid.highest_bid) : null;

  const title =
    askProviders > 0
      ? `${itemName} — CS2 Skin Prices Across ${askProviders} Markets`
      : `${itemName} — CS2 Skin Price & Market Data`;

  const descriptionParts: string[] = [`Live CS2 prices for ${itemName}.`];
  if (bestAskUsd) {
    descriptionParts.push(`Lowest ask ${bestAskUsd}.`);
  }
  if (bestBidUsd) {
    descriptionParts.push(`Highest bid ${bestBidUsd}.`);
  }
  if (askProviders > 0) {
    descriptionParts.push(
      `Tracked across ${askProviders} marketplaces including Buff163, CSFloat, Skinport, and Steam.`,
    );
  }
  descriptionParts.push("Free CS2 API access available via CS2Cap.");
  const description = descriptionParts.join(" ");

  const canonical = buildItemPath(parsed.id, itemName);
  const url = `${SITE_URL}${canonical}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url,
      siteName: "CS2Cap",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
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
  const parsed = parseItemRouteParam(itemId);

  if (!parsed) {
    notFound();
  }

  const numericItemId = parsed.id;
  const data = await getItemDetailPageCoreData(numericItemId);
  if (!data) {
    notFound();
  }

  const askRows = [...(data.prices?.items ?? [])].sort(
    (left, right) => left.lowest_ask - right.lowest_ask,
  );
  const bidMarketCount =
    data.buyOrders.reliable.length + data.buyOrders.flagged.length;
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
    { label: "Type", value: data.item.item_type },
    { label: "Category", value: data.item.item_subtype },
    { label: "Weapon", value: data.item.weapon_type },
    { label: "Finish Style", value: data.item.style_name },
    { label: "Phase", value: data.item.phase },
  ].filter((entry) => entry.value);

  const bestAskProvider = data.bestAsk ? getProvider(data.bestAsk.provider, data.providers) : null;
  const itemUrl = `${SITE_URL}${buildItemPath(numericItemId, data.item.market_hash_name)}`;
  const productDescriptionParts: string[] = [
    `${data.item.market_hash_name} — Counter-Strike 2 ${data.item.rarity_name?.toLowerCase() ?? "skin"}`,
  ];
  if (data.item.collection) {
    productDescriptionParts.push(`from the ${data.item.collection} collection`);
  }
  if (data.coverage.askProviders > 0) {
    productDescriptionParts.push(
      `with live pricing tracked across ${data.coverage.askProviders} marketplaces`,
    );
  }
  const productDescription = productDescriptionParts.join(" ") + ".";
  const highestAskCents =
    askRows.length > 0 ? askRows[askRows.length - 1].lowest_ask : undefined;
  const lowestAskCents = askRows.length > 0 ? askRows[0].lowest_ask : undefined;

  return (
    <>
      <StructuredData
        data={buildBreadcrumbList([
          { name: "Home", url: SITE_URL },
          { name: "Search", url: `${SITE_URL}/search` },
          { name: data.item.market_hash_name, url: itemUrl },
        ])}
      />
      <StructuredData
        data={buildProduct({
          name: data.item.market_hash_name,
          url: itemUrl,
          description: productDescription,
          image: data.item.image_url,
          category: data.item.item_type,
          lowestAskCents: data.bestAsk?.lowest_ask,
          highestAskCents,
          offerCount: askRows.length,
        })}
      />
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

                <div className="px-5 pb-5">
                  <h1 className="text-2xl font-black tracking-tighter xl:text-3xl">
                    {data.item.market_hash_name}
                  </h1>
                  {data.item.wear_name &&
                  !data.item.market_hash_name.includes(`(${data.item.wear_name})`) ? (
                    <div className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground">
                      {data.item.wear_name}
                    </div>
                  ) : null}

                  {askRows.length > 0 ? (
                    <div className="mt-5">
                      <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                        PRICE RANGE
                      </div>
                      <div className="mt-1 font-mono text-2xl font-bold">
                        <span className="text-success">
                          <Price cents={lowestAskCents} />
                        </span>
                        <span className="px-1.5 text-muted-foreground">—</span>
                        <span className="text-foreground">
                          <Price cents={highestAskCents} />
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                        LOWEST ASK
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold text-success">
                        <Price cents={data.bestAsk?.lowest_ask} />
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                        HIGHEST BID
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold text-foreground">
                        <Price cents={data.bestBid?.highest_bid} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                        MARKETS WITH ASKS
                      </div>
                      <div className="mt-1 flex h-4.5 items-center font-mono text-base font-bold text-foreground">
                        {data.coverage.askProviders}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                        BEST ASK AT
                      </div>
                      <div className="mt-1 flex h-4.5 items-center text-base font-bold text-primary">
                        {data.bestAsk ? (
                          (() => {
                            const bestAskUrl = data.bestAsk.link || data.bestAsk.url;
                            const chip = (
                              <ProviderIdentity
                                provider={bestAskProvider}
                                fallback={providerLabel(data.bestAsk.provider, data.providers)}
                                logoSize={18}
                                textClassName="font-mono text-base font-bold text-primary"
                              />
                            );
                            return bestAskUrl ? (
                              <a
                                href={bestAskUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                              >
                                {chip}
                              </a>
                            ) : (
                              chip
                            );
                          })()
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <WatchItemButton itemId={numericItemId} />
                    <Link
                      href={`/alerts?itemId=${numericItemId}`}
                      rel="nofollow"
                      className="flex items-center justify-center gap-1.5 border-brutal px-3.5 py-2.5 font-mono text-[11px] tracking-wider brutalist-hover"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      ALERT
                    </Link>
                  </div>
                </div>
              </div>

              <div className="border-brutal bg-card p-5">
                <div className="mb-3.5 font-mono text-[11px] tracking-widest text-primary">
                  FLOAT RANGE
                </div>
                <div className="relative mb-5 h-2.5 bg-linear-to-r from-success via-warning to-destructive">
                  {data.item.min_float != null && data.item.max_float != null ? (
                    <>
                      <div
                        className="absolute inset-y-0 border-2 border-foreground"
                        style={{
                          left: `${Math.max(0, Math.min(1, data.item.min_float)) * 100}%`,
                          width: `${Math.max(0, Math.min(1, data.item.max_float - data.item.min_float)) * 100}%`,
                        }}
                        aria-hidden="true"
                      />
                      {data.item.min_float > 0 ? (
                        <div
                          className="absolute top-full mt-0.5 -translate-x-1/2 font-mono text-[9px] font-bold text-foreground"
                          style={{ left: `${Math.min(1, data.item.min_float) * 100}%` }}
                        >
                          {data.item.min_float.toFixed(2)}
                        </div>
                      ) : null}
                      {data.item.max_float < 1 ? (
                        <div
                          className="absolute top-full mt-0.5 -translate-x-1/2 font-mono text-[9px] font-bold text-foreground"
                          style={{ left: `${Math.min(1, data.item.max_float) * 100}%` }}
                        >
                          {data.item.max_float.toFixed(2)}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>0.00</span>
                  <span>1.00</span>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-px bg-border">
                  {[
                    { name: "Factory New", abbr: "FN" },
                    { name: "Minimal Wear", abbr: "MW" },
                    { name: "Field-Tested", abbr: "FT" },
                    { name: "Well-Worn", abbr: "WW" },
                    { name: "Battle-Scarred", abbr: "BS" },
                  ].map(({ name, abbr }) => (
                    <div
                      key={name}
                      className={`px-2 py-2 text-center font-mono text-xs font-bold tracking-wider ${data.item.wear_name === name
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-foreground"
                        }`}
                    >
                      {abbr}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-brutal bg-card p-5">
                <div className="mb-3.5 font-mono text-[11px] tracking-widest text-primary">
                  DETAILS
                </div>
                <div className="space-y-2.5">
                  {itemFacts.map((fact) => (
                    <div key={fact.label} className="flex justify-between gap-4">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {fact.label}
                      </span>
                      <span className="text-right font-mono text-[11px] font-bold text-foreground">
                        {fact.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {data.item.collection ? (
                <Link
                  href={`/search?collection=${encodeURIComponent(data.item.collection)}`}
                  className="group block border-brutal bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="mb-3 font-mono text-[10px] tracking-widest text-primary">
                    COLLECTION
                  </div>
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="font-mono text-[11px] text-foreground transition-colors group-hover:text-primary">
                      {data.item.collection}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </Link>
              ) : null}

              <ItemMarketDistribution rows={askRows} providers={data.providers} />

              <Link
                href="/pricing"
                className="group flex items-start gap-3 border-brutal bg-card p-4 transition-colors hover:border-primary"
              >
                <Code className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] tracking-widest text-primary">
                    CS2 SKIN API
                  </div>
                  <div className="mt-1 font-mono text-[11px] leading-5 text-foreground transition-colors group-hover:text-primary">
                    Access this pricing data via the CS2Cap API →
                  </div>
                </div>
              </Link>
            </div>

            <div className="space-y-6 lg:col-span-8 xl:col-span-9">
              <Suspense fallback={<ItemConditionVariantTabsFallback />}>
                <ItemConditionVariantTabs
                  item={data.item}
                  currentItemId={numericItemId}
                />
              </Suspense>

              <div className="border-brutal bg-card">
                <div className="flex items-center justify-between border-b-2 border-border px-6 py-5">
                  <span className="font-mono text-base font-bold tracking-widest text-primary">
                    WHERE TO BUY
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {askRows.length} live listings
                  </span>
                </div>

                <div className="hidden grid-cols-[48px_minmax(200px,1.3fr)_minmax(110px,1fr)_minmax(170px,1.4fr)_80px_minmax(110px,1fr)_120px] gap-4 border-b border-border px-6 py-3.5 font-mono text-[12px] tracking-widest text-foreground/80 md:grid">
                  <div>#</div>
                  <div>PROVIDER</div>
                  <div className="text-right">PRICE</div>
                  <div className="text-right">VS BEST</div>
                  <div className="text-right">QTY</div>
                  <div className="text-right">UPDATED</div>
                  <div />
                </div>

                <CollapsibleAsksList rows={askRows} providers={data.providers} />
              </div>

              <div className="border-brutal bg-card">
                <div className="flex items-center justify-between border-b-2 border-border px-6 py-5">
                  <span className="font-mono text-base font-bold tracking-widest text-primary">
                    BUY ORDERS
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {bidMarketCount} markets
                  </span>
                </div>

                <div className="hidden grid-cols-[48px_minmax(200px,1.3fr)_minmax(110px,1fr)_minmax(170px,1.4fr)_80px_minmax(110px,1fr)_120px] gap-4 border-b border-border px-6 py-3.5 font-mono text-[12px] tracking-widest text-foreground/80 md:grid">
                  <div>#</div>
                  <div>PROVIDER</div>
                  <div className="text-right">HIGHEST BID</div>
                  <div className="text-right">VS BEST</div>
                  <div className="text-right">BIDS</div>
                  <div className="text-right">UPDATED</div>
                  <div />
                </div>

                <BuyOrdersList
                  reliable={data.buyOrders.reliable}
                  flagged={data.buyOrders.flagged}
                  providers={data.providers}
                  askRows={askRows}
                />
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

              <ItemCasesSection item={data.item} />

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
