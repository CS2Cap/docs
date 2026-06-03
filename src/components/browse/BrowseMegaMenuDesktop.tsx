"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useBrowseNav } from "@/lib/api/hooks";
import type { BrowseNavData, BrowseNavItem } from "@/lib/browse/nav-types";

type CategoryKey =
  | "Pistols"
  | "Rifles"
  | "SMGs"
  | "Heavy"
  | "Equipment"
  | "Knives"
  | "Gloves"
  | "Agents"
  | "Cases"
  | "Collections"
  | "Stickers"
  | "Sticker Slabs"
  | "Charms"
  | "Graffiti"
  | "Music Kits"
  | "Patches"
  | "Collectibles";

const RAIL: Array<{ heading: string; href: string; rows: CategoryKey[] }> = [
  { heading: "Weapons", href: "/weapons", rows: ["Pistols", "Rifles", "SMGs", "Heavy", "Equipment"] },
  { heading: "Gear", href: "/gear", rows: ["Knives", "Gloves", "Agents"] },
  { heading: "Containers", href: "/containers", rows: ["Cases", "Collections"] },
  {
    heading: "Stickers & More",
    href: "/extras",
    rows: ["Stickers", "Sticker Slabs", "Charms", "Graffiti", "Music Kits", "Patches", "Collectibles"],
  },
];

const VIEW_ALL: Record<CategoryKey, { href: string; label: string }> = {
  Pistols: { href: "/weapons#pistols", label: "View all pistols" },
  Rifles: { href: "/weapons#rifles", label: "View all rifles" },
  SMGs: { href: "/weapons#smgs", label: "View all SMGs" },
  Heavy: { href: "/weapons#heavy", label: "View all heavy" },
  Equipment: { href: "/weapons#equipment", label: "View all equipment" },
  Knives: { href: "/knives", label: "View all knives" },
  Gloves: { href: "/gloves", label: "View all gloves" },
  Agents: { href: "/agents", label: "View all agents" },
  Cases: { href: "/cases", label: "View all cases" },
  Collections: { href: "/collections", label: "View all collections" },
  Stickers: { href: "/stickers", label: "View all stickers" },
  "Sticker Slabs": { href: "/sticker-slabs", label: "View all sticker slabs" },
  Charms: { href: "/charms", label: "View all charms" },
  Graffiti: { href: "/graffiti", label: "View all graffiti" },
  "Music Kits": { href: "/music-kits", label: "View all music kits" },
  Patches: { href: "/patches", label: "View all patches" },
  Collectibles: { href: "/collectibles", label: "View all collectibles" },
};

function itemsFor(data: BrowseNavData | undefined, cat: CategoryKey): BrowseNavItem[] {
  if (!data) return [];
  switch (cat) {
    case "Pistols":
    case "Rifles":
    case "SMGs":
    case "Heavy":
    case "Equipment":
      return data.weapons[cat];
    case "Knives":
      return data.knives;
    case "Gloves":
      return data.gloves;
    case "Agents":
      return data.agents;
    case "Cases":
      return data.cases;
    case "Collections":
      return data.collections;
    case "Stickers":
      return data.stickers;
    case "Sticker Slabs":
      return data.slabs;
    case "Charms":
      return data.charms;
    case "Graffiti":
      return data.graffiti;
    case "Music Kits":
      return data.musicKits;
    case "Patches":
      return data.patches;
    case "Collectibles":
      return data.collectibles;
  }
}

export function BrowseMegaMenuDesktop({ onNavigate }: { onNavigate?: () => void }) {
  const [active, setActive] = useState<CategoryKey>("Rifles");
  const { data, isLoading } = useBrowseNav(true);
  const items = itemsFor(data, active);
  const viewAll = VIEW_ALL[active];

  return (
    <div className="flex w-[min(900px,calc(100vw-2rem))]">
      {/* Left rail */}
      <div className="w-52 shrink-0 border-r-2 border-border p-3">
        {RAIL.map((group) => (
          <div key={group.heading} className="mb-3 last:mb-0">
            <Link
              href={group.href}
              onClick={onNavigate}
              className="block px-2 pb-1 font-mono text-xs font-bold uppercase tracking-widest text-primary hover:underline"
            >
              {group.heading}
            </Link>
            {group.rows.map((row) => (
              <button
                key={row}
                type="button"
                onMouseEnter={() => setActive(row)}
                onFocus={() => setActive(row)}
                className={`block w-full px-2 py-1 text-left font-mono text-xs tracking-wider transition-colors ${
                  active === row ? "bg-secondary text-primary" : "text-foreground/90 hover:text-primary"
                }`}
              >
                {row}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Center panel */}
      <div className="min-w-0 flex-1 p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="font-mono text-sm font-bold">{active}</span>
          <Link
            href={viewAll.href}
            onClick={onNavigate}
            className="shrink-0 font-mono text-xs text-primary hover:underline"
          >
            {viewAll.label} →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            Nothing to show.{" "}
            <Link href={viewAll.href} onClick={onNavigate} className="text-primary hover:underline">
              {viewAll.label} →
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <Link
                key={`${item.href}-${item.name}`}
                href={item.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 border border-border bg-card p-2 transition-colors hover:border-primary"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-muted/30">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="font-mono text-[8px] text-muted-foreground">N/A</span>
                  )}
                </div>
                <span className="truncate font-mono text-xs text-foreground group-hover:text-primary">
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
