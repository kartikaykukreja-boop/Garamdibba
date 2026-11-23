'use server'

import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { MENUS, quoteOrder } from '../../lib/catalog.js'
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

const pick = (values, allowed) => [...new Set((Array.isArray(values) ? values : []).filter((v) => allowed.includes(v)))]

// Step 1: is this pin inside our zone, and what does delivery cost?
export async function checkLocation({ lat, lng }) {
  const point = { lat: Number(lat), lng: Number(lng) }
  if (!isValidPoint(point)) return { error: 'Please drop a pin on the map.' }
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
export async function joinWaitlist({ name, phone, lat, lng, address }) {
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
export async function getSlotLoad({ date, meal }) {
  if (!isValidYmd(date) || !MEALS[meal]) return { bySlot: {} }
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

export async function createOrder(input) {
  const session = await actionSession()
  if (!session) return { error: 'Please sign in to place your order.', needsLogin: true }
  const { user, profile } = session
  const admin = createAdminClient()

  // Validate everything on the server; the browser can be tampered with.
  if (!MENUS[input.menu]) return { error: 'Please choose a menu.' }
  if (!MEALS[input.meal]) return { error: 'Please choose lunch or dinner.' }
  if (!isValidYmd(input.startDate)) return { error: 'Please choose a date.' }

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
  const extrasCatalog = catalog.filter((x) => x.menus.includes(input.menu))
  const quote = quoteOrder({
    menu: input.menu,
    planId: input.planId,
    quantity: input.quantity,
    startDate: input.startDate,
    weekdays: pick(input.weekdays, [0, 1, 2, 3, 4, 5, 6]),
    meal: input.meal,
    bowlSlug: input.bowlSlug,
    allergies,
    closed,
    roadKm,
    extras: Array.isArray(input.extras) ? input.extras.slice(0, 20) : [],
    extrasCatalog,
  })
  if (!quote) return { error: 'Please choose a plan.' }
  if (quote.problem) return { error: quote.problem }
  const requested = (input.extras ?? []).filter((e) => Number(e?.qty) > 0).length
  if (requested !== quote.extras.length) return { error: 'One of your add-ons just sold out. Please check your add-ons and try again.' }

  const first = quote.schedule[0].date
  if (!canOrderFor(first, input.meal, new Date(), closed)) {
    return { error: `Orders for ${MEALS[input.meal].label.toLowerCase()} on that day have closed. Please pick a later date or the next meal.` }
  }

  // Slot rules for the first box, then capacity on every date.
  const firstLoad = await slotLoad(admin, first, input.meal)
  if (!slotAllowed({ meal: input.meal, date: first, roadKm, load: firstLoad }, input.slot)) {
    return { error: 'That delivery slot isn’t available any more. Please pick another slot.' }
  }
  const { data: booked } = await admin
    .from('deliveries')
    .select('delivery_date')
    .in('delivery_date', quote.schedule.map((s) => s.date))
    .eq('meal', input.meal)
    .eq('slot', input.slot)
    .in('status', ['scheduled', 'preparing', 'out_for_delivery', 'delivered'])
  const perDate = {}
  for (const row of booked ?? []) perDate[row.delivery_date] = (perDate[row.delivery_date] ?? 0) + 1
  const fullDate = quote.schedule.find((s) => (perDate[s.date] ?? 0) >= SLOT_CAPACITY)
  if (fullDate) return { error: `The ${slotLabel(input.meal, input.slot)} slot is full on ${fullDate.date}. Please pick another slot.` }

  if (SAME_DAY_CAP != null && first === todayIST() && quote.plan.boxes === 1) {
    if ((await sameDayBoxes(admin, input.meal)) + quote.quantity > SAME_DAY_CAP) {
      return { error: `Sold out for today’s ${MEALS[input.meal].label.toLowerCase()}. Please order for the next meal or tomorrow.` }
    }
  }

  const payWithCompany = input.payWith === 'company'
  if (payWithCompany && (!profile.company_id || !profile.company?.active)) {
    return { error: 'You are not part of an active company account. Please pay online.' }
  }

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      user_id: user.id,
      company_id: payWithCompany ? profile.company_id : null,
      payment_method: payWithCompany ? 'company' : 'online',
      menu: input.menu,
      plan_id: quote.plan.id,
      plan_name: `${MENUS[input.menu].name}: ${quote.plan.name}`,
      bowl_choice: quote.bowl?.slug ?? null,
      quantity: quote.quantity,
      boxes: quote.plan.boxes,
      meal: input.meal,
      slot: input.slot,
      weekdays: quote.weekdays,
      meals_total: quote.mealsTotal,
      delivery_fee: quote.deliveryFee,
      extras: quote.extras,
      extras_total: quote.extrasTotal,
      total: quote.total,
      start_date: first,
      schedule: quote.schedule,
      valid_until: quote.validUntil,
      skipped_for_allergy: quote.skippedForAllergy,
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
    })
    .select('id, order_number')
    .single()
  if (error) {
    console.error('createOrder insert failed', error)
    return { error: 'Could not create your order. Please try again.' }
  }

  // Saved for next time: returning customers skip location, login and preferences.
  await admin
    .from('profiles')
    .update({
      full_name: name,
      phone,
      address_line: addressLine,
      address_landmark: clean(input.landmark, 120) || null,
      lat: point.lat,
      lng: point.lng,
      road_km: roadKm,
      delivery_note: clean(input.deliveryNote, 200) || null,
      delivery_contact: deliveryContact,
      allergies,
      allergy_other: clean(input.allergyOther, 120) || null,
      preferences,
      handoff,
      is_office: isOffice,
      reception_ok: receptionOk,
      default_meal: input.meal,
      default_slot: input.slot,
    })
    .eq('id', user.id)

  if (payWithCompany) {
    const { data: result, error: rpcError } = await admin.rpc('place_company_order', { p_order_id: order.id })
    if (rpcError || result !== 'ok') {
      await admin.from('orders').delete().eq('id', order.id)
      if (rpcError) console.error('place_company_order failed', rpcError)
      return { error: COMPANY_ORDER_ERRORS[result] ?? COMPANY_ORDER_ERRORS.invalid_order }
    }
    await notifyConfirmed(admin, order.id)
    return { done: true, orderId: order.id }
  }

  try {
    const rzOrder = await createRazorpayOrder({
      amount: quote.total,
      receipt: `GD-${order.order_number}`,
      notes: { order_id: order.id, order_number: String(order.order_number) },
    })
    await admin.from('orders').update({ razorpay_order_id: rzOrder.id }).eq('id', order.id)
    return {
      orderId: order.id,
      checkout: {
        key: razorpayKeyId(),
        orderId: rzOrder.id,
        amount: rzOrder.amount,
        description: `${MENUS[input.menu].name} · Order #${order.order_number}`,
        prefill: { name, email: user.email, contact: `+91${phone}` },
      },
    }
  } catch (paymentError) {
    console.error('Razorpay order failed', paymentError)
    await admin.from('orders').delete().eq('id', order.id)
    return { error: 'Online payment is unavailable right now. Please try again in a minute.' }
  }
}
