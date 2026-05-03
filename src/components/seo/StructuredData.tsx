/**
 * Renders a JSON-LD <script> tag for structured data.
 */
export function StructuredData({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ---------- Reusable builders ---------- */

const SITE_URL = "https://cs2cap.com";
const BRAND = "CS2Cap";

export function buildOrganization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: SITE_URL,
    logo: `${SITE_URL}/assets/logo.svg`,
  };
}

export function buildWebSite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND,
    url: SITE_URL,
  };
}

export function buildWebApplication() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: BRAND,
    url: SITE_URL,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "All",
    description:
      "Unified REST API for CS2 and CSGO skin market data across 39+ marketplaces.",
  };
}

export function buildBreadcrumbList(
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildFAQPage(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function buildProduct(input: {
  name: string;
  url: string;
  description: string;
  image?: string;
  category?: string;
  lowestAskCents?: number | null;
  highestAskCents?: number | null;
  offerCount?: number;
  currency?: string;
}) {
  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    url: input.url,
    description: input.description,
    brand: { "@type": "Brand", name: "Counter-Strike 2" },
  };

  if (input.image) {
    product.image = input.image;
  }
  if (input.category) {
    product.category = input.category;
  }

  if (input.lowestAskCents != null && (input.offerCount ?? 0) > 0) {
    const lowDollars = input.lowestAskCents / 100;
    const highCents = input.highestAskCents ?? input.lowestAskCents;
    const highDollars = highCents / 100;
    product.offers = {
      "@type": "AggregateOffer",
      priceCurrency: input.currency ?? "USD",
      lowPrice: lowDollars.toFixed(2),
      highPrice: highDollars.toFixed(2),
      offerCount: input.offerCount,
      availability: "https://schema.org/InStock",
    };
  }

  return product;
}
