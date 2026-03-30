import { DashboardLayout } from "@/components/DashboardLayout";
import { Key, Copy, Plus, Trash2 } from "lucide-react";

const keys = [
  { name: "Production", key: "cs2cap_sk_live_xxxx...xxxx", created: "Jan 15, 2026", lastUsed: "Today" },
  { name: "Development", key: "cs2cap_sk_test_yyyy...yyyy", created: "Feb 3, 2026", lastUsed: "2 days ago" },
];

export default function AccountApiKeys() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your API keys.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus size={14} />
          Create Key
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {keys.map((k) => (
          <div key={k.name} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-primary" />
                <span className="text-sm font-semibold">{k.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-muted-foreground hover:text-foreground"><Copy size={14} /></button>
                <button className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
            <code className="mt-2 block text-xs text-muted-foreground">{k.key}</code>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>Created: {k.created}</span>
              <span>Last used: {k.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
