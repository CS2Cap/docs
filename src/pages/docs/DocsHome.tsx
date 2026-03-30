import { DocsLayout } from "@/components/DocsLayout";
import { Link } from "react-router-dom";
import { Zap, Lock, List, Code } from "lucide-react";

const sections = [
  { icon: Zap, title: "Getting Started", description: "Set up your API key and make your first request.", href: "/docs/getting-started" },
  { icon: Lock, title: "Authentication", description: "Learn how to authenticate your API requests.", href: "/docs/authentication" },
  { icon: List, title: "Endpoints", description: "Browse the full list of available API endpoints.", href: "/docs/endpoints" },
  { icon: Code, title: "Examples", description: "Code examples in popular languages and frameworks.", href: "/docs/examples" },
];

export default function DocsHome() {
  return (
    <DocsLayout>
      <h1 className="text-3xl font-bold">Documentation</h1>
      <p className="mt-3 text-muted-foreground">
        Everything you need to integrate with the CS2Cap API.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} to={s.href} className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/20">
            <s.icon size={20} className="text-primary" />
            <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
          </Link>
        ))}
      </div>
    </DocsLayout>
  );
}
