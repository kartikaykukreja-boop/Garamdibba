'use server'

import { redirect } from 'next/navigation'
import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { completeOrderIfDone, forgetRiderLocationIfIdle, statusPatch } from '../../lib/orders.js'
import { isValidYmd, todayIST } from '../../lib/dates.js'
import { loadClosedDates, nextCreditSlot } from '../../lib/orderData.js'
import { clean } from '../../lib/validate.js'
import { EVENTS, logEvent } from '../../lib/securityLog.js'
import { rateLimit } from '../../lib/rateLimit.js'
import { safeNextPath } from '../../lib/safeRedirect.js'

const STATUSES = ['scheduled', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'paused']
const ROLES = ['customer', 'rider', 'admin']

async function adminSession() {
  const session = await actionSession()
  if (!session) redirect('/login?next=/admin')
  if (session.needsMfa) redirect('/account/security?next=/admin')
  if (!session.isAdmin) {
    await logEvent(EVENTS.ADMIN_DENIED, { userId: session.user.id, detail: { via: 'admin action' } })
    redirect('/account?denied=1')
  }
  const limited = await rateLimit('admin', session.user.id)
  if (limited) redirect('/admin?err=generic')
  return session
}

function back(formData, extra = '') {
  const target = safeNextPath(String(formData.get('back') || '/admin'), '/admin')
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
  const { user } = await adminSession()
  const status = String(formData.get('status'))
  if (!STATUSES.includes(status)) redirect(back(formData, 'err=generic'))
  const admin = createAdminClient()
  const { data: delivery } = await admin
    .from('deliveries')
    .update(statusPatch(status))
    .eq('id', String(formData.get('delivery_id')))
    .select('order_id, rider_id')
    .maybeSingle()
  if (delivery && ['delivered', 'cancelled'].includes(status)) await completeOrderIfDone(admin, delivery.order_id)
  if (delivery && status !== 'out_for_delivery') await forgetRiderLocationIfIdle(admin, delivery.rider_id)
  await logEvent(EVENTS.DELIVERY_STATUS_SET, { userId: user.id, detail: { delivery: String(formData.get('delivery_id')), status } })
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
  const { user } = await adminSession()
  const orderId = String(formData.get('order_id'))
  const { data: refund, error } = await createAdminClient().rpc('cancel_order', { p_order_id: orderId })
  if (error) {
    console.error('cancel_order failed', error)
    redirect(back(formData, 'err=generic'))
  }
  await logEvent(EVENTS.ORDER_CANCELLED, { userId: user.id, detail: { order: orderId, refund: Number(refund ?? 0) } })
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
  if (!error) {
    await logEvent(EVENTS.WALLET_ADJUSTED, { userId: user.id, detail: { company: String(formData.get('company_id')), amount, note } })
  }
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
  const admin = createAdminClient()
  const { data: before } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (!before) redirect(back(formData, 'err=generic'))
  await admin.from('profiles').update({ role }).eq('id', userId)
  await logEvent(EVENTS.ROLE_CHANGED, { userId: user.id, detail: { target: userId, from: before.role, to: role } })
  redirect(back(formData, 'msg=saved'))
}

// ── Missed deliveries and "Didn't get my box?" reports ──────────────────

async function bookMakeUp(admin, deliveryId) {
  const { data: d } = await admin
    .from('deliveries')
    .select('id, delivery_date, order:orders(id, menu, bowl_choice, weekdays)')
    .eq('id', deliveryId)
    .maybeSingle()
  if (!d) return false
  const closed = await loadClosedDates(admin)
  const next = await nextCreditSlot(admin, d.order, d.delivery_date > todayIST() ? d.delivery_date : todayIST(), closed)
  const { data, error } = await admin.rpc('make_up_delivery', { p_delivery_id: d.id, p_new_date: next.date, p_item: next.item })
  if (error) console.error('make_up_delivery failed', error)
  return Boolean(data)
}

// We failed to deliver: credit kept, make-up box booked.
export async function markMissedAdmin(formData) {
  await adminSession()
  const ok = await bookMakeUp(createAdminClient(), String(formData.get('delivery_id')))
  redirect(back(formData, ok ? 'msg=makeup' : 'err=generic'))
}

export async function resolveReport(formData) {
  const { user } = await adminSession()
  const outcome = String(formData.get('outcome'))
  if (!['make_up', 'refund', 'rejected'].includes(outcome)) redirect(back(formData, 'err=generic'))
  const admin = createAdminClient()
  const { data: report } = await admin
    .from('delivery_reports')
    .select('id, status, delivery_id, order:orders(id, total, boxes, payment_method, company_id, refund_due)')
    .eq('id', String(formData.get('report_id')))
    .maybeSingle()
  if (!report || report.status !== 'open') redirect(back(formData, 'err=generic'))

  // Claim the report first, so two clicks (or two admins) can't refund or re-book twice.
  const { data: claimed } = await admin
    .from('delivery_reports')
    .update({ status: outcome, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq('id', report.id)
    .eq('status', 'open')
    .select('id')
  if (!claimed?.length) redirect(back(formData, 'err=generic'))

  if (outcome === 'make_up' && !(await bookMakeUp(admin, report.delivery_id))) {
    await admin.from('delivery_reports').update({ status: 'open', resolved_by: null, resolved_at: null }).eq('id', report.id)
    redirect(back(formData, 'err=generic'))
  }
  if (outcome === 'refund') {
    const amount = Math.round((Number(report.order.total) / report.order.boxes) * 100) / 100
    if (report.order.payment_method === 'company') {
      await admin.rpc('adjust_company_wallet', { p_company_id: report.order.company_id, p_amount: amount, p_note: 'Refund for a missed box', p_admin: user.id })
    } else {
      await admin.from('orders').update({ refund_due: Number(report.order.refund_due ?? 0) + amount }).eq('id', report.order.id)
    }
  }
  await admin.from('delivery_reports').update({ resolution_note: clean(formData.get('note'), 300) || null }).eq('id', report.id)
  await logEvent(EVENTS.REPORT_RESOLVED, { userId: user.id, detail: { report: report.id, outcome } })
  redirect(back(formData, `msg=report_${outcome}`))
}

// ── Catalog: add-ons and closed dates ───────────────────────────────────

export async function saveExtra(formData) {
  const { user } = await adminSession()
  const num = (key) => {
    const raw = String(formData.get(key) ?? '').trim()
    if (raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : NaN
  }
  const price = num('price')
  const mrp = num('mrp')
  const stock = num('stock')
  if (price == null || Number.isNaN(price) || Number.isNaN(mrp) || Number.isNaN(stock)) redirect(back(formData, 'err=extra'))
  // Packaged goods can't be sold above MRP.
  if (mrp != null && price > mrp) redirect(back(formData, 'err=mrp'))
  const admin = createAdminClient()
  const id = String(formData.get('id'))
  const { data: before } = await admin.from('extras').select('price').eq('id', id).maybeSingle()
  if (!before) redirect(back(formData, 'err=generic'))
  await admin
    .from('extras')
    .update({ price, mrp, stock: stock == null ? null : Math.trunc(stock), active: formData.get('active') === 'on', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (Number(before.price) !== price) await logEvent(EVENTS.PRICE_CHANGED, { userId: user.id, detail: { extra: id, from: Number(before.price), to: price } })
  redirect(back(formData, 'msg=saved'))
}

export async function addClosedDate(formData) {
  await adminSession()
  const date = String(formData.get('date'))
  if (!isValidYmd(date)) redirect(back(formData, 'err=generic'))
  await createAdminClient().from('closed_dates').upsert({ date, reason: clean(formData.get('reason'), 120) || null })
  redirect(back(formData, 'msg=closed'))
}

export async function removeClosedDate(formData) {
  await adminSession()
  await createAdminClient().from('closed_dates').delete().eq('date', String(formData.get('date')))
  redirect(back(formData, 'msg=saved'))
}
