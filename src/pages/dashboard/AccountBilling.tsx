import { DashboardLayout } from "@/components/DashboardLayout";
import { Check } from "lucide-react";

export default function AccountBilling() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your subscription and billing info.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Plan</h3>
          <p className="text-2xl font-bold text-primary">Pro — $19/mo</p>
          <ul className="mt-4 space-y-2">
            {["Unlimited watchlist", "Price alerts", "API access", "Priority support"].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check size={12} className="text-primary" /> {f}
              </li>
            ))}
          </ul>
          <button className="mt-6 w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent">
            Change Plan
          </button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment Method</h3>
          <div className="rounded-md border border-border bg-secondary/50 p-4">
            <p className="text-sm font-medium">•••• •••• •••• 4242</p>
            <p className="text-xs text-muted-foreground">Expires 12/2027</p>
          </div>
          <button className="mt-4 text-sm text-primary hover:underline">Update payment method</button>

          <h3 className="mt-8 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invoice History</h3>
          <div className="space-y-2">
            {[
              { date: "Mar 1, 2026", amount: "$19.00" },
              { date: "Feb 1, 2026", amount: "$19.00" },
              { date: "Jan 1, 2026", amount: "$19.00" },
            ].map((inv) => (
              <div key={inv.date} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{inv.date}</span>
                <span>{inv.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
