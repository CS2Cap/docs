"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Price } from "@/components/Price";

const INITIAL_VISIBLE = 6;

export type SimilarItem = {
  itemId: number;
  name: string;
  imageUrl: string | null;
  wear: string | null;
  collection: string | null;
  bestAsk: number | null;
  href: string;
};

export function SimilarItemsGrid({ items }: { items: SimilarItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(items.length - INITIAL_VISIBLE, 0);

  return (
    <div className="border-brutal bg-card">
      <div className="border-b-2 border-border px-6 py-4">
        <span className="font-mono text-sm tracking-widest text-primary">
          SIMILAR ITEMS
        </span>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <Link
            key={item.itemId}
            href={item.href}
            className="bg-card p-4 transition-colors hover:bg-secondary/30"
          >
            <div className="aspect-4/3 overflow-hidden border-brutal bg-secondary/50">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={256}
                  height={192}
                  className="h-full w-full object-contain p-3"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                  NO PREVIEW
                </div>
              )}
            </div>
            <div className="mt-3 font-mono text-xs font-bold text-foreground">
              {item.name}
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {[item.wear, item.collection].filter(Boolean).join(" • ")}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-primary">
                BEST ASK
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                <Price cents={item.bestAsk} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-2 border-t-2 border-border bg-secondary/20 px-4 py-3 font-mono text-[10px] tracking-widest text-primary transition-colors hover:bg-secondary/40"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3 w-3 rotate-180 transition-transform" />
              SHOW LESS
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 transition-transform" />
              SHOW {hiddenCount} MORE
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
