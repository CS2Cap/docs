import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableSkinGrid } from "@/components/browse/FilterableSkinGrid";
import { listStickerGroups, stickerGroupDetail, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listStickerGroups(ix).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? stickerGroupDetail(ix, slug) : null;
  if (!detail) return { title: "Stickers Not Found" };
  return {
    title: `${detail.title} — CS2 Stickers`,
    description: `All ${detail.count} stickers in ${detail.title}.`,
  };
}

export default async function StickerGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const detail = stickerGroupDetail(ix, slug);
  if (!detail) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} stickers</p>
        <FilterableSkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
