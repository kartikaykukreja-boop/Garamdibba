// Shared, fixed-window rate limits stored in Supabase (works across serverless instances).
// Server-only. Fails open if the limiter itself is unavailable, so ordering never breaks
// because of it, but logs a warning.
import { createAdminClient } from './supabase/server.js'
import { clientIp } from './requestInfo.js'
import { EVENTS, logEvent } from './securityLog.js'

// name: { max hits, per window (seconds) }. Tuned for a single kitchen's real traffic.
export const LIMITS = {
  location: { max: 30, window: 600 }, // road-distance lookups (can cost Google API money)
  waitlist: { max: 5, window: 3600 },
  slotLoad: { max: 120, window: 600 },
  orderUser: { max: 12, window: 600 }, // order + Razorpay order creation, per account
  orderIp: { max: 40, window: 600 },
  confirmPayment: { max: 30, window: 600 },
  report: { max: 6, window: 3600 },
  planChange: { max: 40, window: 600 }, // skip / pause / resume / slot
  profile: { max: 30, window: 3600 },
  joinCompany: { max: 10, window: 3600 }, // company codes can't be brute-forced
  topup: { max: 10, window: 3600 },
  rider: { max: 200, window: 600 },
  admin: { max: 400, window: 600 },
}

const friendly = (seconds) => (seconds < 90 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`)

/**
 * Counts a hit. `who` is 'ip' (default) or a user id.
 * Returns null when allowed, or a customer-facing error message when limited.
 */
export async function rateLimit(name, who = 'ip') {
  const rule = LIMITS[name]
  if (!rule) return null
  const id = who === 'ip' ? `ip:${await clientIp()}` : `user:${who}`
  try {
    const { data, error } = await createAdminClient().rpc('rate_limit_hit', {
      p_key: `${name}:${id}`,
      p_limit: rule.max,
      p_window_seconds: rule.window,
    })
    if (error) {
      console.warn('rate limiter unavailable', error.message)
      return null
    }
    if (data > 0) {
      await logEvent(EVENTS.RATE_LIMITED, { userId: who === 'ip' ? null : who, detail: { name } })
      return `Too many requests. Please try again in ${friendly(data)}.`
    }
    return null
  } catch (error) {
    console.warn('rate limiter failed', error?.message)
    return null
  }
}
