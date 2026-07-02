/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // pdf-parse et ws doivent rester en modules Node.js natifs — ne pas bundler
    serverComponentsExternalPackages: ["pdf-parse", "ws"],
  },
};

module.exports = withPWA(nextConfig);
