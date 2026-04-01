import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";
import { Eye, Bell, TrendingUp, Activity } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

const apiUsageData = [
  { day: "Mon", requests: 180 },
  { day: "Tue", requests: 320 },
  { day: "Wed", requests: 247 },
  { day: "Thu", requests: 410 },
  { day: "Fri", requests: 390 },
  { day: "Sat", requests: 150 },
  { day: "Sun", requests: 95 },
];

const alertsData = [
  { day: "Mon", triggered: 1 },
  { day: "Tue", triggered: 0 },
  { day: "Wed", triggered: 2 },
  { day: "Thu", triggered: 0 },
  { day: "Fri", triggered: 1 },
  { day: "Sat", triggered: 0 },
  { day: "Sun", triggered: 1 },
];

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

      {/* Charts row */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* API usage chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">API Requests (7d)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={apiUsageData}>
                <defs>
                  <linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(187 85% 53%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(187 85% 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 15% 18%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(222 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(222 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(222 25% 9%)", border: "1px solid hsl(222 15% 18%)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(222 10% 60%)" }}
                  itemStyle={{ color: "hsl(187 85% 53%)" }}
                />
                <Area type="monotone" dataKey="requests" stroke="hsl(187 85% 53%)" fill="url(#apiGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts triggered chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Alerts Triggered (7d)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 15% 18%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(222 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(222 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(222 25% 9%)", border: "1px solid hsl(222 15% 18%)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(222 10% 60%)" }}
                  itemStyle={{ color: "hsl(187 85% 53%)" }}
                />
                <Bar dataKey="triggered" fill="hsl(187 85% 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
