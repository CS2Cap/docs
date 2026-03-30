import { DocsLayout } from "@/components/DocsLayout";

const endpoints = [
  {
    category: "Items",
    items: [
      { method: "GET", path: "/v1/items", description: "List or search items with optional filters." },
      { method: "GET", path: "/v1/items/:id", description: "Get a single item by ID." },
      { method: "GET", path: "/v1/items/:id/prices", description: "Get current pricing from all providers." },
      { method: "GET", path: "/v1/items/:id/history", description: "Get historical price data." },
    ],
  },
  {
    category: "Market",
    items: [
      { method: "GET", path: "/v1/market/overview", description: "Aggregated market stats and summary." },
      { method: "GET", path: "/v1/market/trending", description: "Currently trending items by volume or price movement." },
      { method: "GET", path: "/v1/market/recent-sales", description: "Recent sales across all providers." },
    ],
  },
  {
    category: "Providers",
    items: [
      { method: "GET", path: "/v1/providers", description: "List available marketplace providers." },
      { method: "GET", path: "/v1/providers/:id", description: "Get provider details and status." },
    ],
  },
];

const methodColor: Record<string, string> = {
  GET: "text-emerald-400 bg-emerald-500/10",
  POST: "text-blue-400 bg-blue-500/10",
};

export default function DocsEndpoints() {
  return (
    <DocsLayout>
      <h1 className="text-3xl font-bold">Endpoints</h1>
      <p className="mt-3 text-muted-foreground">Complete reference of available API endpoints.</p>

      <div className="mt-8 space-y-10">
        {endpoints.map((group) => (
          <section key={group.category}>
            <h2 className="text-xl font-semibold">{group.category}</h2>
            <div className="mt-4 space-y-2">
              {group.items.map((ep) => (
                <div key={ep.path} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${methodColor[ep.method] || ""}`}>
                    {ep.method}
                  </span>
                  <div>
                    <code className="text-sm font-medium">{ep.path}</code>
                    <p className="mt-1 text-xs text-muted-foreground">{ep.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DocsLayout>
  );
}
