import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const ROOT_DESCRIPTION =
  "Free CS2 market API for live skin prices, buy orders, and historical data across 39+ marketplaces (Buff163, Youpin, etc).";

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
    "CS2 Market API",
    "CS2 Skins API",
    "CS2 Prices API",
    "CS2 Pricing Data",
    "CS2 Buy Orders API",
    "CS2 Marketplace API",
    "CS2 Market Data",
    "CS2 prices history data",
    "CS2 Database",
    "Free CS2 API",
    "Skins Market API",
    "Buff163 API",
    "Youpin API",
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
