// Security and audit log (table public.security_events). Server-only.
// Log who did what to money, roles, prices and payments. Never log passwords, tokens,
// payment signatures, full addresses or GPS coordinates.
import { createAdminClient } from './supabase/server.js'
import { clientIp } from './requestInfo.js'

export const EVENTS = {
  ADMIN_DENIED: 'admin_denied',
  ADMIN_PROMOTED: 'admin_promoted_from_env',
  ROLE_CHANGED: 'role_changed',
  WALLET_ADJUSTED: 'wallet_adjusted',
  PRICE_CHANGED: 'extra_price_changed',
  ORDER_CANCELLED: 'order_cancelled',
  REPORT_RESOLVED: 'report_resolved',
  DELIVERY_STATUS_SET: 'delivery_status_set',
  PAYMENT_SIGNATURE_INVALID: 'payment_signature_invalid',
  PAYMENT_MISMATCH: 'payment_mismatch',
  WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid',
  RATE_LIMITED: 'rate_limited',
}

export async function logEvent(type, { userId = null, detail = {} } = {}) {
  try {
    const ip = await clientIp()
    const { error } = await createAdminClient().from('security_events').insert({ type, user_id: userId, ip, detail })
    if (error) console.warn('[security]', type, userId ?? '', JSON.stringify(detail), error.message)
  } catch (error) {
    console.warn('[security] log failed', type, error?.message)
  }
}
