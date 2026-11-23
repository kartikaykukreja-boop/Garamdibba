'use server'

import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { quoteOrder, MENUS } from '../../lib/catalog.js'
import { earliestStartDate, isDeliveryDay, isValidYmd, latestStartDate } from '../../lib/dates.js'
import { deliveryCheck } from '../../lib/geo.js'
import { DELIVERY_RADIUS_KM } from '../../lib/config.js'
import { createRazorpayOrder, razorpayKeyId } from '../../lib/razorpay.js'
import { COMPANY_ORDER_ERRORS } from '../../lib/payments.js'
import { clean, normalisePhone } from '../../lib/validate.js'

export async function createOrder(input) {
  const session = await actionSession()
  if (!session) return { error: 'Please sign in again to place your order.' }
  const { user, profile } = session

  // Validate everything on the server; the browser can be tampered with.
  if (!MENUS[input.menu]) return { error: 'Please choose a menu.' }
  if (!isValidYmd(input.startDate)) return { error: 'Please choose a start date.' }
  if (input.startDate < earliestStartDate()) return { error: 'That start date has passed the order cut-off. Please pick a later date.' }
  if (input.startDate > latestStartDate()) return { error: 'Plans can start at most 30 days ahead.' }
  if (!isDeliveryDay(input.startDate)) return { error: 'We don’t deliver on Sundays. Please pick another start date.' }

  const point = { lat: Number(input.lat), lng: Number(input.lng) }
  const check = deliveryCheck(point)
  if (check.distance === null) return { error: 'Please set your delivery location on the map.' }
  if (!check.ok) {
    return { error: `Sorry, this address is ${check.distance} km away. We currently deliver within ${DELIVERY_RADIUS_KM} km of our kitchen.` }
  }

  const name = clean(input.name, 80)
  const phone = normalisePhone(input.phone)
  const addressLine = clean(input.addressLine, 300)
  if (name.length < 2) return { error: 'Please enter your name.' }
  if (!phone) return { error: 'Please enter a valid 10-digit mobile number.' }
  if (addressLine.length < 5) return { error: 'Please enter your full address (flat/house, street, area).' }

  const quote = quoteOrder({
    menu: input.menu,
    planId: input.planId,
    quantity: input.quantity,
    startDate: input.startDate,
    bowlSlug: input.bowlSlug,
  })
  if (!quote) return { error: 'Please choose a plan.' }

  const payWithCompany = input.payWith === 'company'
  if (payWithCompany && (!profile.company_id || !profile.company?.active)) {
    return { error: 'You are not part of an active company account. Please pay online.' }
  }

  const admin = createAdminClient()
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
      total: quote.total,
      start_date: quote.schedule[0].date,
      schedule: quote.schedule,
      customer_name: name,
      customer_phone: phone,
      address_line: addressLine,
      address_landmark: clean(input.landmark, 120) || null,
      lat: point.lat,
      lng: point.lng,
      distance_km: check.distance,
      notes: clean(input.notes, 300) || null,
    })
    .select('id, order_number')
    .single()
  if (error) {
    console.error('createOrder insert failed', error)
    return { error: 'Could not create your order. Please try again.' }
  }

  // Remember contact details for next time.
  if (profile.full_name !== name || profile.phone !== phone) {
    await admin.from('profiles').update({ full_name: name, phone }).eq('id', user.id)
  }

  if (payWithCompany) {
    const { data: result, error: rpcError } = await admin.rpc('place_company_order', { p_order_id: order.id })
    if (rpcError || result !== 'ok') {
      await admin.from('orders').delete().eq('id', order.id)
      if (rpcError) console.error('place_company_order failed', rpcError)
      return { error: COMPANY_ORDER_ERRORS[result] ?? COMPANY_ORDER_ERRORS.invalid_order }
    }
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
        description: `Order #${order.order_number}`,
        prefill: { name, email: user.email, contact: `+91${phone}` },
      },
    }
  } catch (paymentError) {
    console.error('Razorpay order failed', paymentError)
    await admin.from('orders').delete().eq('id', order.id)
    return { error: 'Online payment is unavailable right now. Please try again in a minute.' }
  }
}
