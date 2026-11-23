// Minimal Razorpay server helpers (no SDK needed). Server-only.
import crypto from 'node:crypto'

const KEY_ID = process.env.RAZORPAY_KEY_ID
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

export const razorpayKeyId = () => KEY_ID

function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''))
  const right = Buffer.from(String(b ?? ''))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

// amount is in rupees; Razorpay wants paise.
export async function createRazorpayOrder({ amount, receipt, notes }) {
  if (!KEY_ID || !KEY_SECRET) throw new Error('Razorpay keys are not configured.')
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt, notes }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.description || 'Could not start the payment.')
  return data
}

// Checks the signature Razorpay Checkout returns after a successful payment.
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false
  const expected = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
  return safeEqual(expected, signature)
}

// Checks the X-Razorpay-Signature header on webhook calls.
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeEqual(expected, signature)
}
