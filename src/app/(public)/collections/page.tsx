import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listCollections, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Collections — Browse Every Skin Collection",
  description: "Browse all Counter-Strike 2 weapon skin collections.",
};

export default async function CollectionsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const collections = listCollections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Collections</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">
          {collections.length} collections
        </p>
        <GroupGrid groups={collections} hrefBase="/collections" />
      </main>
      <FooterSection />
    </>
  );
}
