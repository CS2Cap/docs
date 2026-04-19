import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-grid">
      <div className="text-center max-w-md mx-4">
        <div className="font-mono text-xs tracking-widest text-primary mb-4">// ERROR</div>
        <h1 className="text-8xl font-black tracking-tighter text-foreground mb-2">404</h1>
        <p className="font-mono text-sm text-muted-foreground mb-8">
          This page does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground font-mono text-xs font-bold px-8 py-3 border-2 border-primary brutalist-hover tracking-wider inline-block"
        >
          GO HOME →
        </Link>
      </div>
    </div>
  );
}
