import { DashboardLayout } from "@/components/DashboardLayout";

export default function AccountUsage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Usage</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your API usage for the current billing period.</p>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-sm text-muted-foreground">API Requests</span>
            <p className="text-3xl font-bold">2,450 <span className="text-base text-muted-foreground font-normal">/ 10,000</span></p>
          </div>
          <span className="text-sm text-muted-foreground">24.5% used</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: "24.5%" }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Resets on Apr 30, 2026</p>
      </div>

      {/* Daily breakdown placeholder */}
      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Breakdown</h3>
        <div className="flex h-40 items-center justify-center rounded-md bg-secondary/30 text-sm text-muted-foreground">
          Usage chart placeholder
        </div>
      </div>
    </DashboardLayout>
  );
}
