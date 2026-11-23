import { verifyWebhookSignature } from '../../../../lib/razorpay.js'
import { settleRazorpayPayment } from '../../../../lib/payments.js'

// Razorpay calls this after a payment succeeds, even if the customer closed the tab
// before the browser could confirm it. Set it up in Razorpay → Settings → Webhooks.
export async function POST(request) {
  const rawBody = await request.text()
  if (!verifyWebhookSignature(rawBody, request.headers.get('x-razorpay-signature'))) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(rawBody)
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload?.payment?.entity
    if (payment?.order_id && payment?.id) {
      try {
        await settleRazorpayPayment({ razorpayOrderId: payment.order_id, paymentId: payment.id })
      } catch (error) {
        console.error('Razorpay webhook failed', error)
        return new Response('Retry later', { status: 500 })
      }
    }
  }

  return Response.json({ ok: true })
}
