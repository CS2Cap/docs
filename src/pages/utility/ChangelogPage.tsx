import { PublicLayout } from "@/components/PublicLayout";

const entries = [
  { date: "Mar 25, 2026", title: "Provider comparison on item pages", description: "You can now compare pricing across providers directly on any item detail page." },
  { date: "Mar 18, 2026", title: "Improved search filters", description: "Added wear condition and rarity filters to the item search page." },
  { date: "Mar 10, 2026", title: "Price alerts launched", description: "Set price alerts on any item and get notified when thresholds are crossed." },
  { date: "Feb 28, 2026", title: "API v1 released", description: "The CS2Cap API is now available with endpoints for items, pricing, and market data." },
  { date: "Feb 15, 2026", title: "Watchlist feature", description: "Track your favorite items with the new watchlist feature in your dashboard." },
];

export default function ChangelogPage() {
  return (
    <PublicLayout>
      <div className="container max-w-2xl py-12">
        <h1 className="text-3xl font-bold">Changelog</h1>
        <p className="mt-2 text-muted-foreground">Recent updates and improvements to CS2Cap.</p>
        <div className="mt-8 space-y-8">
          {entries.map((entry) => (
            <div key={entry.date} className="border-l-2 border-border pl-6 relative">
              <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <time className="text-xs text-muted-foreground">{entry.date}</time>
              <h3 className="mt-1 text-base font-semibold">{entry.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
