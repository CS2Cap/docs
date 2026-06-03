import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { collectibleSections, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Collectibles — Pins & Passes",
  description: "Browse Counter-Strike 2 collectibles: pins, operation passes, and tournament passes.",
};

export default async function CollectiblesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const sections = collectibleSections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Collectibles</h1>
        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{section.title}</h2>
              <SkinGrid skins={section.skins} />
            </section>
          ))}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
