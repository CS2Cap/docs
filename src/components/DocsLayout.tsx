import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Book, Zap, Lock, List, Code } from "lucide-react";

const docNav = [
  { label: "Overview", href: "/docs", icon: Book },
  { label: "Getting Started", href: "/docs/getting-started", icon: Zap },
  { label: "Authentication", href: "/docs/authentication", icon: Lock },
  { label: "Endpoints", href: "/docs/endpoints", icon: List },
  { label: "Examples", href: "/docs/examples", icon: Code },
];

export function DocsLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex flex-1 gap-0">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-border pr-6 pt-8 lg:block">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documentation
          </h3>
          <nav className="flex flex-col gap-1">
            {docNav.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-secondary text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 py-8 lg:pl-8">
          {/* Mobile nav */}
          <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
            {docNav.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
