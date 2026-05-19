import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ItemOut } from "@/lib/api/types";

export function ItemCasesSection({ item }: { item: ItemOut }) {
  const crates = item.crates ?? [];

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
      <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
        {crates.map((crate) => (
          <Link
            key={crate}
            href={`/search?q=${encodeURIComponent(crate)}`}
            className="flex items-center justify-between gap-3 bg-card p-4 transition-colors hover:bg-secondary/30"
          >
            <div className="min-w-0">
              <div className="font-mono text-[9px] tracking-widest text-muted-foreground">
                CONTAINER
              </div>
              <div className="mt-1 truncate font-mono text-xs font-bold text-foreground">
                {crate}
              </div>
            </div>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
