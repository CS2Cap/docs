import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { getPageBySlug } from "@/lib/seo/landing-pages";

const page = getPageBySlug("haloskins-api")!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: page.canonicalPath },
};

export default function Page() {
  return <SeoLandingPage config={page} />;
}
