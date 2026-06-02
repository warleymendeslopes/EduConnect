/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Build enxuto para Docker (gera .next/standalone com server.js). */
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  /** Server Actions: limite do body para actions */
  experimental: {
    serverActions: {
      bodySizeLimit: 5 * 1024 * 1024,
    },
  },
}

export default nextConfig
