import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/FooterSection";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Stickers, Charms, Graffiti & More",
  description:
    "Browse Counter-Strike 2 stickers, sticker slabs, charms, graffiti, music kits, patches, and collectibles.",
};

const CATEGORIES = [
  { label: "Stickers", href: "/stickers", blurb: "Every sticker by collection" },
  { label: "Sticker Slabs", href: "/sticker-slabs", blurb: "Slabs by tournament" },
  { label: "Charms", href: "/charms", blurb: "Charm collections" },
  { label: "Graffiti", href: "/graffiti", blurb: "Sealed graffiti" },
  { label: "Music Kits", href: "/music-kits", blurb: "Every music kit" },
  { label: "Patches", href: "/patches", blurb: "Agent patches" },
  { label: "Collectibles", href: "/collectibles", blurb: "Pins & passes" },
];

export default function ExtrasPage() {
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Stickers &amp; More</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="flex flex-col gap-1 border-2 border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <span className="font-mono text-lg font-semibold text-foreground">{c.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{c.blurb}</span>
            </Link>
          ))}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
