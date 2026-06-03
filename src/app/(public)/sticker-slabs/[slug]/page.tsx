import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { listSlabGroups, slabGroupDetail, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listSlabGroups(ix).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? slabGroupDetail(ix, slug) : null;
  if (!detail) return { title: "Sticker Slabs Not Found" };
  return {
    title: `${detail.title} Sticker Slabs — CS2`,
    description: `All ${detail.count} sticker slabs in ${detail.title}.`,
  };
}

export default async function SlabGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = slabGroupDetail(ix, slug);
  if (!detail) notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} slabs</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
