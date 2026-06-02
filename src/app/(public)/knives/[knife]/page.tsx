import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { baseDetail, listKnives, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listKnives(ix).map((k) => ({ knife: k.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ knife: string }>;
}): Promise<Metadata> {
  const { knife } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? baseDetail(ix, knife) : null;
  if (!detail) return { title: "Knife Not Found" };
  return {
    title: `${detail.title} Skins — CS2`,
    description: `All ${detail.count} ${detail.title} finishes in Counter-Strike 2.`,
  };
}

export default async function KnifeDetailPage({
  params,
}: {
  params: Promise<{ knife: string }>;
}) {
  const { knife } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = baseDetail(ix, knife);
  if (!detail || detail.subtitle !== "Knives") notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} finishes</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
