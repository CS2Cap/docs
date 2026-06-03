import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listStickerGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Stickers — Browse Every Sticker Collection",
  description: "Browse all Counter-Strike 2 stickers grouped by collection and capsule.",
};

export default async function StickersPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const groups = listStickerGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Stickers</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{groups.length} groups</p>
        <GroupGrid groups={groups} hrefBase="/stickers" noun="sticker" />
      </main>
      <FooterSection />
    </>
  );
}
