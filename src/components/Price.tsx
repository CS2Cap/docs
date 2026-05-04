"use client";

import { useCurrency } from "@/lib/CurrencyContext";

export function Price({ cents }: { cents: number | null | undefined }) {
  const { formatPrice } = useCurrency();
  return <>{formatPrice(cents)}</>;
}
