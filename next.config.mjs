/** @type {import('next').NextConfig} */
const nextConfig = {
  // A package-lock.json higher up the user folder otherwise confuses root detection.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
