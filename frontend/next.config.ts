import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // If using Turbopack, we may need to ensure PostCSS is properly handled
    // though usually it is automatic.
  }
};

export default nextConfig;
