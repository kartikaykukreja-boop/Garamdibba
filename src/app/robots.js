import { SITE_URL } from '../siteData.js'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/order', '/orders', '/account', '/company', '/rider', '/admin', '/login', '/auth', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
