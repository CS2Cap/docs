import Link from "next/link";

export const BROWSE_HREFS = [
  "/browse",
  "/weapons",
  "/gear",
  "/knives",
  "/gloves",
  "/agents",
  "/containers",
  "/collections",
  "/cases",
  "/extras",
  "/stickers",
  "/sticker-slabs",
  "/charms",
  "/graffiti",
  "/music-kits",
  "/patches",
  "/collectibles",
];

const COLUMNS: Array<{ heading: string; href: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Weapons",
    href: "/weapons",
    links: [
      { label: "Pistols", href: "/weapons#pistols" },
      { label: "Rifles", href: "/weapons#rifles" },
      { label: "SMGs", href: "/weapons#smgs" },
      { label: "Heavy", href: "/weapons#heavy" },
      { label: "Equipment", href: "/weapons#equipment" },
    ],
  },
  {
    heading: "Gear",
    href: "/gear",
    links: [
      { label: "Knives", href: "/knives" },
      { label: "Gloves", href: "/gloves" },
      { label: "Agents", href: "/agents" },
    ],
  },
  {
    heading: "Containers",
    href: "/containers",
    links: [
      { label: "Collections", href: "/collections" },
      { label: "Cases", href: "/cases" },
    ],
  },
  {
    heading: "Stickers & More",
    href: "/extras",
    links: [
      { label: "Stickers", href: "/stickers" },
      { label: "Sticker Slabs", href: "/sticker-slabs" },
      { label: "Charms", href: "/charms" },
      { label: "Graffiti", href: "/graffiti" },
      { label: "Music Kits", href: "/music-kits" },
      { label: "Patches", href: "/patches" },
      { label: "Collectibles", href: "/collectibles" },
    ],
  },
];

export function BrowseMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-6 p-4">
      {COLUMNS.map((col) => (
        <div key={col.heading} className="flex flex-col gap-2">
          <Link
            href={col.href}
            onClick={onNavigate}
            className="font-mono text-xs font-bold uppercase tracking-widest text-primary hover:underline"
          >
            {col.heading}
          </Link>
          <div className="flex flex-col gap-1">
            {col.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onNavigate}
                className="font-mono text-xs tracking-wider text-foreground/90 hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
