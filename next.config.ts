import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // @ts-ignore
  turbopack: {},
  // @ts-ignore
  allowedDevOrigins: ["192.168.1.111", "10.159.99.19", "localhost:3000", "192.168.1.111:3000", "10.159.99.19:3000"],
};

export default withPWA(nextConfig);
