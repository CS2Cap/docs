import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listGraffitiGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Graffiti — Browse Every Graffiti Collection",
  description: "Browse all Counter-Strike 2 sealed graffiti grouped by collection.",
};

export default async function GraffitiPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const groups = listGraffitiGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Graffiti</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} collections</p>
        <GroupGrid groups={groups} hrefBase="/graffiti" noun="item" />
      </main>
      <FooterSection />
    </>
  );
}
