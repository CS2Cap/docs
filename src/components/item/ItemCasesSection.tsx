import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ItemOut } from "@/lib/api/types";
import { slugifyMarketHashName } from "@/lib/seo/itemSlug";

export function ItemCasesSection({ item }: { item: ItemOut }) {
  const crates = item.crates ?? [];
  const cratesImages = item.crates_images ?? [];

  if (crates.length === 0) {
    return null;
  }

  return (
    <div className="border-brutal bg-card">
      <div className="flex items-center justify-between border-b-2 border-border px-6 py-4">
        <span className="font-mono text-sm tracking-widest text-primary">CASES</span>
        <span className="font-mono text-xs text-muted-foreground">
          {crates.length} {crates.length === 1 ? "case" : "cases"}
        </span>
      </div>
      <div
        className={
          crates.length > 1 ? "grid gap-px bg-border sm:grid-cols-2" : "bg-card"
        }
      >
        {crates.map((crate, index) => {
          const crateImage = cratesImages[index];
          return (
            <Link
              key={crate}
              href={`/cases/${slugifyMarketHashName(crate)}`}
              title={crate}
              className="group flex items-center gap-4 bg-card px-4 py-3.5 transition-colors hover:bg-secondary/30"
            >
              {crateImage ? (
                <Image
                  src={crateImage}
                  alt={crate}
                  width={96}
                  height={72}
                  className="h-12 w-16 shrink-0 object-contain transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="h-12 w-16 shrink-0" />
              )}
              <span className="min-w-0 flex-1 font-mono text-xs font-bold leading-snug text-foreground line-clamp-2 transition-colors group-hover:text-primary">
                {crate}
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
