'use server'

import { actionSession } from '../auth.js'
import { verifyPaymentSignature } from '../razorpay.js'
import { settleRazorpayPayment } from '../payments.js'

// Called by the browser right after Razorpay Checkout reports success.
export async function confirmPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const session = await actionSession()
  if (!session) return { error: 'Your session expired. Your payment is safe; refresh and check My orders.' }

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  })
  if (!valid) return { error: 'We could not verify this payment. If money was deducted, contact us with your payment ID.' }

  try {
    const result = await settleRazorpayPayment({ razorpayOrderId: razorpay_order_id, paymentId: razorpay_payment_id })
    return { ok: true, ...result }
  } catch (error) {
    console.error('confirmPayment failed', error)
    return { error: 'Payment received, but we could not update your order yet. It will update automatically shortly.' }
  }
}
