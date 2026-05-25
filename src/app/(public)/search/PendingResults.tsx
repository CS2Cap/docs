"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

function snapshotFromParams(params: URLSearchParams): string {
  return [
    params.get("q") ?? "",
    params.get("item_type") ?? "",
    params.get("base_name") ?? params.get("weapon_type") ?? "",
    params.get("wear_name") ?? "",
    params.get("rarity_name") ?? "",
    params.get("collection") ?? "",
    params.get("phase") ?? "",
    params.get("min_price_usd") ?? "",
    params.get("max_price_usd") ?? "",
    params.get("sort") ?? "rank",
    params.get("direction") ?? "asc",
    params.get("page") ?? "1",
  ].join("|");
}

export function PendingResults({
  snapshot,
  children,
}: {
  snapshot: string;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const liveSnapshot = snapshotFromParams(params ?? new URLSearchParams());
  const isPending = liveSnapshot !== snapshot;

  return (
    <div
      aria-busy={isPending}
      className={`transition-opacity duration-150 ${
        isPending ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {children}
    </div>
  );
}
