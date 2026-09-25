import { SITE_URL, pageMeta } from '../siteData.js'

export default function sitemap() {
  return Object.keys(pageMeta).map((route) => ({
    url: route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`,
    changeFrequency: 'weekly',
    priority: route === '/' || route === '/tiffin-service-dehradun' ? 1 : 0.8,
  }))
}
