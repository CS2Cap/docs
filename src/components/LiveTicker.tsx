"use client";

import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { buildItemPath } from "@/lib/seo/itemSlug";

type TickerItem = {
  id: string | number;
  name: string;
  imageUrl?: string | null;
  price: string;
  provider?: {
    name: string;
    logo: string | null;
  } | null;
};

export function LiveTicker({ items }: { items: TickerItem[] }) {
  const renderItems = (keyPrefix: string, hidden = false) =>
    items.map((item) => (
      <Fragment key={`${keyPrefix}-${item.id}`}>
        <Link
          href={buildItemPath(typeof item.id === "string" ? Number.parseInt(item.id, 10) : item.id, item.name)}
          prefetch={false}
          title={`View ${item.name}`}
          tabIndex={hidden ? -1 : undefined}
          aria-hidden={hidden ? true : undefined}
          className="group flex shrink-0 items-center gap-2 px-5 transition-colors hover:bg-secondary/80"
        >
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 object-contain"
            />
          ) : (
            <div
              className="h-6 w-6 shrink-0 rounded-sm bg-muted/60"
              aria-hidden="true"
            />
          )}
          <span className="shrink-0 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground">
            {item.name}
          </span>
          <span className="shrink-0 font-mono text-xs font-bold text-foreground">{item.price}</span>
          {item.provider ? (
            <span className="inline-flex shrink-0 items-center gap-1.5">
              {item.provider.logo ? (
                <Image
                  src={item.provider.logo}
                  alt={item.provider.name}
                  width={14}
                  height={14}
                  className="h-auto rounded-sm"
                />
              ) : null}
              <span className="font-mono text-xs font-bold text-primary">{item.provider.name}</span>
            </span>
          ) : null}
        </Link>
        <span className="flex shrink-0 items-center font-mono text-xs text-border" aria-hidden="true">│</span>
      </Fragment>
    ));

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="border-y-2 border-border bg-secondary/50 overflow-hidden">
      <div className="inline-flex w-max animate-ticker whitespace-nowrap py-1.5 will-change-transform">
        <div className="flex shrink-0">
          {renderItems("a")}
        </div>
        <div className="flex shrink-0" aria-hidden="true">
          {renderItems("b", true)}
        </div>
      </div>
    </div>
  );
}
