import { DocsLayout } from "@/components/DocsLayout";

const examples = [
  {
    title: "Search items (cURL)",
    language: "bash",
    code: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://api.cs2cap.com/v1/items?q=asiimov&wear=field-tested"`,
  },
  {
    title: "Get item pricing (JavaScript)",
    language: "javascript",
    code: `const res = await fetch("https://api.cs2cap.com/v1/items/awp-asiimov/prices", {
  headers: { Authorization: "Bearer YOUR_API_KEY" },
});
const data = await res.json();
console.log(data.prices);`,
  },
  {
    title: "Get market overview (Python)",
    language: "python",
    code: `import requests

headers = {"Authorization": "Bearer YOUR_API_KEY"}
res = requests.get("https://api.cs2cap.com/v1/market/overview", headers=headers)
data = res.json()
print(data["volume_24h"])`,
  },
];

export default function DocsExamples() {
  return (
    <DocsLayout>
      <h1 className="text-3xl font-bold">Code Examples</h1>
      <p className="mt-3 text-muted-foreground">
        Common API usage patterns in different languages.
      </p>

      <div className="mt-8 space-y-8">
        {examples.map((ex) => (
          <section key={ex.title}>
            <h2 className="text-lg font-semibold">{ex.title}</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
              {ex.code}
            </pre>
          </section>
        ))}
      </div>
    </DocsLayout>
  );
}
