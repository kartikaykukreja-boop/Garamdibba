// Turning a successful Razorpay payment into a confirmed order or a wallet top-up.
// Used by both the browser callback (server action) and the webhook, and safe to run twice.
import { createAdminClient } from './supabase/server.js'
import { notify } from './notify.js'
import { slotLabel } from './rules.js'
import { formatDate } from './dates.js'

export async function settleRazorpayPayment({ razorpayOrderId, paymentId }) {
  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle()
  if (order) {
    const { data: confirmed, error } = await admin.rpc('confirm_online_order', { p_order_id: order.id, p_payment_id: paymentId })
    if (error) throw error
    if (confirmed) await notifyConfirmed(admin, order.id)
    return { kind: 'order', orderId: order.id }
  }

  const { data: topup } = await admin
    .from('company_topups')
    .select('id, company_id')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle()
  if (topup) {
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
