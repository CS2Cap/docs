import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { RaritySections } from "@/components/browse/RaritySections";
import { caseDetail, listCases, loadBrowseIndex } from "@/lib/browse/browse-index";
import { groupByRarity, isSpecialCard } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return listCases(ix).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? caseDetail(ix, slug) : null;
  if (!detail) return { title: "Case Not Found" };
  return {
    title: `${detail.title} — CS2 Skins`,
    description: `All ${detail.count} skins in the ${detail.title}.`,
  };
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = caseDetail(ix, slug);
  if (!detail) notFound();

  const specials = detail.skins.filter(isSpecialCard);
  const skins = detail.skins.filter((c) => !isSpecialCard(c));

  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-8 font-mono text-sm text-muted-foreground">
          {detail.subtitle} · {detail.count} skins
        </p>
        <div className="flex flex-col gap-10">
          <RaritySections groups={groupByRarity(skins)} />
          {specials.length > 0 && (
            <section>
              <h2 className="mb-4 font-mono text-lg font-bold">Knives &amp; Gloves</h2>
              <RaritySections groups={groupByRarity(specials)} />
            </section>
          )}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
