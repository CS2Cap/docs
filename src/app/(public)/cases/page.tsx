import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listCases, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Cases — Browse Every Weapon Case",
  description: "Browse all Counter-Strike 2 weapon cases and their skins.",
};

export default async function CasesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const cases = listCases(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Cases</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{cases.length} cases</p>
        <GroupGrid groups={cases} hrefBase="/cases" />
      </main>
      <FooterSection />
    </>
  );
}
