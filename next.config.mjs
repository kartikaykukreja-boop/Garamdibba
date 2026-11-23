/** @type {import('next').NextConfig} */
const nextConfig = {
  // A package-lock.json higher up the user folder otherwise confuses root detection.
  turbopack: {
    root: import.meta.dirname,
  },
  // Rider proof photos and "Didn't get my box?" photos are uploaded through server actions.
  // Vercel caps request bodies at 4.5 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
