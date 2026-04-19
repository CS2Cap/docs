import Link from "next/link";
import Image from "next/image";

export function FooterSection({ showApiLink = true }: { showApiLink?: boolean }) {
  return (
    <footer className="border-t-2 border-border py-16">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/assets/logo.svg" alt="CS2Cap" width={32} height={32} />
              <span className="font-mono text-lg font-bold">
                CS2<span className="text-gradient-brand">Cap</span>
              </span>
            </div>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-sm">
              Professional-grade analytics for CS2 skin traders. 
              Real-time prices, candlestick charts, arbitrage detection, and technical indicators across every major marketplace.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-muted-foreground mb-4">GUIDES</h4>
            <div className="flex flex-col gap-2">
              <Link href="/cs2-api" className="font-mono text-xs text-foreground hover:text-primary transition-colors">CS2 API</Link>
              <Link href="/cs2-skin-api" className="font-mono text-xs text-foreground hover:text-primary transition-colors">CS2 Skin API</Link>
              <Link href="/cs2-market-api" className="font-mono text-xs text-foreground hover:text-primary transition-colors">CS2 Market API</Link>
            </div>
          </div>

          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-muted-foreground mb-4">PLATFORM</h4>
            <div className="flex flex-col gap-2">
              <Link href="/search" className="font-mono text-xs text-foreground hover:text-primary transition-colors">Search</Link>
              <Link href="/dashboard" className="font-mono text-xs text-foreground hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/terms" className="font-mono text-xs text-foreground hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy" className="font-mono text-xs text-foreground hover:text-primary transition-colors">Privacy</Link>
            </div>
          </div>

          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-muted-foreground mb-4">DEVELOPERS</h4>
            <div className="flex flex-col gap-2">
              {showApiLink && (
                <Link href="/api-info" className="font-mono text-xs text-foreground hover:text-primary transition-colors">API</Link>
              )}
              <Link href="/api-info#pricing" className="font-mono text-xs text-foreground hover:text-primary transition-colors">Pricing</Link>
              <a href="https://docs.cs2cap.com/" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-foreground hover:text-primary transition-colors">Docs</a>
              <a href="https://status.cs2c.app/" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-foreground hover:text-primary transition-colors">Uptime</a>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
            © 2026 CS2CAP. ALL RIGHTS RESERVED.
          </span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 bg-success animate-pulse-glow" />
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
