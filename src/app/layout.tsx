import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const ROOT_DESCRIPTION =
  "Free CS2 API for live skin prices, buy orders, sales history, candlestick charts, and market analytics across 39+ marketplaces. One REST integration covers every CS2/CSGO item.";

export const metadata: Metadata = {
  metadataBase: new URL("https://cs2cap.com"),
  title: {
    default: "CS2 API — Free CS2 Skin Market & Pricing Data | CS2Cap",
    template: "%s | CS2Cap",
  },
  description: ROOT_DESCRIPTION,
  alternates: {
    languages: {
      en: "https://cs2cap.com",
      "x-default": "https://cs2cap.com",
    },
  },
  keywords: [
    "CS2 API",
    "CS2 market API",
    "CS2 skin API",
    "CS2 prices",
    "CS2 pricing data",
    "CS2 analytics",
    "CS2 items",
    "CS2 skins",
    "CSGO API",
    "free CS2 API",
    "skin market data",
    "Counter-Strike 2 API",
    "Buff163 API",
  ],
  openGraph: {
    title: "CS2 API — Free CS2 Skin Market & Pricing Data | CS2Cap",
    description: ROOT_DESCRIPTION,
    url: "https://cs2cap.com",
    siteName: "CS2Cap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CS2 API — Free CS2 Skin Market & Pricing Data | CS2Cap",
    description: ROOT_DESCRIPTION,
  },
  icons: {
    icon: [
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
