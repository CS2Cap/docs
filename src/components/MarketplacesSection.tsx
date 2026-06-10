import Image from "next/image";
import Link from "next/link";
import type { ProviderInfo } from "@/lib/api";
import { getPageBySlug } from "@/lib/seo/landing-pages";

export function MarketplacesSection({ providers }: { providers: ProviderInfo[] }) {
  return (
    <section id="markets" className="py-24 border-t-2 border-border">
      <div className="container">
        <div className="mb-10">
          <div className="font-mono text-xs tracking-widest text-primary mb-3">// WHERE WE PULL FROM</div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
            SUPPORTED <span className="text-primary">MARKETS.</span>
          </h2>
        </div>

        <div className="grid grid-cols-4 border-l border-t border-border sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
          {providers.map((provider) => {
            const slug = `${provider.key}-api`;
            const hasPage = Boolean(getPageBySlug(slug));
            const cardClass =
              "group relative flex aspect-square items-center justify-center border-b border-r border-border bg-card p-4 transition-colors" +
              (hasPage ? " hover:bg-secondary/50" : "");
            const label = provider.name ?? provider.code ?? provider.key;
            const content = provider.logo ? (
              <>
                <Image
                  src={provider.logo}
                  alt=""
                  width={40}
                  height={40}
                  className="max-h-10 w-auto object-contain"
                />
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap border border-border bg-background px-2 py-1 font-mono text-xs text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {label}
                </span>
              </>
            ) : (
              <>
                <span className="h-10 w-10 border border-border bg-secondary/60" aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap border border-border bg-background px-2 py-1 font-mono text-xs text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {label}
                </span>
              </>
            );

            return hasPage ? (
              <Link key={provider.key} href={`/${slug}`} aria-label={label} className={cardClass}>
                {content}
              </Link>
            ) : (
              <div key={provider.key} className={cardClass}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
