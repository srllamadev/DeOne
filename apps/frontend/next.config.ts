import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  devIndicators: false,
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:4000";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default config;
