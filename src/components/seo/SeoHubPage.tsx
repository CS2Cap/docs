import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FooterSection } from "@/components/FooterSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import type { SeoPageConfig } from "@/lib/seo/landing-pages";

export interface SeoHubSection {
  heading: string;
  pages: SeoPageConfig[];
}

export function SeoHubPage({
  kicker,
  h1,
  intro,
  breadcrumbName,
  breadcrumbHref,
  sections,
}: {
  kicker: string;
  h1: string;
  intro: string;
  breadcrumbName: string;
  breadcrumbHref: string;
  sections: SeoHubSection[];
}) {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: breadcrumbName, href: breadcrumbHref },
        ]}
      />
      <main>
        <section className="bg-grid py-16 md:py-20">
          <div className="container">
            <div className="mb-6 font-mono text-xs tracking-widest text-primary">
              // {kicker}
            </div>
            <h1 className="display-heading mb-6 text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl">
              <span className="glow-text text-gradient-brand">{h1}</span>
            </h1>
            <p className="max-w-xl font-mono text-sm leading-relaxed text-muted-foreground">
              {intro}
            </p>
          </div>
        </section>

        {sections.map((section) => (
          <section
            key={section.heading}
            className="border-t-2 border-border py-12 md:py-16"
          >
            <div className="container">
              <h2 className="mb-6 font-mono text-sm font-bold tracking-widest text-foreground">
                {section.heading}{" "}
                <span className="text-muted-foreground">
                  ({section.pages.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
                {section.pages.map((page) => (
                  <Link
                    key={page.slug}
                    href={page.canonicalPath}
                    className="group bg-card p-5 transition-colors hover:bg-secondary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {page.h1}
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                        strokeWidth={2}
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 font-mono text-[12px] leading-5 text-muted-foreground">
                      {page.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
      <FooterSection />
    </>
  );
}
