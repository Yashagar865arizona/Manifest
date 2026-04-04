import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client", "@anthropic-ai/sdk"],
  experimental: {
    staticGenerationRetryCount: 0,
  },
};

export default nextConfig;
