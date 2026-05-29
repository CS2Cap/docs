import Link from "next/link";
import { StructuredData, buildBreadcrumbList } from "./StructuredData";

const SITE_URL = "https://cs2cap.com";

export interface BreadcrumbItem {
  name: string;
  href: string;
}

/**
 * Visible breadcrumb trail plus matching BreadcrumbList JSON-LD.
 * The last item is rendered as the current page (not linked).
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <>
      <StructuredData
        data={buildBreadcrumbList(
          items.map((item) => ({ name: item.name, url: `${SITE_URL}${item.href}` })),
        )}
      />
      <nav aria-label="Breadcrumb" className="container pt-20">
        <ol className="flex flex-wrap items-center gap-1.5 font-mono text-xs tracking-wider text-muted-foreground">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-1.5">
                {isLast ? (
                  <span className="text-foreground">{item.name}</span>
                ) : (
                  <Link href={item.href} className="hover:text-primary transition-colors">
                    {item.name}
                  </Link>
                )}
                {!isLast && <span className="text-border">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
