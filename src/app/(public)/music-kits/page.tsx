import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { musicKitCards, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Music Kits — Browse Every Music Kit",
  description: "Browse all Counter-Strike 2 music kits.",
};

export default async function MusicKitsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const kits = musicKitCards(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">Music Kits</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{kits.length} music kits</p>
        <SkinGrid skins={kits} />
      </main>
      <FooterSection />
    </>
  );
}
