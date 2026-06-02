import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/FooterSection";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "CS2 Gear — Knives, Gloves & Agents",
  description: "Browse Counter-Strike 2 gear: every knife and glove finish plus T & CT agents.",
};

const CATEGORIES = [
  { label: "Knives", href: "/knives", blurb: "Every knife finish" },
  { label: "Gloves", href: "/gloves", blurb: "Every glove finish" },
  { label: "Agents", href: "/agents", blurb: "T & CT operators" },
];

export default function GearPage() {
  return (
    <>
      <main className="container py-8">
        <h1 className="mb-6 font-mono text-2xl font-bold">Gear</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="flex flex-col gap-1 border-2 border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <span className="font-mono text-lg font-semibold text-foreground">{c.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{c.blurb}</span>
            </Link>
          ))}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
