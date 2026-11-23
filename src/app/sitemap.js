import { SITE_URL, pageMeta } from '../siteData.js'

const POLICY_ROUTES = ['/refund-policy', '/delivery-policy', '/terms', '/privacy']

export default function sitemap() {
  const pages = Object.keys(pageMeta).map((route) => ({
    url: route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`,
    changeFrequency: 'weekly',
    priority: route === '/' || route === '/tiffin-service-dehradun' ? 1 : 0.8,
  }))
  const policies = POLICY_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: 'monthly',
    priority: 0.3,
  }))
  return [...pages, ...policies]
}
