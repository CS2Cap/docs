import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/account", "/watchlist", "/alerts", "/verify-email"],
      },
    ],
    sitemap: "https://cs2cap.com/sitemap.xml",
  };
}
