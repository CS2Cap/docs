import { DashboardLayout } from "@/components/DashboardLayout";
import { Plus, Trash2, Bell } from "lucide-react";

const alerts = [
  { id: "1", item: "AK-47 | Redline", condition: "Price drops below $11.00", status: "Active" },
  { id: "2", item: "AWP | Asiimov", condition: "Price rises above $35.00", status: "Active" },
  { id: "3", item: "M4A4 | Howl", condition: "Price drops below $3,800.00", status: "Triggered" },
];

export default function Alerts() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your price alerts.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus size={14} />
          New Alert
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <Bell size={14} className={alert.status === "Active" ? "text-primary" : "text-muted-foreground"} />
              <div>
                <span className="text-sm font-medium">{alert.item}</span>
                <p className="text-xs text-muted-foreground">{alert.condition}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                alert.status === "Active" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {alert.status}
              </span>
              <button className="text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
