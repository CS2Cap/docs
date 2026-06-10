import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableSubtypeSections } from "@/components/browse/FilterableSubtypeSections";
import { collectibleSections, loadBrowseIndex } from "@/lib/browse/browse-index";
import { COLLECTIBLE_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Collectibles — Pins & Passes",
  description: "Browse Counter-Strike 2 collectibles: pins, operation passes, and tournament passes.",
};

export default async function CollectiblesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const sections = collectibleSections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Collectibles</h1>
        <FilterableSubtypeSections sections={sections} subtypeOrder={COLLECTIBLE_SUBTYPES} />
      </main>
      <FooterSection />
    </>
  );
}
