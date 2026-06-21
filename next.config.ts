import type { NextConfig } from "next";

/** Where the Hono API listens (server-side only; browser never talks to this directly). */
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.29"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
