"use client";

import Link from "next/link";
import { formatCompact } from "@/lib/api";

export function HeroSection({
  providerCount,
  totalItems,
}: {
  providerCount: number;
  totalItems: number;
}) {
  return (
    <section className="relative min-h-[85vh] flex items-center bg-grid overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-64 h-64 border-2 border-primary/10 rotate-12" />
      <div className="absolute bottom-20 left-10 w-48 h-48 border-2 border-primary/5 -rotate-6" />
      <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-primary animate-pulse-glow" />
      <div className="absolute top-2/3 left-1/3 w-1.5 h-1.5 bg-accent animate-pulse-glow" style={{ animationDelay: "1s" }} />

      <div className="container relative z-10">
        <div className="max-w-4xl">
          {/* Status bar */}
          <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
            <div className="h-2 w-2 bg-success animate-pulse-glow" />
            <span className="font-mono text-xs tracking-widest text-success uppercase">
              {providerCount} markets · live
            </span>
          </div>

          {/* Main heading */}
          <h1 className="display-heading mb-6 animate-fade-in-up text-5xl font-black tracking-tighter md:text-7xl lg:text-8xl" style={{ animationDelay: "0.1s" }}>
            <span className="text-foreground">CS2 SKIN</span>
            <br />
            <span className="text-gradient-brand glow-text">MARKET</span>
            <br />
            <span className="text-foreground">API<span className="text-primary">.</span></span>
          </h1>

          {/* Subtitle */}
          <p className="font-mono text-sm md:text-base text-muted-foreground max-w-xl mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            One REST API for real-time CS2 skin prices, buy orders, sales history, and analytics across {providerCount}+ marketplaces. Built for developers and trading tools.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Link href="/api-info" className="bg-primary text-primary-foreground font-mono text-sm font-bold px-8 py-3 border-2 border-primary brutalist-hover tracking-wider inline-block">
              EXPLORE THE API
            </Link>
            <a
              href="https://docs.cs2cap.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="border-brutal text-foreground font-mono text-sm font-bold px-8 py-3 brutalist-hover tracking-wider hover:border-primary transition-colors inline-block"
            >
              VIEW DOCS
            </a>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            {[
              { value: providerCount.toLocaleString(), label: "MARKETPLACES" },
              { value: formatCompact(totalItems), label: "ITEMS TRACKED" },
              { value: "Live", label: "PRICES" },
              { value: "365+", label: "DAYS OF HISTORY" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card p-4 md:p-6">
                <div className="font-mono text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
