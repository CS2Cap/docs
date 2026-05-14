import { Navbar } from "@/components/Navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background scan-line">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:mt-2 focus:ml-2 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:font-bold focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <Navbar />
      <div className="pt-14">{children}</div>
    </div>
  );
}
