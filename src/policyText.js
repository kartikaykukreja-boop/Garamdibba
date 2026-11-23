// Shared text and helpers for the policy pages (kept apart from components for fast refresh).
import { SKIP_CUTOFF } from './lib/rules.js'

export const POLICY_LAST_UPDATED = '24 November 2026'

export const POLICY_PAGES = [
  { href: '/refund-policy', label: 'Refund & cancellation' },
  { href: '/delivery-policy', label: 'Delivery policy' },
  { href: '/terms', label: 'Terms of service' },
  { href: '/privacy', label: 'Privacy policy' },
]

export function policyMetadata({ route, title, description }) {
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

// '21:00' → '9 pm', '12:15' → '12:15 pm'
export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

export const rupees = (amount) => `₹${amount.toLocaleString('en-IN')}`

// "9 pm the day before"
export function skipCutoffText() {
  const day =
    SKIP_CUTOFF.daysBefore === 0
      ? 'on the day'
      : SKIP_CUTOFF.daysBefore === 1
        ? 'the day before'
        : `${SKIP_CUTOFF.daysBefore} days before`
  return `${formatTime(SKIP_CUTOFF.time)} ${day}`
}

export const ALLERGEN_NOTICE =
  'Our kitchen handles dairy, gluten and nuts. We take care to keep your meal safe, but we can’t guarantee zero traces. If your allergy is severe, please call us before ordering.'
