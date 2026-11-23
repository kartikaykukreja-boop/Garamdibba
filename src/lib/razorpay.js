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

const authHeader = () => `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`

// The payment as Razorpay itself records it (the source of truth, never the browser).
export async function fetchPayment(paymentId) {
  if (!/^pay_[A-Za-z0-9]{6,40}$/.test(String(paymentId ?? ''))) return null
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

// Captures an authorized payment for exactly the expected amount (paise).
export async function capturePayment(paymentId, amountPaise) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR' }),
    cache: 'no-store',
  })
  return res.ok ? res.json() : null
}

export const toPaise = (rupees) => Math.round(Number(rupees) * 100)

// Checks the signature Razorpay Checkout returns after a successful payment.
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!KEY_SECRET || !orderId || !paymentId || !signature) return false
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
