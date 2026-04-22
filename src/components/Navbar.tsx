"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, X, Search, LayoutDashboard, Eye, Bell, User, Key, BarChart3, CreditCard, Settings, LogOut } from "lucide-react";
import { useSession, webApi } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "SEARCH", href: "/search" },
  { label: "API", href: "/api-info" },
  { label: "DASHBOARD", href: "/dashboard" },
  { label: "DOCS", href: "https://docs.cs2cap.com/", external: true },
  { label: "UPTIME", href: "https://status.cs2c.app/", external: true },
];

const accountMenuItems = [
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

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useSession();

  const isActive = (href: string) => pathname === href;
  const isAuthed = Boolean(session);

  const avatarUrl = session?.linked_providers?.find((p) => p.avatar_url)?.avatar_url;
  const displayName =
    session?.display_name ??
    session?.linked_providers?.find((p) => p.display_name)?.display_name ??
    session?.email ??
    "Account";
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    try {
      await webApi.logout();
    } finally {
      queryClient.clear();
      router.push("/");
      router.refresh();
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b-2 border-border bg-background/90 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/assets/logo.svg" alt="CS2Cap" width={32} height={32} />
          <span className="font-mono text-lg font-bold tracking-tight">
            CS2<span className="text-gradient-brand">Cap</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 font-mono text-sm font-semibold tracking-wider text-foreground/90 hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className={`px-3 py-1.5 font-mono text-sm font-semibold tracking-wider transition-colors ${isActive(item.href) ? "text-primary" : "text-foreground/90 hover:text-primary"
                  }`}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 ml-auto">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="h-8 w-44 bg-muted/50 border border-border pl-8 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </form>

          {isAuthed ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-9 w-9 items-center justify-center overflow-hidden border-2 border-border bg-secondary font-mono text-xs font-bold text-foreground transition-colors hover:border-primary focus:outline-none focus:border-primary"
                aria-label="Account menu"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span>{initials || <User className="h-4 w-4" strokeWidth={1.5} />}</span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-none border-2 border-border bg-popover p-0">
                <DropdownMenuLabel className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <div className="truncate text-foreground text-xs normal-case tracking-normal">{displayName}</div>
                  {session?.email && (
                    <div className="truncate text-[10px] text-muted-foreground normal-case tracking-normal">
                      {session.email}
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-0 bg-border" />
                {accountMenuItems.map((item, i) => {
                  if ("type" in item && item.type === "divider") {
                    return <DropdownMenuSeparator key={`div-${i}`} className="my-0 bg-border" />;
                  }
                  const { label, href, icon: Icon } = item as {
                    label: string;
                    href: string;
                    icon: React.ElementType;
                  };
                  return (
                    <DropdownMenuItem key={href} asChild className="rounded-none focus:bg-secondary focus:text-primary">
                      <Link
                        href={href}
                        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 font-mono text-xs tracking-wider hover:text-primary focus:text-primary"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator className="my-0 bg-border" />
                <DropdownMenuItem
                  onSelect={() => void handleLogout()}
                  className="cursor-pointer rounded-none px-3 py-2 font-mono text-xs tracking-wider text-destructive focus:bg-secondary focus:text-destructive hover:text-destructive"
                >
                  <LogOut className="mr-3 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  LOG OUT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="border-brutal-accent px-4 py-1.5 font-mono text-xs font-bold tracking-wider text-primary brutalist-hover"
            >
              SIGN IN
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t-2 border-border bg-background">
          <div className="container py-4 flex flex-col gap-2">
            <form onSubmit={handleSearch} className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="h-9 w-full bg-muted/50 border border-border pl-8 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </form>
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 font-mono text-xs tracking-wider text-muted-foreground"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 font-mono text-xs tracking-wider ${isActive(item.href) ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  {item.label}
                </Link>
              )
            )}
            {isAuthed ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void handleLogout();
                }}
                className="px-3 py-2 text-left font-mono text-xs font-bold tracking-wider text-primary"
              >
                LOG OUT
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 font-mono text-xs font-bold tracking-wider text-primary"
              >
                SIGN IN
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
