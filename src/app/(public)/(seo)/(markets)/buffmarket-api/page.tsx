import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildPageMetadata, getPageBySlug } from "@/lib/seo/landing-pages";

const SLUG = "buffmarket-api";
const page = getPageBySlug(SLUG)!;

export const metadata: Metadata = buildPageMetadata(SLUG);

export default function Page() {
  return <SeoLandingPage config={page} />;
}
