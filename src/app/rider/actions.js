'use server'

import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { completeOrderIfDone, statusPatch } from '../../lib/orders.js'
import { distanceKm, isValidPoint } from '../../lib/geo.js'
import { formatDate, formatTime, todayIST } from '../../lib/dates.js'
import { loadClosedDates, nextCreditSlot, uploadPhoto } from '../../lib/orderData.js'
import { trackerCounts } from '../../lib/tracker.js'
import { notify } from '../../lib/notify.js'
import { slotLabel } from '../../lib/rules.js'
import { SITE_URL } from '../../siteData.js'

const HANDOFF_RESULTS = ['customer', 'door', 'guard', 'contact']
const WHERE = { customer: 'to you', door: 'at your door', guard: 'to the guard', contact: 'to your delivery contact' }

async function riderDelivery(deliveryId) {
  const session = await actionSession()
  if (!session || !['rider', 'admin'].includes(session.profile.role)) return { error: 'Not allowed.' }
  const admin = createAdminClient()
  const { data: delivery } = await admin
    .from('deliveries')
    .select('*, order:orders(id, menu, bowl_choice, weekdays, lat, lng, customer_phone, meal, slot)')
    .eq('id', deliveryId)
    .maybeSingle()
  if (!delivery || (delivery.rider_id !== session.user.id && session.profile.role !== 'admin')) {
    return { error: 'This delivery isn’t assigned to you.' }
  }
  if (['cancelled', 'delivered', 'skipped', 'missed', 'paused'].includes(delivery.status)) {
    return { error: 'This delivery is already closed.' }
  }
  return { session, admin, delivery }
}

// Picked up: the customer's tracker goes live.
export async function startDelivery(deliveryId) {
  const { error, admin, delivery } = await riderDelivery(deliveryId)
  if (error) return { error }
  const { error: updateError } = await admin.from('deliveries').update(statusPatch('out_for_delivery')).eq('id', deliveryId)
  if (updateError) return { error: 'Could not update. Please try again.' }
  await notify('on_the_way', {
    phone: delivery.order.customer_phone,
    slot: slotLabel(delivery.meal, delivery.slot),
    link: `${SITE_URL}/orders/${delivery.order_id}`,
  })
  return { ok: true }
}

// Delivered: saves the GPS point, the time, the handoff and a photo of the box.
export async function markDelivered(formData) {
  const deliveryId = String(formData.get('delivery_id'))
  const { error, admin, delivery } = await riderDelivery(deliveryId)
  if (error) return { error }

  const handoff = HANDOFF_RESULTS.includes(formData.get('handoff')) ? String(formData.get('handoff')) : 'customer'
  const point = { lat: Number(formData.get('lat')), lng: Number(formData.get('lng')) }
  const hasPoint = isValidPoint(point)
  const distanceM = hasPoint ? Math.round(distanceKm(point, { lat: delivery.order.lat, lng: delivery.order.lng }) * 1000) : null
  const photo = formData.get('photo')
  const proofPath = photo?.size ? await uploadPhoto(admin, `proofs/${todayIST()}/${deliveryId}.jpg`, photo) : null
  if (photo?.size && !proofPath) return { error: 'The photo didn’t upload. Check your internet and try again.' }

  const { error: updateError } = await admin
    .from('deliveries')
    .update({
      ...statusPatch('delivered'),
      handoff_result: handoff,
      proof_path: proofPath,
      proof_lat: hasPoint ? point.lat : null,
      proof_lng: hasPoint ? point.lng : null,
      proof_distance_m: distanceM,
    })
    .eq('id', deliveryId)
  if (updateError) return { error: 'Could not update. Please try again.' }
  await completeOrderIfDone(admin, delivery.order_id)

  const { data: all } = await admin.from('deliveries').select('id, status, kind, delivery_date, meal, slot').eq('order_id', delivery.order_id)
  const t = trackerCounts(all ?? [])
  await notify('delivered', {
    phone: delivery.order.customer_phone,
    where: WHERE[handoff],
    time: formatTime(new Date().toISOString()),
    n: t.delivered,
    total: t.credits.length,
    left: t.left,
    link: `${SITE_URL}/orders/${delivery.order_id}`,
  })
  return { ok: true, distanceM }
}

// Couldn't deliver (our side): the credit is kept and a make-up box is booked.
export async function markMissed(deliveryId) {
  const { error, admin, delivery } = await riderDelivery(deliveryId)
  if (error) return { error }
  const closed = await loadClosedDates(admin)
  const next = await nextCreditSlot(admin, { ...delivery.order, id: delivery.order_id }, delivery.delivery_date, closed)
  const { error: rpcError } = await admin.rpc('make_up_delivery', { p_delivery_id: deliveryId, p_new_date: next.date, p_item: next.item })
  if (rpcError) return { error: 'Could not update. Please try again.' }
  await notify('missed_delivery', {
    phone: delivery.order.customer_phone,
    date: formatDate(next.date),
    slot: slotLabel(delivery.meal, delivery.slot),
  })
  return { ok: true }
}

// Kept for older callers.
export async function setRiderStatus(deliveryId, status) {
  if (status === 'out_for_delivery') return startDelivery(deliveryId)
  return { error: 'Use the Mark delivered button.' }
}
