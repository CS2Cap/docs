import { DocsLayout } from "@/components/DocsLayout";

export default function DocsAuthentication() {
  return (
    <DocsLayout>
      <h1 className="text-3xl font-bold">Authentication</h1>
      <p className="mt-3 text-muted-foreground">How to authenticate your API requests.</p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold">API Keys</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            All API requests require an API key passed via the <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">Authorization</code> header.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
{`GET /v1/items
Authorization: Bearer cs2cap_sk_live_xxxxxxxxxxxx`}
          </pre>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Key Types</h2>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-semibold">Live Keys</h4>
              <p className="mt-1 text-xs text-muted-foreground">Prefixed with <code className="rounded bg-secondary px-1 py-0.5">cs2cap_sk_live_</code>. Used for production requests. Counts toward your usage quota.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-semibold">Test Keys</h4>
              <p className="mt-1 text-xs text-muted-foreground">Prefixed with <code className="rounded bg-secondary px-1 py-0.5">cs2cap_sk_test_</code>. Returns mock data. Does not count toward quota.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Rate Limits</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Rate limits vary by plan. Exceeding the limit returns a <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">429</code> status. Check the <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">X-RateLimit-*</code> headers for current usage.
          </p>
        </section>
      </div>
    </DocsLayout>
  );
}
