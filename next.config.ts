import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loaderFile: "./src/lib/image-loader.ts",
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.cs2c.app",
      },
    ],
  },
};

export default nextConfig;
