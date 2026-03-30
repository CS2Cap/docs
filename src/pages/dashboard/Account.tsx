import { DashboardLayout } from "@/components/DashboardLayout";
import { User, Mail, Calendar } from "lucide-react";

export default function Account() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your account overview.</p>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <User size={24} className="text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Demo User</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Mail size={12} /> user@example.com</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> Joined Jan 2026</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Current Plan</h3>
          <p className="mt-1 text-2xl font-bold text-primary">Pro</p>
          <p className="mt-1 text-xs text-muted-foreground">Renews on Apr 30, 2026</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">API Usage</h3>
          <p className="mt-1 text-2xl font-bold">2,450 <span className="text-sm text-muted-foreground font-normal">/ 10,000</span></p>
          <p className="mt-1 text-xs text-muted-foreground">Requests this billing period</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
