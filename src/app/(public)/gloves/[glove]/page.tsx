import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableSkinGrid } from "@/components/browse/FilterableSkinGrid";
import { baseDetail, listGloves, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listGloves(ix).map((g) => ({ glove: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ glove: string }>;
}): Promise<Metadata> {
  const { glove } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? baseDetail(ix, glove) : null;
  if (!detail) return { title: "Glove Not Found" };
  return {
    title: `${detail.title} Skins — CS2`,
    description: `All ${detail.count} ${detail.title} finishes in Counter-Strike 2.`,
  };
}

export default async function GloveDetailPage({
  params,
}: {
  params: Promise<{ glove: string }>;
}) {
  const { glove } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const detail = baseDetail(ix, glove);
  if (!detail || detail.subtitle !== "Gloves") notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} finishes</p>
        <FilterableSkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
