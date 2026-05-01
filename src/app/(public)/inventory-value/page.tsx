import type { Metadata } from "next";
import Link from "next/link";
import { FooterSection } from "@/components/FooterSection";
import { InventoryValueTool } from "./InventoryValueTool";

const TITLE = "CS2 Inventory Value Checker — Live Steam Inventory Pricing";
const DESCRIPTION =
  "Instantly value any public CS2 Steam inventory. Paste a SteamID64, vanity name, or profile URL and see live USD pricing across 35+ marketplaces.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/inventory-value" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://cs2cap.com/inventory-value",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const STEPS = [
  {
    n: "01",
    title: "Paste a Steam profile",
    desc: "SteamID64, vanity name, or full steamcommunity.com URL — all three work.",
  },
  {
    n: "02",
    title: "We fetch the live inventory",
    desc: "Each item is matched to the CS2Cap catalog by market hash name and phase. Doppler phases are valued separately.",
  },
  {
    n: "03",
    title: "Priced at the best ask",
    desc: "Every resolved item is valued at the lowest current ask indexed across 35+ marketplaces.",
  },
];

export default function InventoryValuePage() {
  return (
    <>
      <main>
        <InventoryValueTool />

        {/* How it works */}
        <section className="border-t-2 border-border bg-grid py-20">
          <div className="container">
            <div className="mb-10 text-center">
              <div className="mb-3 font-mono text-xs tracking-widest text-primary">
                // HOW IT WORKS
              </div>
              <h2 className="display-heading text-3xl font-black tracking-tighter md:text-5xl">
                FROM STEAM ID TO LIVE VALUE
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n} className="bg-card p-6 md:p-8">
                  <div className="font-mono text-xs tracking-widest text-primary">
                    {step.n}
                  </div>
                  <h3 className="mt-3 font-mono text-base font-bold tracking-wide">
                    {step.title}
                  </h3>
                  <p className="mt-2 font-mono text-[13px] leading-6 text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About / SEO copy */}
        <section className="border-t-2 border-border py-20">
          <div className="container max-w-3xl">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-1 bg-primary" />
              <h2 className="font-mono text-sm font-bold tracking-widest">
                ABOUT THIS TOOL
              </h2>
            </div>
            <div className="space-y-4 font-mono text-sm leading-7 text-muted-foreground">
              <p>
                The CS2Cap Inventory Value Checker prices any public CS2 Steam
                inventory using live market data from the same unified index that
                powers the rest of CS2Cap. Inventories are fetched on demand and
                are not stored as a saved portfolio — every lookup hits Steam and
                CS2Cap in real time.
              </p>
              <p>
                Each item in an inventory is matched against our catalog by its
                market hash name and, where applicable, its Doppler or Gamma
                phase. Phased items are valued against their exact phase entry —
                we never mix Ruby with Black Pearl, or Phase 1 with Phase 4.
                Items that can&apos;t be matched to a catalog entry are listed
                separately so you can see exactly what was and wasn&apos;t priced.
              </p>
              <p>
                Want to dig deeper? Open any item to see its full price history,
                buy orders, recent sales, and per-marketplace breakdown. If
                you&apos;re building your own tools on top of this data, the same
                endpoints are available through{" "}
                <Link href="/api-info" className="text-primary hover:underline">
                  the CS2Cap API
                </Link>
                . You can also{" "}
                <Link href="/search" className="text-primary hover:underline">
                  browse the full catalog
                </Link>{" "}
                or read the{" "}
                <Link href="/cs2-price-history-api" className="text-primary hover:underline">
                  CS2 price history guide
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}
