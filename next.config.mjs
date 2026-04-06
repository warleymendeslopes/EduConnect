/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  /** Server Actions: uploads de ficheiros passam por /api/article-upload; limite mantido para outras actions */
  serverActions: {
    bodySizeLimit: 5 * 1024 * 1024,
  },
}

export default nextConfig
