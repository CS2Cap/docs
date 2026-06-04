import { NextResponse } from "next/server";
import { getCachedBrowseNav } from "@/lib/blob-snapshot-cache";
import { buildBrowseNav, loadBrowseIndex } from "@/lib/browse/browse-index";
import type { BrowseNavData } from "@/lib/browse/nav-types";

export const revalidate = 86400;

const EMPTY: BrowseNavData = {
  weapons: { Pistols: [], Rifles: [], SMGs: [], Heavy: [], Equipment: [] },
  knives: [],
  gloves: [],
  agents: [],
  cases: [],
  collections: [],
  stickers: [],
  slabs: [],
  charms: [],
  graffiti: [],
  musicKits: [],
  patches: [],
  collectibles: [],
};

export async function GET() {
  // Prefer the precomputed nav blob (a few KB) written by the items cron — it
  // avoids downloading + deduping the full multi-MB catalog at request time.
  // Fall back to on-demand compute only before the first cron has run.
  const precomputed = await getCachedBrowseNav();
  const data =
    precomputed?.snapshot ?? (await loadBrowseIndex().then((ix) => (ix ? buildBrowseNav(ix) : EMPTY)));
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
}
