"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "What counts as a request?",
    a: "Any HTTP call to api.cs2c.app/v1/* counts as one request. Batch endpoints (e.g. /v1/prices/batch) count once per call regardless of how many items you return.",
  },
  {
    q: "Can I switch billing rails?",
    a: "Yes. Stripe (card / SEPA / Apple-Google Pay) and NowPayments (crypto) are both supported. Quarterly billing saves 16% on every paid plan on both rails.",
  },
  {
    q: "Can I change plans at any time?",
    a: "Yes. Upgrades take effect immediately and are prorated. Downgrades take effect at the end of the current billing cycle.",
  },
  {
    q: "Which marketplaces have buy orders?",
    a: "BUFF163, Youpin898, Buff Market, C5GAME, CSFloat, DMarket, ECOSteam, Market.CSGO, Steam, WAXPEER, white.market and Dupe.fi — that's 12 of the 41 supported markets.",
  },
  {
    q: "Do you offer refunds?",
    a: "No. All fees are non-refundable. You can cancel anytime and your plan stays active until the end of the current billing cycle — but past charges aren't returned.",
  },
];

export function PricingFaq() {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="faq-0"
      className="border-2 border-border divide-y-2 divide-border bg-card"
    >
      {FAQ_ITEMS.map((item, i) => (
        <AccordionItem
          key={item.q}
          value={`faq-${i}`}
          className="border-b-0 px-5 md:px-6"
        >
          <AccordionTrigger className="py-5 text-left font-sans text-base font-bold tracking-tight text-foreground hover:no-underline md:text-lg">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-5 font-mono text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
