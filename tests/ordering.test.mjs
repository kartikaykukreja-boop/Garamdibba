// Pure-logic tests: pricing, basket fees, redirects, signatures. Run: node --test tests/
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { quoteBasket } from '../src/lib/basket.js'
import { quoteOrder } from '../src/lib/catalog.js'
import { safeNextPath } from '../src/lib/safeRedirect.js'

const monday = '2027-01-04'
const dabbaWeek = { menu: 'north_indian', planId: '1-week', quantity: 1, meal: 'lunch', startDate: monday, slot: '13:00' }
const bowlDay = { menu: 'protein_bowl', planId: 'bowl-1-day', quantity: 1, meal: 'lunch', startDate: monday, slot: '13:00' }

test('plan price comes from the catalogue, not the browser', () => {
  const q = quoteOrder({ ...dabbaWeek, price: 1, total: 1 })
  assert.equal(q.mealsTotal, 840)
  assert.equal(q.schedule.length, 6)
})

test('unknown plans, zero or negative quantities are rejected', () => {
  assert.equal(quoteOrder({ ...dabbaWeek, planId: 'free-plan' }), null)
  assert.equal(quoteOrder({ ...dabbaWeek, quantity: 0 }), null)
  assert.equal(quoteOrder({ ...dabbaWeek, quantity: -3 }), null)
  assert.equal(quoteOrder({ ...dabbaWeek, quantity: 21 }), null)
})

test('basket: Dabba + Protein Bowl together, one payment', () => {
  const b = quoteBasket({ lines: [dabbaWeek, bowlDay], roadKm: 1.5 })
  assert.equal(b.problem, null)
  assert.equal(b.mealsTotal, 840 + 180)
  assert.equal(b.deliveryFee, 0)
  assert.equal(b.total, 1020)
})

test('basket: one fee per trip, and the weekly plan makes shared trips free', () => {
  const single = quoteBasket({ lines: [bowlDay, { ...bowlDay, menu: 'north_indian', planId: '1-day' }], roadKm: 3.5 })
  assert.equal(single.deliveryFee, 10) // two meals, same drop → one ₹10 fee
  const withPlan = quoteBasket({ lines: [dabbaWeek, bowlDay], roadKm: 4.5 })
  assert.equal(withPlan.deliveryFee, 0) // drop shared with a weekly plan is free
  const separateSlot = quoteBasket({ lines: [dabbaWeek, { ...bowlDay, slot: '13:30' }], roadKm: 4.5 })
  assert.equal(separateSlot.deliveryFee, 20) // the bowl travels alone
})

test('add-on prices come from the catalogue; unknown or sold-out items are dropped', () => {
  const catalog = [
    { id: 'diet-coke', name: 'Diet Coke', kind: 'drink', price: 40, stock: 5, active: true, menus: ['north_indian', 'protein_bowl'] },
    { id: 'kitkat', name: 'KitKat', kind: 'sweet', price: 20, stock: 0, active: true, menus: ['north_indian', 'protein_bowl'] },
  ]
  const b = quoteBasket({
    lines: [bowlDay],
    extras: [{ id: 'diet-coke', qty: 2, price: 1 }, { id: 'kitkat', qty: 1 }, { id: 'gold-bar', qty: 1 }, { id: 'diet-coke', qty: -5 }],
    extrasCatalog: catalog,
  })
  assert.equal(b.extrasTotal, 80)
  assert.equal(b.extras.length, 1)
})

test('basket size is capped', () => {
  assert.equal(quoteBasket({ lines: Array(5).fill(bowlDay) }), null)
  assert.equal(quoteBasket({ lines: [] }), null)
})

test('allergies: an unsafe bowl is blocked', () => {
  const b = quoteBasket({ lines: [{ ...bowlDay, bowlSlug: 'pesto-paneer' }], allergies: ['tree_nuts'] })
  assert.match(b.problem, /allergic/)
})

test('open redirects are blocked', () => {
  const backslash = String.fromCharCode(92)
  const attacks = ['//evil.com', `/${backslash}evil.com`, `/${backslash}${backslash}evil.com`, 'https://evil.com', 'javascript:alert(1)', '/ok\nSet-Cookie:x', '', null, '///evil.com/']
  for (const bad of attacks) {
    const out = safeNextPath(bad, '/order')
    // The result must stay on our site: a single-slash path, never //host or /\host.
    assert.ok(out.startsWith('/') && !out.startsWith('//') && !out.includes(backslash), `${bad} → ${out}`)
    assert.equal(new URL(out, 'https://garamdibba.com').origin, 'https://garamdibba.com')
  }
  assert.equal(safeNextPath(`/${backslash}evil.com`, '/order'), '/order')
  assert.equal(safeNextPath('/orders/abc?placed=1', '/order'), '/orders/abc?placed=1')
})

test('Razorpay signatures: forged or modified signatures fail', async () => {
  process.env.RAZORPAY_KEY_SECRET = 'test_secret'
  process.env.RAZORPAY_WEBHOOK_SECRET = 'hook_secret'
  const { verifyPaymentSignature, verifyWebhookSignature } = await import('../src/lib/razorpay.js?fresh')
  const good = crypto.createHmac('sha256', 'test_secret').update('order_A|pay_B').digest('hex')
  assert.equal(verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_B', signature: good }), true)
  assert.equal(verifyPaymentSignature({ orderId: 'order_X', paymentId: 'pay_B', signature: good }), false) // reused for another order
  assert.equal(verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_B', signature: good.replace(/.$/, '0') }), false)
  assert.equal(verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_B', signature: '' }), false)
  const body = '{"event":"payment.captured"}'
  const hook = crypto.createHmac('sha256', 'hook_secret').update(body).digest('hex')
  assert.equal(verifyWebhookSignature(body, hook), true)
  assert.equal(verifyWebhookSignature(body.replace('captured', 'failed'), hook), false)
  assert.equal(verifyWebhookSignature(body, null), false)
})

test('repeating an add-on line cannot beat the stock limit (review finding 6)', () => {
  const catalog = [{ id: 'sprite', name: 'Sprite', kind: 'drink', price: 40, stock: 12, active: true, menus: ['north_indian', 'protein_bowl'] }]
  const b = quoteBasket({ lines: [bowlDay], extras: [{ id: 'sprite', qty: 10 }, { id: 'sprite', qty: 10 }], extrasCatalog: catalog })
  assert.equal(b.extras.length, 0) // 20 > 12 in stock: rejected, not sold twice
  const ok = quoteBasket({ lines: [bowlDay], extras: [{ id: 'sprite', qty: 5 }, { id: 'sprite', qty: 5 }], extrasCatalog: catalog })
  assert.equal(ok.extrasTotal, 400)
})
