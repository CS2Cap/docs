import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { GroupGrid } from "@/components/browse/GroupGrid";
import { listWeapons, loadBrowseIndex } from "@/lib/browse/browse-index";
import { WEAPON_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Weapons — Browse Every Weapon Skin",
  description: "Browse all Counter-Strike 2 weapons by category and view their skins.",
};

export default async function WeaponsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Weapons</h1>
        <div className="flex flex-col gap-10">
          {WEAPON_SUBTYPES.map((subtype) => {
            const weapons = listWeapons(ix, subtype);
            if (weapons.length === 0) return null;
            return (
              <section key={subtype} id={subtype.toLowerCase()} className="scroll-mt-20">
                <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{subtype}</h2>
                <GroupGrid groups={weapons} hrefBase="/weapons" />
              </section>
            );
          })}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
