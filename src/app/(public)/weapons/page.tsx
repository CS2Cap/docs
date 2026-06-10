import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableGroupSections } from "@/components/browse/FilterableGroupSections";
import { listWeaponPageSections, loadBrowseIndex } from "@/lib/browse/browse-index";
import { WEAPON_PAGE_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Weapons — Browse Every Weapon Skin",
  description: "Browse all Counter-Strike 2 weapons by category and view their skins.",
};

export default async function WeaponsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const sections = listWeaponPageSections(ix).map((sec) => {
    const base =
      sec.subtype === "Knives" ? "/knives" : sec.subtype === "Gloves" ? "/gloves" : "/weapons";
    return base === "/weapons"
      ? sec
      : { ...sec, groups: sec.groups.map((g) => ({ ...g, href: `${base}/${g.slug}` })) };
  });
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Weapons</h1>
        <FilterableGroupSections
          sections={sections}
          hrefBase="/weapons"
          subtypeOrder={WEAPON_PAGE_SUBTYPES}
        />
      </main>
      <FooterSection />
    </>
  );
}
