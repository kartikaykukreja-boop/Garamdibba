// Security headers. The Content Security Policy only allows what the site really uses:
// Razorpay Checkout, this project's Supabase, OpenStreetMap tiles and search, Google Fonts
// and Google Tag Manager. Set CSP_REPORT_ONLY=true in an environment to switch it to
// report-only while debugging a blocked resource (never leave that on in production).
const dev = process.env.NODE_ENV !== 'production'
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  } catch {
    return '*.supabase.co'
  }
})()

const csp = [
  "default-src 'self'",
  // Next.js injects small inline scripts, so 'unsafe-inline' is needed without nonces.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com https://*.razorpay.com https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://${supabaseHost} https://*.razorpay.com https://www.googletagmanager.com https://*.google-analytics.com`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://nominatim.openstreetmap.org https://*.razorpay.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com`,
  'frame-src https://*.razorpay.com https://www.googletagmanager.com',
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: process.env.CSP_REPORT_ONLY === 'true' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // GPS and camera only for our own pages (address pin, rider tracking, proof photos).
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=(), payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com"), usb=(), interest-cohort=()' },
  // Razorpay opens popups for some payment methods.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
]

const NO_THIRD_PARTY = ['/admin/:path*', '/rider/:path*', '/account/:path*', '/orders/:path*', '/company/:path*']
const strictScripts = `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com https://*.razorpay.com`

const PRIVATE = ['/admin/:path*', '/account/:path*', '/orders/:path*', '/order/:path*', '/rider/:path*', '/company/:path*', '/login', '/auth/:path*', '/api/:path*']

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A package-lock.json higher up the user folder otherwise confuses root detection.
  turbopack: {
    root: import.meta.dirname,
  },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
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
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Signed-in pages are never indexed by search engines.
      ...PRIVATE.map((source) => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
      // Pages showing customer data or staff tools: a second, stricter policy blocks third-party
      // scripts (Google Tag Manager). Browsers enforce both policies, so the stricter one wins.
      ...NO_THIRD_PARTY.map((source) => ({ source, headers: [{ key: 'Content-Security-Policy', value: strictScripts }] })),
    ]
  },
}

export default nextConfig
