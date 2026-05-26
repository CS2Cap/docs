import { getSiblingVariants, getVariantKindLabel } from "@/lib/api";
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

const WEAR_ORDER = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];

function ConditionVariantsEmpty() {
  return (
    <div className="border-brutal bg-card">
      <div className="border-b-2 border-border px-6 py-4">
        <span className="font-mono text-sm tracking-widest text-primary">
          CONDITION VARIANTS
        </span>
      </div>
    </div>
  );
}

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
    return <ConditionVariantsEmpty />;
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
    return <ConditionVariantsEmpty />;
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
    return <ConditionVariantsEmpty />;
  }

  // siblingVariants is pre-sorted by kind -> phase -> wear. Only variants with a
  // recognized wear are kept; everything else falls through to the empty strip.
  const kindMap = new Map<string, Map<string, Map<string, WearTab>>>();
  for (const variant of siblingVariants) {
    const itemId = variant.item.item_id;
    if (typeof itemId !== "number") {
      continue;
    }

    const wearName = variant.item.wear_name ?? "";
    if (!WEAR_ORDER.includes(wearName)) {
      continue;
    }

    const kindLabel = getVariantKindLabel(variant.item);
    const phaseKey = variant.item.phase ?? "";

    const phaseMap = kindMap.get(kindLabel) ?? new Map<string, Map<string, WearTab>>();
    const wearMap = phaseMap.get(phaseKey) ?? new Map<string, WearTab>();
    wearMap.set(wearName, {
      itemId,
      wearLabel: wearName,
      bestAsk: variant.bestAsk,
      isCurrent: itemId === currentItemId,
      href: buildItemPath(itemId, variant.item.market_hash_name),
      available: true,
    });
    phaseMap.set(phaseKey, wearMap);
    kindMap.set(kindLabel, phaseMap);
  }

  const kinds: KindGroup[] = [];
  for (const [kindLabel, phaseMap] of kindMap) {
    // Wears the item actually ships in (union across phases, FN -> BS order).
    // A Doppler only has FN/MW, a standard skin has all five.
    const present = new Set<string>();
    for (const wearMap of phaseMap.values()) {
      for (const wearName of wearMap.keys()) {
        present.add(wearName);
      }
    }
    const kindWears = WEAR_ORDER.filter((wearName) => present.has(wearName));

    const phaseGroups: PhaseGroup[] = [];
    for (const [phaseKey, wearMap] of phaseMap) {
      // Every phase row uses the same wear columns; a phase missing one
      // (e.g. a rare phase that has no MW) renders that slot as disabled.
      const wears: WearTab[] = kindWears.map(
        (wearName) =>
          wearMap.get(wearName) ?? {
            itemId: -1,
            wearLabel: wearName,
            bestAsk: null,
            isCurrent: false,
            href: "",
            available: false,
          },
      );
      phaseGroups.push({
        phaseLabel: phaseKey || null,
        wears,
      });
    }
    kinds.push({ label: kindLabel, phaseGroups });
  }

  if (kinds.length === 0) {
    return <ConditionVariantsEmpty />;
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
