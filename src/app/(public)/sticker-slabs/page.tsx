import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listSlabGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Sticker Slabs — Browse by Tournament",
  description: "Browse all Counter-Strike 2 sticker slabs grouped by tournament.",
};

export default async function StickerSlabsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const groups = listSlabGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Sticker Slabs</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} groups</p>
        <GroupGrid groups={groups} hrefBase="/sticker-slabs" noun="slab" />
      </main>
      <FooterSection />
    </>
  );
}
