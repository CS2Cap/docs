import Image from "next/image";
import type { ProviderInfo } from "@/lib/api";

export function ProviderIdentity({
  provider,
  fallback,
  logoSize = 15,
  textClassName = "font-mono text-xs font-bold text-foreground",
  className = "inline-flex min-w-0 items-center gap-2",
}: {
  provider?: ProviderInfo | null;
  fallback: string;
  logoSize?: number;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {provider?.logo ? (
        <Image
          src={provider.logo}
          alt={provider.name ?? provider.code ?? provider.key ?? fallback}
          width={logoSize}
          height={logoSize}
          className="h-auto shrink-0 rounded-sm"
        />
      ) : (
        <span
          className="shrink-0 rounded-sm border border-border bg-secondary/50"
          style={{ width: logoSize, height: logoSize }}
          aria-hidden="true"
        />
      )}
      <span className={`truncate ${textClassName}`}>{provider?.name ?? fallback}</span>
    </span>
  );
}
