import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/HebrewTranslator",
  images: {
    unoptimized: true,
  },
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
