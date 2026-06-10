import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { FilterableSubtypeSections } from "@/components/browse/FilterableSubtypeSections";
import { listAgentGroups, loadBrowseIndex } from "@/lib/browse/browse-index";
import { AGENT_SUBTYPES } from "@/lib/browse/taxonomy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Agents — Browse Every Agent Skin",
  description: "Browse all Counter-Strike 2 agents by collection.",
};

export default async function AgentsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const sections = listAgentGroups(ix).map((g) => ({ title: g.name, skins: g.agents }));
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Agents</h1>
        <FilterableSubtypeSections sections={sections} subtypeOrder={AGENT_SUBTYPES} />
      </main>
      <FooterSection />
    </>
  );
}
