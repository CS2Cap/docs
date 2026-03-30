import { Link } from "react-router-dom";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Search", href: "/search" },
      { label: "API", href: "/api" },
      { label: "Pricing", href: "/pricing" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "Endpoints", href: "/docs/endpoints" },
      { label: "Examples", href: "/docs/examples" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Changelog", href: "/changelog" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <span className="text-xs font-bold text-primary-foreground">C2</span>
              </div>
              <span className="font-display text-base font-bold text-foreground">CS2Cap</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              CS2 market data, search, and analytics.
            </p>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-3 text-sm font-semibold text-foreground">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CS2Cap. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
