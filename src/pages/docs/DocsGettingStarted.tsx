import { DocsLayout } from "@/components/DocsLayout";

export default function DocsGettingStarted() {
  return (
    <DocsLayout>
      <h1 className="text-3xl font-bold">Getting Started</h1>
      <p className="mt-3 text-muted-foreground">Get up and running with the CS2Cap API in a few minutes.</p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold">1. Create an account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up at CS2Cap and navigate to your Account → API Keys page to generate a key.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Get your API key</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your API key is used to authenticate all requests. Keep it private and never expose it in client-side code.
          </p>
          <div className="mt-3 rounded-lg border border-border bg-card p-4">
            <code className="text-xs text-muted-foreground">Authorization: Bearer your_api_key_here</code>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Make your first request</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try searching for items:</p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
{`curl -H "Authorization: Bearer your_api_key_here" \\
  https://api.cs2cap.com/v1/items?q=redline`}
          </pre>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Explore the endpoints</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Check out the full endpoint reference to see what data is available, including items, pricing, market stats, and provider data.
          </p>
        </section>
      </div>
    </DocsLayout>
  );
}
