/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  // pdf-parse doit rester en module Node.js natif — ne pas bundler
  serverExternalPackages: ["pdf-parse"],
};

module.exports = withPWA(nextConfig);
