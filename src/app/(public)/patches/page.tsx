import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableSubtypeSections } from "@/components/browse/FilterableSubtypeSections";
import { patchSections, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Patches — Browse Every Patch",
  description: "Browse all Counter-Strike 2 patches by type.",
};

export default async function PatchesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const sections = patchSections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Patches</h1>
        <FilterableSubtypeSections sections={sections} />
      </main>
      <FooterSection />
    </>
  );
}
