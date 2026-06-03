import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterSection } from "@/components/FooterSection";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { patchSections, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Patches — Browse Every Patch",
  description: "Browse all Counter-Strike 2 patches by type.",
};

export default async function PatchesPage() {
  const ix = await loadBrowseIndex();
  if (!ix) notFound();
  const sections = patchSections(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Patches</h1>
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
