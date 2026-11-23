'use server'

import { redirect } from 'next/navigation'
import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { completeOrderIfDone, statusPatch } from '../../lib/orders.js'
import { isValidYmd } from '../../lib/dates.js'
import { clean } from '../../lib/validate.js'

const STATUSES = ['scheduled', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']
const ROLES = ['customer', 'rider', 'admin']

async function adminSession() {
  const session = await actionSession()
  if (!session) redirect('/login?next=/admin')
  if (session.profile.role !== 'admin') redirect('/account?denied=1')
  return session
}

function back(formData, extra = '') {
  const target = String(formData.get('back') || '/admin')
  const safe = target.startsWith('/admin') ? target : '/admin'
  return `${safe}${safe.includes('?') ? '&' : '?'}${extra}`
}

async function riderIdOrNull(admin, value) {
  if (!value) return null
  const { data } = await admin.from('profiles').select('id').eq('id', value).in('role', ['rider', 'admin']).maybeSingle()
  return data?.id ?? null
}

export async function assignRider(formData) {
  await adminSession()
  const admin = createAdminClient()
  const riderId = await riderIdOrNull(admin, String(formData.get('rider_id') || ''))
  await admin.from('deliveries').update({ rider_id: riderId }).eq('id', String(formData.get('delivery_id')))
  redirect(back(formData, 'msg=saved'))
}

export async function setDeliveryStatus(formData) {
  await adminSession()
  const status = String(formData.get('status'))
  if (!STATUSES.includes(status)) redirect(back(formData, 'err=generic'))
  const admin = createAdminClient()
  const { data: delivery } = await admin
    .from('deliveries')
    .update(statusPatch(status))
    .eq('id', String(formData.get('delivery_id')))
    .select('order_id')
    .maybeSingle()
  if (delivery && ['delivered', 'cancelled'].includes(status)) await completeOrderIfDone(admin, delivery.order_id)
  redirect(back(formData, 'msg=saved'))
}

export async function bulkAssign(formData) {
  await adminSession()
  const date = String(formData.get('date'))
  if (!isValidYmd(date)) redirect(back(formData, 'err=generic'))
  const admin = createAdminClient()
  const riderId = await riderIdOrNull(admin, String(formData.get('rider_id') || ''))
  if (!riderId) redirect(back(formData, 'err=rider'))
  await admin
    .from('deliveries')
    .update({ rider_id: riderId })
    .eq('delivery_date', date)
    .is('rider_id', null)
    .in('status', ['scheduled', 'preparing'])
  redirect(back(formData, 'msg=assigned'))
}

export async function bulkPreparing(formData) {
  await adminSession()
  const date = String(formData.get('date'))
  if (!isValidYmd(date)) redirect(back(formData, 'err=generic'))
  await createAdminClient().from('deliveries').update({ status: 'preparing' }).eq('delivery_date', date).eq('status', 'scheduled')
  redirect(back(formData, 'msg=preparing'))
}

export async function cancelOrder(formData) {
  await adminSession()
  const { data: refund, error } = await createAdminClient().rpc('cancel_order', { p_order_id: String(formData.get('order_id')) })
  if (error) {
    console.error('cancel_order failed', error)
    redirect(back(formData, 'err=generic'))
  }
  redirect(back(formData, `msg=cancelled&refund=${Number(refund ?? 0)}`))
}

export async function adjustWallet(formData) {
  const { user } = await adminSession()
  const amount = Number(String(formData.get('amount') ?? '').replace(/[,₹\s]/g, ''))
  const note = clean(formData.get('note'), 200) || 'Manual adjustment'
  if (!Number.isFinite(amount) || amount === 0) redirect(back(formData, 'err=amount'))
  const { error } = await createAdminClient().rpc('adjust_company_wallet', {
    p_company_id: String(formData.get('company_id')),
    p_amount: Math.round(amount * 100) / 100,
    p_note: note,
    p_admin: user.id,
  })
  // A debit larger than the balance fails the wallet_balance >= 0 check.
  redirect(back(formData, error ? 'err=balance' : 'msg=wallet'))
}

export async function setCompanyActive(formData) {
  await adminSession()
  await createAdminClient()
    .from('companies')
    .update({ active: formData.get('active') === 'true' })
    .eq('id', String(formData.get('company_id')))
  redirect(back(formData, 'msg=saved'))
}

export async function setUserRole(formData) {
  const { user } = await adminSession()
  const role = String(formData.get('role'))
  const userId = String(formData.get('user_id'))
  if (!ROLES.includes(role)) redirect(back(formData, 'err=generic'))
  if (userId === user.id && role !== 'admin') redirect(back(formData, 'err=self'))
  await createAdminClient().from('profiles').update({ role }).eq('id', userId)
  redirect(back(formData, 'msg=saved'))
}
