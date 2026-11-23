'use server'

import { redirect } from 'next/navigation'
import { actionSession } from '../../../lib/auth.js'
import { createAdminClient } from '../../../lib/supabase/server.js'
import { dishFor } from '../../../lib/catalog.js'
import { canSkip, formatDate, isValidYmd, planDates, windowEnd } from '../../../lib/dates.js'
import { loadClosedDates, nextCreditSlot, slotLoad, uploadPhoto } from '../../../lib/orderData.js'
import { slotAllowed } from '../../../lib/slots.js'
import { notify } from '../../../lib/notify.js'
import { MEALS, REPORT_REASONS, REPORT_WINDOW_MINUTES } from '../../../lib/rules.js'
import { clean } from '../../../lib/validate.js'
import { rateLimit } from '../../../lib/rateLimit.js'

const UUID = /^[0-9a-f-]{36}$/i

async function ownOrder(orderId) {
  const session = await actionSession()
  if (!session) redirect(`/login?next=/orders/${orderId}`)
  if (!UUID.test(orderId)) redirect('/orders')
  if (await rateLimit('planChange', session.user.id)) redirect(`/orders/${orderId}?err=rate`)
  const admin = createAdminClient()
  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order || (order.user_id !== session.user.id && !session.isAdmin)) redirect('/orders')
  return { session, admin, order }
}

const back = (orderId, query) => redirect(`/orders/${orderId}?${query}`)

// Skip before the cutoff: credit kept, the box moves to the end of the plan.
export async function skipBox(formData) {
  const orderId = String(formData.get('order_id'))
  const deliveryId = String(formData.get('delivery_id'))
  const { admin, order } = await ownOrder(orderId)
  const { data: d } = await admin.from('deliveries').select('*').eq('id', deliveryId).eq('order_id', orderId).maybeSingle()
  if (!d || d.status !== 'scheduled') back(orderId, 'err=skip_state')
  if (!canSkip(d.delivery_date)) back(orderId, 'err=skip_late')

  const closed = await loadClosedDates(admin)
  const next = await nextCreditSlot(admin, order, d.delivery_date, closed)
  if (!next.date) back(orderId, 'err=generic')
  if (order.valid_until && next.date > order.valid_until) back(orderId, 'err=validity')
  const { data: newId, error } = await admin.rpc('skip_delivery', { p_delivery_id: d.id, p_new_date: next.date, p_item: next.item })
  if (error || !newId) {
    if (error) console.error('skip_delivery failed', error)
    back(orderId, 'err=generic')
  }
  await notify('skip_confirmed', { phone: order.customer_phone, date: formatDate(d.delivery_date), lastDate: formatDate(next.date) })
  back(orderId, `msg=skipped&last=${next.date}`)
}

// Pause: every upcoming box that can still be skipped is put on hold. Credits are kept.
export async function pausePlan(formData) {
  const orderId = String(formData.get('order_id'))
  const { admin } = await ownOrder(orderId)
  const { data: rows } = await admin.from('deliveries').select('id, delivery_date').eq('order_id', orderId).eq('status', 'scheduled')
  const ids = (rows ?? []).filter((r) => canSkip(r.delivery_date)).map((r) => r.id)
  if (!ids.length) back(orderId, 'err=nothing_to_pause')
  // Only rows still 'scheduled' are paused, so a skip or cancel racing this can't be undone.
  await admin.from('deliveries').update({ status: 'paused' }).in('id', ids).eq('status', 'scheduled')
  back(orderId, 'msg=paused')
}

// Resume from a date: paused boxes are re-dated on the plan's weekdays.
export async function resumePlan(formData) {
  const orderId = String(formData.get('order_id'))
  const from = String(formData.get('from'))
  const { admin, order } = await ownOrder(orderId)
  if (!isValidYmd(from) || !canSkip(from)) back(orderId, 'err=resume_date')
  const { data: rows } = await admin
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'paused')
    .order('delivery_date')
  if (!rows?.length) back(orderId, 'err=generic')

  const closed = await loadClosedDates(admin)
  const { data: pending } = await admin
    .from('deliveries')
    .select('delivery_date')
    .eq('order_id', orderId)
    .in('status', ['scheduled', 'preparing', 'out_for_delivery'])
  const taken = new Set((pending ?? []).map((p) => p.delivery_date))
  const weekdays = order.weekdays?.length ? order.weekdays : [1, 2, 3, 4, 5, 6]
  const { dates } = planDates(from, rows.length, { weekdays, closed, skip: (day) => taken.has(day) })
  if (dates.length < rows.length) back(orderId, 'err=generic')
  if (order.valid_until && dates.at(-1) > order.valid_until) back(orderId, 'err=validity')

  for (const [i, row] of rows.entries()) {
    await admin
      .from('deliveries')
      .update({ status: 'scheduled', delivery_date: dates[i], item_name: dishFor(order.menu, dates[i], order.bowl_choice).label })
      .eq('id', row.id)
      .eq('status', 'paused')
  }
  back(orderId, 'msg=resumed')
}

// Change the delivery slot for upcoming boxes (and future renewals).
export async function changeSlot(formData) {
  const orderId = String(formData.get('order_id'))
  const slot = String(formData.get('slot'))
  const { admin, order, session } = await ownOrder(orderId)
  if (!MEALS[order.meal]?.slots.some((s) => s.id === slot)) back(orderId, 'err=generic')
  const { data: rows } = await admin.from('deliveries').select('id, delivery_date').eq('order_id', orderId).in('status', ['scheduled', 'paused'])
  const changeable = (rows ?? []).filter((r) => canSkip(r.delivery_date))
  for (const date of new Set(changeable.map((r) => r.delivery_date))) {
    const load = await slotLoad(admin, date, order.meal)
    if (!slotAllowed({ meal: order.meal, date, roadKm: order.road_km == null ? null : Number(order.road_km), load }, slot)) {
      back(orderId, 'err=slot_full')
    }
  }
  const ids = changeable.map((r) => r.id)
  await admin.from('orders').update({ slot }).eq('id', orderId)
  if (ids.length) await admin.from('deliveries').update({ slot }).in('id', ids).in('status', ['scheduled', 'paused'])
  await admin.from('profiles').update({ default_meal: order.meal, default_slot: slot }).eq('id', session.user.id)
  back(orderId, 'msg=slot')
}

// "Didn't get my box?" Open until REPORT_WINDOW_MINUTES after the delivery window ends.
export async function reportBox(formData) {
  const orderId = String(formData.get('order_id'))
  const deliveryId = String(formData.get('delivery_id'))
  const reason = String(formData.get('reason'))
  const { admin, session } = await ownOrder(orderId)
  if (await rateLimit('report', session.user.id)) back(orderId, 'err=rate')
  if (!REPORT_REASONS.some((r) => r.id === reason)) back(orderId, 'err=report_reason')
  const { data: d } = await admin.from('deliveries').select('*').eq('id', deliveryId).eq('order_id', orderId).maybeSingle()
  if (!d || !['delivered', 'out_for_delivery'].includes(d.status)) back(orderId, 'err=generic')
  if (Date.now() > windowEnd(d.delivery_date, d.meal) + REPORT_WINDOW_MINUTES * 60000) back(orderId, 'err=report_late')
  const { count: upheld } = await admin
    .from('delivery_reports')
    .select('id', { count: 'exact', head: true })
    .eq('delivery_id', d.id)
    .in('status', ['open', 'refund', 'make_up'])
  if (upheld) back(orderId, 'err=report_open')

  const photo = formData.get('photo')
  const photoPath = photo?.size ? await uploadPhoto(admin, `reports/${deliveryId}-${Date.now()}.jpg`, photo) : null
  const { error } = await admin.from('delivery_reports').insert({
    delivery_id: d.id,
    order_id: orderId,
    user_id: session.user.id,
    rider_id: d.rider_id,
    reason,
    note: clean(formData.get('note'), 400) || null,
    photo_path: photoPath,
  })
  if (error) back(orderId, error.code === '23505' ? 'err=report_open' : 'err=generic')
  back(orderId, 'msg=reported')
}
