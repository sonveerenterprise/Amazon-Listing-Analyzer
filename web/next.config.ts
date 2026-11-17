import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // These run as separate programs or native binaries and must not be bundled.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk", "playwright"],
};

export default nextConfig;
