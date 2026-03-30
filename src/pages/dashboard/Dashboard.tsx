import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";
import { Eye, Bell, TrendingUp, Activity } from "lucide-react";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back. Here's your overview.</p>

      {/* Quick stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Eye, label: "Watchlist Items", value: "12" },
          { icon: Bell, label: "Active Alerts", value: "3" },
          { icon: TrendingUp, label: "Alerts Triggered (7d)", value: "5" },
          { icon: Activity, label: "API Requests (today)", value: "247" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <stat.icon size={14} />
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent watchlist */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Watchlist</h2>
          <Link to="/watchlist" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { name: "AK-47 | Redline", price: "$12.34", change: "+2.1%" },
            { name: "AWP | Asiimov", price: "$28.90", change: "-0.8%" },
            { name: "Glock-18 | Fade", price: "$890.50", change: "+1.2%" },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm font-medium">{item.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm">{item.price}</span>
                <span className={`text-xs font-medium ${item.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                  {item.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
