import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  headers: async () => [
    {
      source: "/api/menu",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=600, stale-while-revalidate=3600" },
      ],
    },
    {
      // pickup-slots is fine to cache; app-config drives the location gate and
      // must never be cached, so it's handled at the route level instead.
      source: "/api/settings/pickup-slots",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
  ],
};

export default nextConfig;
