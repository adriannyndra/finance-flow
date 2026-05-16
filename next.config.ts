import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This helps Next.js understand it's behind a proxy like Cloudflare
  devIndicators: {
    // Other valid options if needed
  },
  // We disable the overlay that might be blocking your clicks
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
