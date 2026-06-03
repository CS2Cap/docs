import Link from "next/link";
import { FooterSection } from "@/components/FooterSection";

// Graceful fallback when the item catalog snapshot is transiently unavailable
// (e.g. a blob read failed at build/revalidate time). Renders a normal 200 page
// instead of a hard notFound() 404; ISR will refill it on the next revalidation.
export function BrowseUnavailable() {
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Catalog Unavailable</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">
          The item catalog is being refreshed — please try again in a moment.
        </p>
        <Link
          href="/browse"
          className="border-2 border-border bg-card px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Back to Browse
        </Link>
      </main>
      <FooterSection />
    </>
  );
}
