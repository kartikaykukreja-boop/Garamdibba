'use server'

import { actionSession } from '../auth.js'
import { verifyPaymentSignature } from '../razorpay.js'
import { settleRazorpayPayment } from '../payments.js'
import { rateLimit } from '../rateLimit.js'
import { EVENTS, logEvent } from '../securityLog.js'

const str = (v, max = 64) => (typeof v === 'string' && v.length <= max ? v : '')

// Called by the browser right after Razorpay Checkout reports success.
// The signature proves the payment ID belongs to our Razorpay order; settleRazorpayPayment
// then asks Razorpay for the amount, currency and capture status before confirming anything.
// The webhook confirms the same payment independently if this call never arrives.
export async function confirmPayment(response) {
  const session = await actionSession()
  if (!session) return { error: 'Your session expired. Your payment is safe; refresh and check My orders.' }
  const limited = await rateLimit('confirmPayment', session.user.id)
  if (limited) return { error: limited }

  const orderId = str(response?.razorpay_order_id)
  const paymentId = str(response?.razorpay_payment_id)
  const signature = str(response?.razorpay_signature, 128)

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    await logEvent(EVENTS.PAYMENT_SIGNATURE_INVALID, { userId: session.user.id, detail: { razorpayOrder: orderId.slice(0, 40) } })
    return { error: 'We could not verify this payment. If money was deducted, contact us with your payment ID.' }
  }

  try {
    const result = await settleRazorpayPayment({ razorpayOrderId: orderId, paymentId })
    if (result.error) {
      return { error: 'We couldn’t confirm this payment with Razorpay yet. If money was deducted, it will update shortly or be refunded. Contact us with your payment ID if it doesn’t.' }
    }
    return { ok: true, kind: result.kind }
  } catch (error) {
    console.error('confirmPayment failed', error)
    return { error: 'Payment received, but we could not update your order yet. It will update automatically shortly.' }
  }
}
