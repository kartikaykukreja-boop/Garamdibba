// Turning a successful Razorpay payment into a confirmed order or a wallet top-up.
// Used by both the browser callback (server action) and the webhook, and safe to run twice.
import { createAdminClient } from './supabase/server.js'
import { notify } from './notify.js'
import { slotLabel } from './rules.js'
import { formatDate } from './dates.js'
import { capturePayment, fetchPayment, toPaise } from './razorpay.js'
import { EVENTS, logEvent } from './securityLog.js'

// A payment only counts if Razorpay itself says it belongs to this Razorpay order, is in
// INR, is for exactly the amount we stored, and is captured (an authorized payment is
// captured here for that exact amount). The browser's word is never enough.
async function verifiedPayment({ payment, paymentId, razorpayOrderId, expectedPaise }) {
  let p = payment ?? (await fetchPayment(paymentId))
  const problem = (reason) => ({ ok: false, reason })
  if (!p) return problem('payment_not_found')
  if (p.id !== paymentId) return problem('payment_id_mismatch')
  if (p.order_id !== razorpayOrderId) return problem('order_mismatch')
  if (p.currency !== 'INR') return problem('currency')
  if (Number(p.amount) !== expectedPaise) return problem('amount')
  if (p.status === 'authorized') p = (await capturePayment(paymentId, expectedPaise)) ?? p
  if (p.status !== 'captured') return problem(`status_${p.status}`)
  return { ok: true }
}

/**
 * Turns a Razorpay payment into a confirmed order or a wallet top-up. Idempotent: the
 * database only moves an order from pending_payment to confirmed once.
 * `payment` is the verified webhook entity when called from the webhook; otherwise the
 * payment is fetched from Razorpay.
 */
export async function settleRazorpayPayment({ razorpayOrderId, paymentId, payment = null }) {
  const admin = createAdminClient()

  // All orders in one basket share the Razorpay order; the payment must cover all of them.
  const { data: orders } = await admin
    .from('orders')
    .select('id, user_id, total, status, payment_method, order_number')
    .eq('razorpay_order_id', razorpayOrderId)
    .order('order_number')
  if (orders?.length) {
    const first = orders[0]
    if (orders.some((o) => o.payment_method !== 'online')) return { kind: 'order', orderId: first.id, error: 'not_online' }
    const pending = orders.filter((o) => o.status === 'pending_payment')
    if (!pending.length) return { kind: 'order', orderId: first.id, already: true }
    const expectedPaise = toPaise(orders.reduce((sum, o) => sum + Number(o.total), 0))
    const check = await verifiedPayment({ payment, paymentId, razorpayOrderId, expectedPaise })
    if (!check.ok) {
      await logEvent(EVENTS.PAYMENT_MISMATCH, { userId: first.user_id, detail: { orders: orders.map((o) => o.id), reason: check.reason } })
      return { kind: 'order', orderId: first.id, error: check.reason }
    }
    for (const o of pending) {
      const { data: confirmed, error } = await admin.rpc('confirm_online_order', { p_order_id: o.id, p_payment_id: paymentId })
      if (error) throw error
      if (confirmed) await notifyConfirmed(admin, o.id)
    }
    return { kind: 'order', orderId: first.id }
  }

  const { data: topup } = await admin
    .from('company_topups')
    .select('id, company_id, amount, status, created_by')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle()
  if (topup) {
    if (topup.status !== 'created') return { kind: 'topup', companyId: topup.company_id, already: true }
    const check = await verifiedPayment({ payment, paymentId, razorpayOrderId, expectedPaise: toPaise(topup.amount) })
    if (!check.ok) {
      await logEvent(EVENTS.PAYMENT_MISMATCH, { userId: topup.created_by, detail: { topup: topup.id, reason: check.reason } })
      return { kind: 'topup', companyId: topup.company_id, error: check.reason }
    }
    const { error } = await admin.rpc('credit_company_topup', {
      p_razorpay_order_id: razorpayOrderId,
      p_payment_id: paymentId,
    })
    if (error) throw error
    return { kind: 'topup', companyId: topup.company_id }
  }

  return { kind: 'unknown' }
}

// "Order confirmed: meal, date, slot, credits left" (WhatsApp once a provider is connected).
export async function notifyConfirmed(admin, orderId) {
  const { data: o } = await admin
    .from('orders')
    .select('plan_name, customer_phone, meal, slot, start_date, boxes')
    .eq('id', orderId)
    .maybeSingle()
  if (!o) return
  await notify('order_confirmed', {
    phone: o.customer_phone,
    meal: o.plan_name,
    firstDate: formatDate(o.start_date),
    slot: slotLabel(o.meal, o.slot),
    credits: o.boxes,
  })
}

export const COMPANY_ORDER_ERRORS = {
  insufficient_balance: 'Your company budget does not have enough balance for this order. Ask your HR to top it up, or pay online.',
  company_monthly_limit: 'This order would cross your company’s monthly spending limit. Pay online, or ask HR to raise it.',
  employee_monthly_limit: 'This order would cross your personal monthly limit set by HR. Pay online, or ask HR to raise it.',
  company_inactive: 'Your company account is paused. Please contact your HR.',
  invalid_order: 'This order could not be placed. Please try again.',
}
