import type { NextConfig } from "next";

const nextConfig: NextConfig = {
turbopack: { root: __dirname },
  // Skip TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
