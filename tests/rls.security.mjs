// Database authorization tests (Supabase RLS, grants and RPC permissions).
// Creates two throwaway customer accounts in the TEST project, attacks with their real
// browser-level tokens, then deletes everything it created. Never run against production.
// Run: node --test tests/rls.security.mjs   (reads .env.local)
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const service = createClient(URL, env.SUPABASE_SECRET_KEY, opts)
const anon = createClient(URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, opts)

const tag = crypto.randomBytes(4).toString('hex')
const users = {}
let orderOfB = null

async function makeUser(name) {
  const email = `rls-test-${tag}-${name}@example.com`
  const password = crypto.randomBytes(18).toString('base64url')
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  const client = createClient(URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, opts)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return { id: data.user.id, client }
}

test.before(async () => {
  users.a = await makeUser('a')
  users.b = await makeUser('b')
  const { data, error } = await service
    .from('orders')
    .insert({
      user_id: users.b.id,
      payment_method: 'online',
      status: 'pending_payment',
      menu: 'north_indian',
      plan_id: '1-day',
      plan_name: 'RLS test',
      quantity: 1,
      boxes: 1,
      total: 180,
      start_date: '2030-01-07',
      schedule: [{ date: '2030-01-07', item: 'Test' }],
      customer_name: 'B',
      customer_phone: '9999999999',
      address_line: 'Test address',
      lat: 30.36,
      lng: 78.08,
      distance_km: 1,
    })
    .select('id')
    .single()
  if (error) throw error
  orderOfB = data.id
})

test.after(async () => {
  if (orderOfB) await service.from('orders').delete().eq('id', orderOfB)
  for (const u of Object.values(users)) {
    await service.from('rider_locations').delete().eq('rider_id', u.id)
    await service.auth.admin.deleteUser(u.id)
  }
})

const denied = ({ data, error }) => Boolean(error) || (Array.isArray(data) && data.length === 0) || data == null

test('signed-out visitors can read nothing', async () => {
  for (const table of ['profiles', 'orders', 'deliveries', 'companies', 'company_transactions', 'rider_locations']) {
    assert.ok(denied(await anon.from(table).select('*').limit(5)), table)
  }
})

test('a customer never sees other customers’ profiles', async () => {
  // Before 003_security.sql: own row only (RLS). After: no direct browser access at all.
  const { data, error } = await users.a.client.from('profiles').select('id')
  assert.ok(error || data.every((r) => r.id === users.a.id))
})

test('customer A cannot read customer B’s order (IDOR)', async () => {
  assert.ok(denied(await users.a.client.from('orders').select('*').eq('id', orderOfB)))
})

test('a customer cannot make themselves admin or rider', async () => {
  await users.a.client.from('profiles').update({ role: 'admin' }).eq('id', users.a.id)
  const { data } = await service.from('profiles').select('role').eq('id', users.a.id).single()
  assert.equal(data.role, 'customer')
})

test('a customer cannot mark an order paid, change a total or insert orders', async () => {
  await users.b.client.from('orders').update({ status: 'confirmed', total: 1 }).eq('id', orderOfB)
  const { data } = await service.from('orders').select('status, total').eq('id', orderOfB).single()
  assert.equal(data.status, 'pending_payment')
  assert.equal(Number(data.total), 180)
  const insert = await users.a.client.from('orders').insert({ user_id: users.a.id, total: 1 })
  assert.ok(insert.error)
})

test('a customer cannot call money functions', async () => {
  const calls = [
    ['confirm_online_order', { p_order_id: orderOfB, p_payment_id: 'pay_fake' }],
    ['adjust_company_wallet', { p_company_id: crypto.randomUUID(), p_amount: 100000, p_note: 'x', p_admin: users.a.id }],
    ['credit_company_topup', { p_razorpay_order_id: 'order_x', p_payment_id: 'pay_x' }],
    ['place_company_order', { p_order_id: orderOfB }],
  ]
  for (const [fn, args] of calls) {
    const { error } = await users.a.client.rpc(fn, args)
    assert.ok(error, `${fn} should be denied`)
  }
  const { data } = await service.from('orders').select('status').eq('id', orderOfB).single()
  assert.equal(data.status, 'pending_payment')
})

test('a customer cannot publish a fake rider location', async () => {
  const { error } = await users.a.client.from('rider_locations').upsert({ rider_id: users.a.id, lat: 1, lng: 1 })
  assert.ok(error)
})

test('rider GPS is hidden from customers without a delivery on the way', async () => {
  await service.from('rider_locations').upsert({ rider_id: users.b.id, lat: 30.1, lng: 78.1 })
  assert.ok(denied(await users.a.client.from('rider_locations').select('*')))
})

test('an admin without 2-step login cannot read other customers’ orders', async () => {
  await service.from('profiles').update({ role: 'admin' }).eq('id', users.a.id)
  const result = await users.a.client.from('orders').select('id').eq('id', orderOfB)
  await service.from('profiles').update({ role: 'customer' }).eq('id', users.a.id)
  // Passes once supabase/migrations/003_security.sql has been run (is_admin requires aal2).
  assert.ok(denied(result), 'run 003_security.sql: is_admin() must require aal2')
})
