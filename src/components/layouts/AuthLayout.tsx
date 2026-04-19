"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
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

const sidebarItems = [
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

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r-2 border-border min-h-[calc(100vh-3.5rem)] flex-col bg-sidebar py-6 px-3">
          <nav className="flex flex-col gap-0.5">
            {sidebarItems.map((item, i) => {
              if ("type" in item && item.type === "divider") {
                return <div key={i} className="my-3 border-t border-border" />;
              }
              const { label, href, icon: Icon } = item as { label: string; href: string; icon: React.ElementType };
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 font-mono text-xs tracking-wider transition-colors ${
                    active
                      ? "bg-sidebar-accent text-primary border-l-2 border-primary -ml-px"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
