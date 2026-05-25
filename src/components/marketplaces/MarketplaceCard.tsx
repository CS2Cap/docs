import Image from "next/image";
import Link from "next/link";
import type { ProviderInfo } from "@/lib/api";
import { getPageBySlug } from "@/lib/seo/landing-pages";
import {
  formatFee,
  marketTypeBadgeClass,
  normalizeMarketType,
  pickPrimaryFee,
  statusDotClass,
} from "./marketplaces-utils";

export function MarketplaceCard({ provider }: { provider: ProviderInfo }) {
  const name = provider.name ?? provider.code ?? provider.key;
  const marketType = normalizeMarketType(provider.market_type);
  const fee = pickPrimaryFee(provider);
  const slug = `${provider.key}-api`;
  const hasPage = Boolean(getPageBySlug(slug));

  const inner = (
    <div className="group relative flex h-full flex-col gap-3 bg-card p-4 transition-colors hover:bg-secondary/40">
      <div className="flex items-start gap-3">
        {provider.logo ? (
          <Image
            src={provider.logo}
            alt={name}
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-sm object-contain"
          />
        ) : (
          <span className="h-8 w-8 shrink-0 rounded-sm border border-border bg-secondary/50" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-mono text-sm font-semibold tracking-wide text-foreground group-hover:text-primary transition-colors">
            {name}
          </span>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {provider.code ?? provider.key.toUpperCase()}
          </span>
        </div>
        <span
          className={`mt-1 h-1.5 w-1.5 rounded-full ${statusDotClass(provider.health?.status)}`}
          aria-label={`status ${provider.health?.status ?? "unknown"}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex h-5 items-center border px-1.5 font-mono text-[9px] tracking-widest ${marketTypeBadgeClass(marketType)}`}
        >
          {marketType}
        </span>
        <span className="inline-flex h-5 items-center border border-border px-1.5 font-mono text-[9px] tracking-widest text-muted-foreground">
          {formatFee(fee)}
        </span>
        {provider.features?.has_buy_orders && (
          <span
            title="Buy Orders"
            className="inline-flex h-5 items-center border border-chart-2/40 px-1.5 font-mono text-[9px] tracking-widest text-chart-2"
          >
            BO
          </span>
        )}
        {provider.features?.has_recent_sales && (
          <span
            title="Recent Sales"
            className="inline-flex h-5 items-center border border-chart-4/40 px-1.5 font-mono text-[9px] tracking-widest text-chart-4"
          >
            RS
          </span>
        )}
      </div>

      <div className="mt-auto font-mono text-[10px] tracking-widest text-muted-foreground">
        {provider.default_currency ?? "—"}
      </div>
    </div>
  );

  if (hasPage) {
    return (
      <Link href={`/${slug}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
