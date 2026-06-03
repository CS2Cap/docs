import type { Metadata } from "next";
import { FooterSection } from "@/components/FooterSection";
import { BrowseUnavailable } from "@/components/browse/BrowseUnavailable";
import { SkinGrid } from "@/components/browse/SkinGrid";
import { listAgentGroups, loadBrowseIndex } from "@/lib/browse/browse-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Agents — Browse Every Agent Skin",
  description: "Browse all Counter-Strike 2 agents by collection.",
};

export default async function AgentsPage() {
  const ix = await loadBrowseIndex();
  if (!ix) return <BrowseUnavailable />;
  const groups = listAgentGroups(ix);
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Agents</h1>
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="mb-3 font-mono text-lg font-semibold text-primary">{group.name}</h2>
              <SkinGrid skins={group.agents} />
            </section>
          ))}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
