import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a fully-static site for GitHub Pages.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
