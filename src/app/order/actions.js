'use server'

import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { MENUS } from '../../lib/catalog.js'
import { MAX_LINES, lineLabel, quoteBasket } from '../../lib/basket.js'
import { canOrderFor, isValidYmd, todayIST } from '../../lib/dates.js'
import { isValidPoint } from '../../lib/geo.js'
import { roadDistance } from '../../lib/distance.js'
import { loadClosedDates, loadExtras, sameDayBoxes, slotLoad } from '../../lib/orderData.js'
import { slotAllowed } from '../../lib/slots.js'
import {
  ALLERGENS,
  FREE_DELIVERY_KM,
  HANDOFFS,
  MAX_DELIVERY_KM,
  MEALS,
  PREFERENCES,
  SAME_DAY_CAP,
  SLOT_CAPACITY,
  deliveryFeeFor,
  slotLabel,
} from '../../lib/rules.js'
import { createRazorpayOrder, razorpayKeyId } from '../../lib/razorpay.js'
import { COMPANY_ORDER_ERRORS, notifyConfirmed } from '../../lib/payments.js'
import { clean, normalisePhone } from '../../lib/validate.js'
import { rateLimit } from '../../lib/rateLimit.js'

const pick = (values, allowed) => [...new Set((Array.isArray(values) ? values : []).filter((v) => allowed.includes(v)))]

// Step 1: is this pin inside our zone, and what does delivery cost?
export async function checkLocation({ lat, lng } = {}) {
  const point = { lat: Number(lat), lng: Number(lng) }
  if (!isValidPoint(point)) return { error: 'Please drop a pin on the map.' }
  const limited = await rateLimit('location')
  if (limited) return { error: limited }
  const road = await roadDistance(point)
  const fee = deliveryFeeFor(road.km)
  return {
    ok: road.km <= MAX_DELIVERY_KM,
    km: road.km,
    fee,
    far: road.km > FREE_DELIVERY_KM,
    method: road.method,
  }
}

// Out of range: "Leave your number and we'll tell you the day we do."
export async function joinWaitlist({ name, phone, lat, lng, address } = {}) {
  const limited = await rateLimit('waitlist')
  if (limited) return { error: limited }
  const cleanName = clean(name, 80)
  const cleanPhone = normalisePhone(phone)
  const point = { lat: Number(lat), lng: Number(lng) }
  if (cleanName.length < 2) return { error: 'Please enter your name.' }
  if (!cleanPhone) return { error: 'Please enter a valid 10-digit mobile number.' }
  if (!isValidPoint(point)) return { error: 'Please drop a pin on the map.' }
  const session = await actionSession()
  const road = await roadDistance(point)
  const { error } = await createAdminClient().from('waitlist').insert({
    name: cleanName,
    phone: cleanPhone,
    lat: point.lat,
    lng: point.lng,
    road_km: road?.km ?? null,
    address: clean(address, 300) || null,
    user_id: session?.user.id ?? null,
  })
  if (error) {
    console.error('waitlist insert failed', error)
    return { error: 'Could not save that. Please try again.' }
  }
  return { ok: true }
}

// Slot fill for a date and meal, so full slots can be greyed out.
export async function getSlotLoad({ date, meal } = {}) {
  if (!isValidYmd(date) || !MEALS[meal]) return { bySlot: {} }
  if (await rateLimit('slotLoad')) return { bySlot: {} }
  const admin = createAdminClient()
  const load = await slotLoad(admin, date, meal)
  let soldOut = false
  if (SAME_DAY_CAP != null && date === todayIST()) soldOut = (await sameDayBoxes(admin, meal)) >= SAME_DAY_CAP
  return { bySlot: load.bySlot, soldOut }
}

// After signing in inside the order flow: the saved details to prefill.
export async function getCheckoutProfile() {
  const session = await actionSession()
  if (!session) return null
  const p = session.profile
  return {
    email: session.user.email,
    name: p.full_name ?? '',
    phone: p.phone ?? '',
    addressLine: p.address_line ?? '',
    landmark: p.address_landmark ?? '',
    deliveryNote: p.delivery_note ?? '',
    deliveryContact: p.delivery_contact ?? '',
    allergies: p.allergies ?? [],
    allergyOther: p.allergy_other ?? '',
    preferences: p.preferences ?? [],
    handoff: p.handoff ?? null,
    isOffice: p.is_office ?? false,
    receptionOk: p.reception_ok ?? true,
    company: p.company?.active ? { name: p.company.name } : null,
  }
}

// Places a basket: one order per meal line, paid together. Everything is recalculated
// here from trusted data; prices, fees and totals from the browser are ignored.
export async function createOrder(input) {
  const session = await actionSession()
  if (!session) return { error: 'Please sign in to place your order.', needsLogin: true }
  const { user, profile } = session
  if (!input || typeof input !== 'object') return { error: 'Please try again.' }
  const limited = (await rateLimit('orderUser', user.id)) ?? (await rateLimit('orderIp'))
  if (limited) return { error: limited }
  const admin = createAdminClient()

  // Basket lines (validated one by one below).
  const rawLines = Array.isArray(input.lines) ? input.lines : []
  if (!rawLines.length) return { error: 'Your basket is empty. Please add a meal.' }
  if (rawLines.length > MAX_LINES) return { error: `You can order up to ${MAX_LINES} different meals at once.` }
  const lines = rawLines.map((l) => ({
    menu: MENUS[l?.menu] ? l.menu : null,
    planId: String(l?.planId ?? ''),
    bowlSlug: typeof l?.bowlSlug === 'string' ? l.bowlSlug.slice(0, 60) : '',
    quantity: Math.trunc(Number(l?.quantity)),
    meal: MEALS[l?.meal] ? l.meal : null,
    startDate: isValidYmd(l?.startDate) ? l.startDate : null,
    weekdays: pick(l?.weekdays, [0, 1, 2, 3, 4, 5, 6]),
    slot: typeof l?.slot === 'string' ? l.slot.slice(0, 5) : '',
  }))
  if (lines.some((l) => !l.menu || !l.meal || !l.startDate)) return { error: 'Please finish choosing your meal, date and slot.' }

  // Location and road distance (reuse the saved distance when the pin hasn't moved).
  const point = { lat: Number(input.lat), lng: Number(input.lng) }
  if (!isValidPoint(point)) return { error: 'Please set your delivery location on the map.' }
  const samePin = profile.lat === point.lat && profile.lng === point.lng && profile.road_km != null
  const roadKm = samePin ? Number(profile.road_km) : (await roadDistance(point)).km
  if (roadKm > MAX_DELIVERY_KM) {
    return { error: `Sorry, this address is ${roadKm} km away by road. We deliver within ${MAX_DELIVERY_KM} km of our kitchen.` }
  }

  // Customer details.
  const name = clean(input.name, 80)
  const phone = normalisePhone(input.phone)
  const addressLine = clean(input.addressLine, 300)
  if (name.length < 2) return { error: 'Please enter your name.' }
  if (!phone) return { error: 'Please enter a valid 10-digit mobile number.' }
  if (addressLine.length < 5) return { error: 'Please enter your full address (flat/house, building, street, area).' }
  const allergies = pick(input.allergies, ALLERGENS.map((a) => a.id))
  const preferences = pick(input.preferences, PREFERENCES.map((p) => p.id))
  const handoff = HANDOFFS.some((h) => h.id === input.handoff) ? input.handoff : null
  if (!handoff) return { error: 'Please choose where we should leave your dibba if we can’t reach you.' }
  const deliveryContactRaw = clean(input.deliveryContact, 20)
  const deliveryContact = deliveryContactRaw ? normalisePhone(deliveryContactRaw) : null
  if (deliveryContactRaw && !deliveryContact) return { error: 'Please enter a valid 10-digit delivery contact number.' }
  const isOffice = Boolean(input.isOffice)
  const receptionOk = isOffice ? Boolean(input.receptionOk) : null
  if (isOffice && !receptionOk && (!handoff.startsWith('call_') || !deliveryContact)) {
    return { error: 'Your building doesn’t accept food at reception, so please choose “Call me first” and add a delivery contact.' }
  }

  // Price and schedule, worked out again here.
  const [closed, catalog] = await Promise.all([loadClosedDates(admin), loadExtras(admin)])
  const requestedExtras = Array.isArray(input.extras) ? input.extras.slice(0, 20) : []
  const basket = quoteBasket({ lines, allergies, closed, roadKm, extras: requestedExtras, extrasCatalog: catalog })
  if (!basket) return { error: 'Please choose a plan for each meal.' }
  if (basket.problem) return { error: basket.problem }
  if (requestedExtras.filter((e) => Number(e?.qty) > 0).length !== basket.extras.length) {
    return { error: 'One of your add-ons just sold out. Please check your add-ons and try again.' }
  }

  // Cutoffs, slot rules and capacity for every line.
  for (const line of basket.lines) {
    const q = line.quote
    const first = q.schedule[0].date
    const label = lineLabel(line)
    if (!canOrderFor(first, line.meal, new Date(), closed)) {
      return { error: `${label}: orders for ${MEALS[line.meal].label.toLowerCase()} on that day have closed. Please pick a later date.` }
    }
    const firstLoad = await slotLoad(admin, first, line.meal)
    if (!slotAllowed({ meal: line.meal, date: first, roadKm, load: firstLoad }, line.slot)) {
      return { error: `${label}: that delivery slot isn’t available any more. Please pick another slot.` }
    }
    const { data: booked } = await admin
      .from('deliveries')
      .select('delivery_date')
      .in('delivery_date', q.schedule.map((s) => s.date))
      .eq('meal', line.meal)
      .eq('slot', line.slot)
      .in('status', ['scheduled', 'preparing', 'out_for_delivery', 'delivered'])
    const perDate = {}
    for (const row of booked ?? []) perDate[row.delivery_date] = (perDate[row.delivery_date] ?? 0) + 1
    const fullDate = q.schedule.find((s) => (perDate[s.date] ?? 0) >= SLOT_CAPACITY)
    if (fullDate) return { error: `${label}: the ${slotLabel(line.meal, line.slot)} slot is full on ${fullDate.date}. Please pick another slot.` }
    if (SAME_DAY_CAP != null && first === todayIST() && q.plan.boxes === 1) {
      if ((await sameDayBoxes(admin, line.meal)) + q.quantity > SAME_DAY_CAP) {
        return { error: `Sold out for today’s ${MEALS[line.meal].label.toLowerCase()}. Please order for the next meal or tomorrow.` }
      }
    }
  }

  const payWithCompany = input.payWith === 'company'
  if (payWithCompany && (!profile.company_id || !profile.company?.active)) {
    return { error: 'You are not part of an active company account. Please pay online.' }
  }

  // One order per meal line. Add-ons ride on the first order.
  const checkoutId = crypto.randomUUID()
  const common = {
    user_id: user.id,
    company_id: payWithCompany ? profile.company_id : null,
    payment_method: payWithCompany ? 'company' : 'online',
    checkout_id: checkoutId,
    customer_name: name,
    customer_phone: phone,
    address_line: addressLine,
    address_landmark: clean(input.landmark, 120) || null,
    lat: point.lat,
    lng: point.lng,
    distance_km: roadKm,
    road_km: roadKm,
    handoff,
    delivery_note: clean(input.deliveryNote, 200) || null,
    delivery_contact: deliveryContact,
    allergies,
    allergy_other: clean(input.allergyOther, 120) || null,
    preferences,
    notes: clean(input.deliveryNote, 200) || null,
  }
  const rows = basket.lines.map((line, i) => {
    const q = line.quote
    const extras = i === 0 ? basket.extras : []
    const extrasTotal = i === 0 ? basket.extrasTotal : 0
    return {
      ...common,
      menu: line.menu,
      plan_id: q.plan.id,
      plan_name: `${MENUS[line.menu].name}: ${q.plan.name}`,
      bowl_choice: q.bowl?.slug ?? null,
      quantity: q.quantity,
      boxes: q.plan.boxes,
      meal: line.meal,
      slot: line.slot,
      weekdays: q.weekdays,
      meals_total: q.mealsTotal,
      delivery_fee: line.deliveryFee,
      extras,
      extras_total: extrasTotal,
      total: q.mealsTotal + line.deliveryFee + extrasTotal,
      start_date: q.schedule[0].date,
      schedule: q.schedule,
      valid_until: q.validUntil,
      skipped_for_allergy: q.skippedForAllergy,
    }
  })
  const { data: inserted, error } = await admin.from('orders').insert(rows).select('id, order_number')
  const orders = [...(inserted ?? [])].sort((a, b) => a.order_number - b.order_number)
  if (error || !orders.length) {
    console.error('createOrder insert failed', error)
    return { error: 'Could not create your order. Please try again.' }
  }
  const orderIds = orders.map((o) => o.id)
  const removeAll = () => admin.from('orders').delete().in('id', orderIds)

  // Saved for next time: returning customers skip location, login and preferences.
  const last = lines[lines.length - 1]
  await admin
    .from('profiles')
    .update({
      full_name: name,
      phone,
      address_line: addressLine,
      address_landmark: common.address_landmark,
      lat: point.lat,
      lng: point.lng,
      road_km: roadKm,
      delivery_note: common.delivery_note,
      delivery_contact: deliveryContact,
      allergies,
      allergy_other: common.allergy_other,
      preferences,
      handoff,
      is_office: isOffice,
      reception_ok: receptionOk,
      default_meal: last.meal,
      default_slot: last.slot,
    })
    .eq('id', user.id)

  if (payWithCompany) {
    // Each order is charged in turn; if one fails, the ones already charged are refunded.
    const placed = []
    for (const id of orderIds) {
      const { data: result, error: rpcError } = await admin.rpc('place_company_order', { p_order_id: id })
      if (rpcError || result !== 'ok') {
        for (const done of placed) await admin.rpc('cancel_order', { p_order_id: done })
        await admin.from('orders').delete().in('id', orderIds.filter((x) => !placed.includes(x)))
        if (rpcError) console.error('place_company_order failed', rpcError)
        return { error: COMPANY_ORDER_ERRORS[result] ?? COMPANY_ORDER_ERRORS.invalid_order }
      }
      placed.push(id)
      await notifyConfirmed(admin, id)
    }
    return { done: true, orderId: orderIds[0] }
  }

  try {
    const numbers = orders.map((o) => o.order_number).join('+')
    const rzOrder = await createRazorpayOrder({
      amount: basket.total,
      receipt: `GD-${numbers}`.slice(0, 40),
      notes: { checkout_id: checkoutId, orders: numbers },
    })
    if (rzOrder.amount !== Math.round(basket.total * 100)) throw new Error('Razorpay amount mismatch')
    await admin.from('orders').update({ razorpay_order_id: rzOrder.id }).in('id', orderIds)
    return {
      orderId: orderIds[0],
      checkout: {
        key: razorpayKeyId(),
        orderId: rzOrder.id,
        amount: rzOrder.amount,
        description: orders.length > 1 ? `${orders.length} meals · Orders #${numbers}` : `${MENUS[lines[0].menu].name} · Order #${numbers}`,
        prefill: { name, email: user.email, contact: `+91${phone}` },
      },
    }
  } catch (paymentError) {
    console.error('Razorpay order failed', paymentError)
    await removeAll()
    return { error: 'Online payment is unavailable right now. Please try again in a minute.' }
  }
}
