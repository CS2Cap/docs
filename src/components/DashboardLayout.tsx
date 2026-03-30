import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import {
  LayoutDashboard,
  Eye,
  Bell,
  User,
  Key,
  BarChart3,
  CreditCard,
  Settings,
} from "lucide-react";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Watchlist", href: "/watchlist", icon: Eye },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { type: "divider" as const },
  { label: "Account", href: "/account", icon: User },
  { label: "API Keys", href: "/account/api-keys", icon: Key },
  { label: "Usage", href: "/account/usage", icon: BarChart3 },
  { label: "Billing", href: "/account/billing", icon: CreditCard },
  { label: "Settings", href: "/account/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card p-4 lg:block">
          <nav className="flex flex-col gap-1">
            {sidebarLinks.map((item, i) => {
              if ("type" in item && item.type === "divider") {
                return <hr key={i} className="my-2 border-border" />;
              }
              const link = item as { label: string; href: string; icon: typeof LayoutDashboard };
              const active = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-secondary text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <link.icon size={16} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
