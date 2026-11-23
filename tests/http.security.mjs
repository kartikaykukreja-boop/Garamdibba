// HTTP-level security checks against a running site (local dev or the Vercel preview).
// Run: BASE_URL=http://localhost:3000 node --test tests/http.security.mjs
// Uses RAZORPAY_WEBHOOK_SECRET from .env.local to sign test webhooks. Never run against production
// with a live webhook secret: the signed test events reference orders that don't exist (harmless),
// but keep tests on local/staging.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const env = Object.fromEntries(
  (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
)
const hookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_WEBHOOK_SECRET
const sign = (body) => crypto.createHmac('sha256', hookSecret).update(body).digest('hex')
const get = (path, init = {}) => fetch(`${BASE}${path}`, { redirect: 'manual', ...init })

test('admin, rider and account pages require sign-in', async () => {
  for (const path of ['/admin', '/rider', '/account', '/orders', '/company', '/account/security']) {
    const res = await get(path)
    assert.ok([302, 303, 307, 308].includes(res.status), `${path} → ${res.status}`)
    assert.match(res.headers.get('location') ?? '', /\/login\?next=/, path)
  }
})

test('order detail and receipt for a guessed id never leak data when signed out', async () => {
  const id = crypto.randomUUID()
  for (const path of [`/orders/${id}`, `/orders/${id}/receipt`]) {
    const res = await get(path)
    assert.ok([302, 303, 307, 308].includes(res.status), `${path} → ${res.status}`)
  }
})

test('webhook rejects missing, forged and modified signatures', async () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_TEST', order_id: 'order_TEST', amount: 100, currency: 'INR', status: 'captured' } } } })
  const post = (headers, b = body) => fetch(`${BASE}/api/razorpay/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: b })
  assert.equal((await post({})).status, 400)
  assert.equal((await post({ 'x-razorpay-signature': 'a'.repeat(64) })).status, 400)
  if (hookSecret) {
    const tampered = body.replace('"amount":100', '"amount":1')
    assert.equal((await post({ 'x-razorpay-signature': sign(body) }, tampered)).status, 400)
  }
})

test('webhook ignores unknown events and unknown orders (no state change)', { skip: !hookSecret && 'no webhook secret' }, async () => {
  const unknown = JSON.stringify({ event: 'refund.created', payload: {} })
  const r1 = await fetch(`${BASE}/api/razorpay/webhook`, { method: 'POST', headers: { 'x-razorpay-signature': sign(unknown) }, body: unknown })
  assert.equal(r1.status, 200)
  assert.equal((await r1.json()).ignored, true)
  const fake = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_FAKE123456', order_id: 'order_FAKE123456', amount: 100, currency: 'INR', status: 'captured' } } } })
  const r2 = await fetch(`${BASE}/api/razorpay/webhook`, { method: 'POST', headers: { 'x-razorpay-signature': sign(fake) }, body: fake })
  assert.equal(r2.status, 200)
  assert.equal((await r2.json()).result, 'unknown')
})

test('webhook rejects oversized bodies', async () => {
  const big = 'x'.repeat(300 * 1024)
  const res = await fetch(`${BASE}/api/razorpay/webhook`, { method: 'POST', headers: { 'x-razorpay-signature': 'a' }, body: big })
  assert.equal(res.status, 413)
})

test('security headers are set', async () => {
  const res = await get('/')
  const h = res.headers
  assert.match(h.get('content-security-policy') ?? '', /frame-ancestors 'none'/)
  assert.match(h.get('content-security-policy') ?? '', /checkout\.razorpay\.com/)
  assert.equal(h.get('x-content-type-options'), 'nosniff')
  assert.equal(h.get('x-frame-options'), 'DENY')
  assert.ok(h.get('referrer-policy'))
  assert.match(h.get('permissions-policy') ?? '', /geolocation=\(self\)/)
  assert.equal(h.get('x-powered-by'), null)
})

test('sign-in link cannot redirect off-site', async () => {
  for (const next of ['//evil.com', '/%5Cevil.com', 'https://evil.com']) {
    const res = await get(`/auth/callback?code=bad&next=${encodeURIComponent(decodeURIComponent(next))}`)
    const location = res.headers.get('location') ?? ''
    assert.ok(!/evil\.com/.test(new URL(location, BASE).host), `${next} → ${location}`)
  }
})

test('cross-site sign-out is refused', async () => {
  const res = await fetch(`${BASE}/auth/signout`, { method: 'POST', headers: { origin: 'https://evil.com' }, redirect: 'manual' })
  assert.equal(res.status, 403)
})

test('private pages are not cacheable or indexable', async () => {
  const res = await get('/order')
  assert.match(res.headers.get('cache-control') ?? '', /no-store|private/)
  assert.match(res.headers.get('x-robots-tag') ?? '', /noindex/)
})

test('staff and account pages block third-party scripts (review finding 8)', async () => {
  const res = await get('/admin')
  const policies = res.headers.get('content-security-policy') ?? ''
  // Two policies are sent; the strict one has no googletagmanager in script-src.
  assert.ok(policies.split(',').some((p) => /script-src/.test(p) && !/googletagmanager/.test(p)), policies.slice(0, 200))
})
