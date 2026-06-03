import { NextResponse } from "next/server";
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
  const ix = await loadBrowseIndex();
  const data = ix ? buildBrowseNav(ix) : EMPTY;
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
}
