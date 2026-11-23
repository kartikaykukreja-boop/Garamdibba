// Who is calling, for rate limits and the security log. Server-only.
import { headers } from 'next/headers'

// On Vercel, x-real-ip / x-forwarded-for are set by the platform's edge from the real
// connection, so a client can't spoof them. Elsewhere, put the app behind a proxy that does the same.
export async function clientIp() {
  try {
    const h = await headers()
    const ip = h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || ''
    return ip.trim().slice(0, 64) || 'unknown'
  } catch {
    return 'unknown'
  }
}
