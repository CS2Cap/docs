import {
  getSiblingVariants,
  getVariantKindLabel,
  getVariantWearLabel,
} from "@/lib/api";
import { serverApi } from "@/lib/api/server";
import { buildQuery } from "@/lib/api/shared";
import { buildItemPath } from "@/lib/seo/itemSlug";
import type { ItemOut } from "@/lib/api/types";
import {
  ConditionVariantTabsView,
  type KindGroup,
  type PhaseGroup,
  type WearTab,
} from "./ConditionVariantTabsView";

export function ItemConditionVariantTabsFallback() {
  return (
    <div className="border-brutal bg-card">
      <div className="border-b-2 border-border px-6 py-4">
        <span className="font-mono text-sm tracking-widest text-primary">
          CONDITION VARIANTS
        </span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-card px-3 py-3">
              <div className="mx-auto h-3 w-16 animate-pulse rounded-sm bg-secondary/70" />
              <div className="mx-auto mt-2 h-3 w-12 animate-pulse rounded-sm bg-secondary/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function ItemConditionVariantTabs({
  item,
  currentItemId,
}: {
  item: ItemOut;
  currentItemId: number;
}) {
  if (!item.base_name || !item.skin_name) {
    return null;
  }

  const siblingItems = await serverApi.getItems(
    buildQuery({
      base_name: item.base_name,
      skin_name: item.skin_name,
      limit: 50,
    }),
    300,
  );

  const siblingItemIds =
    siblingItems?.items
      .map((candidate) => candidate.item_id)
      .filter((candidate): candidate is number => typeof candidate === "number") ?? [];

  if (siblingItemIds.length === 0) {
    return null;
  }

  const siblingPrices = await serverApi.postPrices({
    item_ids: siblingItemIds,
    currency: "USD",
  });
  const priceItems = siblingPrices?.items ?? [];

  const siblingVariants = getSiblingVariants(
    siblingItems?.items ?? [],
    item,
    siblingItemIds.map((id) => ({
      item_id: id,
      market_hash_name: "",
      quotes: priceItems
        .filter((price) => price.item_id === id)
        .map((price) => ({
          provider: price.provider,
          lowest_ask: price.lowest_ask,
          quantity: price.quantity,
        })),
    })),
  );

  if (siblingVariants.length === 0) {
    return null;
  }

  // siblingVariants is pre-sorted by kind -> phase -> wear.
  const kindMap = new Map<string, Map<string, WearTab[]>>();
  for (const variant of siblingVariants) {
    const itemId = variant.item.item_id;
    if (typeof itemId !== "number") {
      continue;
    }

    const kindLabel = getVariantKindLabel(variant.item);
    const phaseKey = variant.item.phase ?? "";

    const phaseMap = kindMap.get(kindLabel) ?? new Map<string, WearTab[]>();
    const wears = phaseMap.get(phaseKey) ?? [];
    wears.push({
      itemId,
      wearLabel: variant.item.wear_name ?? getVariantWearLabel(variant.item),
      bestAsk: variant.bestAsk,
      isCurrent: itemId === currentItemId,
      href: buildItemPath(itemId, variant.item.market_hash_name),
    });
    phaseMap.set(phaseKey, wears);
    kindMap.set(kindLabel, phaseMap);
  }

  const kinds: KindGroup[] = [];
  for (const [kindLabel, phaseMap] of kindMap) {
    const phaseGroups: PhaseGroup[] = [];
    for (const [phaseKey, wears] of phaseMap) {
      phaseGroups.push({
        phaseLabel: phaseKey || null,
        wears,
      });
    }
    kinds.push({ label: kindLabel, phaseGroups });
  }

  if (kinds.length === 0) {
    return null;
  }

  const initialKind = getVariantKindLabel(item);

  return (
    <ConditionVariantTabsView
      kinds={kinds}
      initialKind={
        kinds.some((kind) => kind.label === initialKind)
          ? initialKind
          : kinds[0].label
      }
    />
  );
}
