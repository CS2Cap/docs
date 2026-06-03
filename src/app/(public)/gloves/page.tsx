import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listGloves, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Gloves — Browse Every Glove Skin",
  description: "Browse all Counter-Strike 2 glove types and their finishes.",
};

export default async function GlovesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const gloves = listGloves(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Gloves</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{gloves.length} glove types</p>
        <GroupGrid groups={gloves} hrefBase="/gloves" />
      </main>
      <FooterSection />
    </>
  );
}
