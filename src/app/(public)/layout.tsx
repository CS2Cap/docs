import { Navbar } from "@/components/Navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background scan-line">
      <Navbar />
      <div className="pt-14">{children}</div>
    </div>
  );
}
