import { pageMeta } from './siteData.js'

// Next.js metadata for one route (title, description, canonical, Open Graph).
export function buildMetadata(route) {
  const { title, description } = pageMeta[route]

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: route },
    openGraph: {
      type: 'website',
      siteName: 'Garam Dibba',
      locale: 'en_IN',
      title,
      description,
      url: route,
      images: ['/bowls/paneer-lababdar.jpg'],
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}
