import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lokal multi-lockfile (monorepo Niumination): kunci root agar Turbopack
  // tidak salah menebak workspace root ke folder induk.
  turbopack: { root: __dirname },
};

export default nextConfig;
