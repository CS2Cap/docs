import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableGroupGrid } from "@/components/browse/FilterableGroupGrid";
import { listCases, loadBrowseIndex } from "@/lib/browse/browse-index";
import { CRATE_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Cases — Browse Every Weapon Case",
  description: "Browse all Counter-Strike 2 weapon cases and their skins.",
};

export default async function CasesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const cases = listCases(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Cases</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{cases.length} cases</p>
        <FilterableGroupGrid groups={cases} hrefBase="/cases" subtypeOrder={CRATE_SUBTYPES} />
      </main>
      <FooterSection />
    </>
  );
}
