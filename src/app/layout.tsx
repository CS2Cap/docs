import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://cs2cap.com"),
  title: {
    default: "CS2Cap — CS2 Skin Market Analytics",
    template: "%s | CS2Cap",
  },
  description:
    "Professional-grade CS2 skin market analytics. Search the live catalog, compare marketplace prices, chart history, and manage watchlists, alerts, billing, and API access.",
  keywords: ["CS2", "Counter-Strike 2", "skin market", "price tracker", "analytics", "watchlist"],
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Script id="gtm" strategy="beforeInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MK5ZCMNZ');`}</Script>
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MK5ZCMNZ" height="0" width="0" style={{display:"none",visibility:"hidden"}} /></noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
