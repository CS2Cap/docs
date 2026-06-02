import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { baseDetail, listWeapons, loadBrowseIndex } from "@/lib/browse/browse-index";
import { WEAPON_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export async function generateStaticParams() {
  const ix = await loadBrowseIndex();
  if (!ix) return [];
  return WEAPON_SUBTYPES.flatMap((s) => listWeapons(ix, s)).map((w) => ({ weapon: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ weapon: string }>;
}): Promise<Metadata> {
  const { weapon } = await params;
  const ix = await loadBrowseIndex();
  const detail = ix ? baseDetail(ix, weapon) : null;
  if (!detail) return { title: "Weapon Not Found" };
  return {
    title: `${detail.title} Skins — CS2`,
    description: `All ${detail.count} ${detail.title} skins in Counter-Strike 2.`,
  };
}

export default async function WeaponDetailPage({
  params,
}: {
  params: Promise<{ weapon: string }>;
}) {
  const { weapon } = await params;
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const detail = baseDetail(ix, weapon);
  // Guard: knives/gloves are served by their own routes.
  if (!detail || detail.subtitle === "Knives" || detail.subtitle === "Gloves") notFound();
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-1 font-mono text-2xl font-bold">{detail.title}</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">{detail.count} skins</p>
        <SkinGrid skins={detail.skins} />
      </main>
      <FooterSection />
    </>
  );
}
