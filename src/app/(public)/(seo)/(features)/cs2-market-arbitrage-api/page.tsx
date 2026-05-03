import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildPageMetadata, getPageBySlug } from "@/lib/seo/landing-pages";

const SLUG = "cs2-market-arbitrage-api";
const page = getPageBySlug(SLUG)!;

export const metadata: Metadata = buildPageMetadata(SLUG);

export default function Page() {
  return <SeoLandingPage config={page} />;
}
