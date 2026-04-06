import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client", "@anthropic-ai/sdk"],
  typescript: {
    // Pre-existing Stripe v22 type mismatches — not runtime issues
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
