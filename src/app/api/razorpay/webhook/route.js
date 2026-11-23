import { verifyWebhookSignature } from '../../../../lib/razorpay.js'
import { settleRazorpayPayment } from '../../../../lib/payments.js'
import { EVENTS, logEvent } from '../../../../lib/securityLog.js'

// Razorpay calls this after a payment succeeds, even if the customer closed the tab
// before the browser could confirm it. Set it up in Razorpay → Settings → Webhooks.
//
// Security: the raw body's HMAC is checked (timing-safe) before anything is parsed or
// changed; only known events are handled; amounts, currency, order and capture status are
// re-checked against our stored order; repeats and retries are harmless because orders
// only move from pending_payment to confirmed once.
const MAX_BODY_BYTES = 256 * 1024
const HANDLED = new Set(['payment.captured', 'order.paid'])

export async function POST(request) {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return new Response('Payload too large', { status: 413 })
  const rawBody = await request.text()
  if (rawBody.length > MAX_BODY_BYTES) return new Response('Payload too large', { status: 413 })

  if (!verifyWebhookSignature(rawBody, request.headers.get('x-razorpay-signature'))) {
    await logEvent(EVENTS.WEBHOOK_SIGNATURE_INVALID, { detail: { bytes: rawBody.length } })
    return new Response('Invalid signature', { status: 400 })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  // Unknown events are acknowledged and ignored, so Razorpay doesn't keep retrying them.
  if (!HANDLED.has(event?.event)) return Response.json({ ok: true, ignored: true })

  const payment = event.payload?.payment?.entity
  if (typeof payment?.id !== 'string' || typeof payment?.order_id !== 'string') {
    return Response.json({ ok: true, ignored: true })
  }

  try {
    const result = await settleRazorpayPayment({ razorpayOrderId: payment.order_id, paymentId: payment.id, payment })
    // A mismatch (wrong amount, not captured…) is logged and not retried.
    return Response.json({ ok: true, result: result.error ? 'rejected' : result.already ? 'duplicate' : result.kind })
  } catch (error) {
    console.error('Razorpay webhook failed', error)
    return new Response('Retry later', { status: 500 })
  }
}
