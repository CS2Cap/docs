import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listKnives, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Knives — Browse Every Knife Skin",
  description: "Browse all Counter-Strike 2 knife types and their finishes.",
};

export default async function KnivesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const knives = listKnives(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Knives</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{knives.length} knife types</p>
        <GroupGrid groups={knives} hrefBase="/knives" />
      </main>
      <FooterSection />
    </>
  );
}
