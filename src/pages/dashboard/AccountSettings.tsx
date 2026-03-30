import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";

export default function AccountSettings() {
  const [displayName, setDisplayName] = useState("Demo User");
  const [email] = useState("user@example.com");

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your account settings.</p>

      <div className="mt-6 max-w-lg space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Save Changes
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-card p-6">
          <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Permanently delete your account and all associated data.
          </p>
          <button className="rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            Delete Account
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
