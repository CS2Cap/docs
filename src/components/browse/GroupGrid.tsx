import type { GroupSummary } from "@/lib/browse/taxonomy";
import { GroupCard } from "./GroupCard";

export function GroupGrid({
  groups,
  hrefBase,
  noun,
}: {
  groups: GroupSummary[];
  hrefBase: string; // e.g. "/collections"
  noun?: string;
}) {
  if (groups.length === 0) {
    return <p className="font-mono text-sm text-muted-foreground">Nothing here yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {groups.map((g) => (
        <GroupCard
          key={g.slug}
          href={`${hrefBase}/${g.slug}`}
          name={g.name}
          image={g.image}
          count={g.count}
          noun={noun}
        />
      ))}
    </div>
  );
}
