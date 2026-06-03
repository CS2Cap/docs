import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listCharmGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Charms — Browse Every Charm Collection",
  description: "Browse all Counter-Strike 2 charms grouped by collection.",
};

export default async function CharmsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const groups = listCharmGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Charms</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} collections</p>
        <GroupGrid groups={groups} hrefBase="/charms" noun="charm" />
      </main>
      <FooterSection />
    </>
  );
}
