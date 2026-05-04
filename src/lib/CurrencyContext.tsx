"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAccountPreferences } from "@/lib/api/hooks";
import { formatPriceMinor } from "@/lib/api/view-models";

interface CurrencyContextValue {
  currency: string;
  /** Convert and format a USD minor-unit value (cents) into the user's preferred currency string. */
  formatPrice: (amountInCents: number | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  formatPrice: (v) => formatPriceMinor(v, "USD"),
});

const FX_API =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

let _cachedRates: Record<string, number> | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function getRates(): Promise<Record<string, number>> {
  if (_cachedRates && Date.now() - _cacheTime < CACHE_TTL_MS) return _cachedRates;
  const res = await fetch(FX_API);
  const data = (await res.json()) as { usd: Record<string, number> };
  _cachedRates = data.usd;
  _cacheTime = Date.now();
  return _cachedRates;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: prefs } = useAccountPreferences();
  const currency = prefs?.preferred_currency ?? "USD";
  const [rate, setRate] = useState(1);

  useEffect(() => {
    getRates()
      .then((rates) => setRate(rates[currency.toLowerCase()] ?? 1))
      .catch(() => setRate(1));
  }, [currency]);

  function formatPrice(amountInCents: number | null | undefined): string {
    if (amountInCents == null) return "N/A";
    return formatPriceMinor(Math.round(amountInCents * rate), currency);
  }

  return (
    <CurrencyContext.Provider value={{ currency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
