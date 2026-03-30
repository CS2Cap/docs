import { PublicLayout } from "@/components/PublicLayout";
import { CheckCircle } from "lucide-react";

const services = [
  { name: "API", status: "Operational", uptime: "99.98%" },
  { name: "Website", status: "Operational", uptime: "99.99%" },
  { name: "Data Pipeline", status: "Operational", uptime: "99.95%" },
  { name: "Alerting Service", status: "Operational", uptime: "99.97%" },
];

export default function StatusPage() {
  return (
    <PublicLayout>
      <div className="container py-12">
        <h1 className="text-3xl font-bold">System Status</h1>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
          <CheckCircle size={14} />
          All Systems Operational
        </div>
        <div className="mt-8 space-y-3">
          {services.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{s.status}</span>
                <span>{s.uptime} uptime</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
