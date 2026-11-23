// Ordering rules from "Garam Dibba — Website Ordering Spec" (23 Nov 2026).
// Everything the kitchen may want to change lives here. Values marked TO CONFIRM
// are the spec's suggested defaults and are still open decisions.
// This file is shared by the browser and the server, so keep it free of secrets.

// ── Delivery zone and fees (road distance from the kitchen) ─────────────
export const MAX_DELIVERY_KM = 5
export const FREE_DELIVERY_KM = 3
// Fee per delivery by road distance. TO CONFIRM: exact split above 3 km.
export const DELIVERY_FEE_BANDS = [
  { upToKm: 3, fee: 0 },
  { upToKm: 4, fee: 10 },
  { upToKm: 5, fee: 20 },
]
// TO CONFIRM: the fee is charged per delivery, and waived on plans with at least
// this many meals (the spec suggests Weekly and longer). Set to null to never waive.
export const FREE_DELIVERY_MIN_MEALS = 6
// TO CONFIRM: single orders 3–5 km get free delivery once the order reaches this
// value (drives the "Add ₹60 more for free delivery" bar). null = feature off.
export const FREE_DELIVERY_ORDER_VALUE = null

// ── Meals, cutoffs and 30-minute slots (IST, 24-hour "HH:MM") ───────────
export const MEALS = {
  lunch: {
    id: 'lunch',
    label: 'Lunch',
    cutoff: '12:15',
    window: '12:30–2:00 pm',
    // After this time, same-day orders only get the later slots.
    lateAfter: '11:45',
    slots: [
      { id: '12:30', label: '12:30–1:00 pm' },
      { id: '13:00', label: '1:00–1:30 pm' },
      { id: '13:30', label: '1:30–2:00 pm' },
    ],
    lateSlots: ['13:00', '13:30'],
    // Addresses beyond FREE_DELIVERY_KM get the middle and later slots only.
    farSlots: ['13:00', '13:30'],
  },
  dinner: {
    id: 'dinner',
    label: 'Dinner',
    cutoff: '19:15',
    window: '7:30–9:30 pm',
    lateAfter: '18:45',
    slots: [
      { id: '19:30', label: '7:30–8:00 pm' },
      { id: '20:00', label: '8:00–8:30 pm' },
      { id: '20:30', label: '8:30–9:00 pm' },
      { id: '21:00', label: '9:00–9:30 pm' },
    ],
    lateSlots: ['20:30', '21:00'],
    farSlots: ['20:00', '20:30', '21:00'],
  },
}
export const MEAL_ORDER = ['lunch', 'dinner']

// TO CONFIRM: orders each slot can take (based on riders available).
export const SLOT_CAPACITY = 25
// TO CONFIRM: extra same-day meals allowed per meal on top of subscriptions. null = no cap.
export const SAME_DAY_CAP = null
// TO CONFIRM: whether we deliver on Sundays. Holidays go in Kitchen admin → Catalog → Closed dates.
export const SUNDAY_CLOSED = true

// ── Plans, credits and skips ────────────────────────────────────────────
export const SINGLE_MEAL_PRICE = 180 // "You save" is measured against this.
// TO CONFIRM: skips must be made by this time on the day before the meal.
export const SKIP_CUTOFF = { daysBefore: 1, time: '21:00' }
// TO CONFIRM: credits stay valid for the plan length plus 50%.
export const CREDIT_VALIDITY_FACTOR = 1.5
// How far ahead a plan can start.
export const MAX_DAYS_AHEAD = 30

// ── Delivery proof and missing-box reports ──────────────────────────────
// TO CONFIRM: warn the rider if they mark delivered further than this from the pin.
export const PROOF_MAX_DISTANCE_M = 150
// TO CONFIRM: "Didn't get my box?" stays open this long after the delivery window ends.
export const REPORT_WINDOW_MINUTES = 60
export const REPORT_REASONS = [
  { id: 'not_received', label: 'Not received' },
  { id: 'wrong_meal', label: 'Wrong meal' },
  { id: 'damaged', label: 'Spilled or damaged' },
  { id: 'missing_extras', label: 'Missing extras' },
]

// ── Allergies, preferences and the unreachable-customer handoff ─────────
export const ALLERGENS = [
  { id: 'dairy', label: 'Dairy', ticket: 'NO DAIRY' },
  { id: 'gluten', label: 'Gluten / wheat', ticket: 'NO GLUTEN' },
  { id: 'peanuts', label: 'Peanuts', ticket: 'NO PEANUTS' },
  { id: 'tree_nuts', label: 'Tree nuts (cashew, almond)', ticket: 'NO NUTS' },
  { id: 'soy', label: 'Soy', ticket: 'NO SOY' },
  { id: 'sesame', label: 'Sesame', ticket: 'NO SESAME' },
  { id: 'mustard', label: 'Mustard', ticket: 'NO MUSTARD' },
]
// TO CONFIRM: which preferences the kitchen will actually offer.
export const PREFERENCES = [
  { id: 'less_spicy', label: 'Less spicy' },
  { id: 'less_oil', label: 'Less oil' },
  { id: 'jain', label: 'No onion-garlic (Jain)' },
]
export const HANDOFFS = [
  { id: 'call_then_guard', label: 'Call me first, then leave it with the guard', short: 'Call first → guard' },
  { id: 'call_then_door', label: 'Call me first, then leave it at my door', short: 'Call first → door' },
  { id: 'door', label: 'Leave it at my door', short: 'Leave at door' },
  { id: 'guard', label: 'Hand it to the guard / reception', short: 'Guard / reception' },
]
export const DEFAULT_HANDOFF = 'call_then_guard'

// ── Business details shown on policies, the footer and receipts ─────────
export const BUSINESS = {
  legalName: 'Garam Dibba',
  kitchenAddress: 'Tea Time, A4, Doon IT Park, Govind Vihar, Dehradun, Uttarakhand 248013',
  // Shown only when set. Add them in Vercel as NEXT_PUBLIC_FSSAI_LICENSE / NEXT_PUBLIC_GSTIN.
  fssai: process.env.NEXT_PUBLIC_FSSAI_LICENSE || '',
  gstin: process.env.NEXT_PUBLIC_GSTIN || '',
}
// TO CONFIRM: set true once GST-registered; prices are then shown as GST-inclusive.
export const PRICES_INCLUDE_GST = Boolean(BUSINESS.gstin)

// ── Helpers ─────────────────────────────────────────────────────────────
export const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function deliveryFeeFor(roadKm) {
  if (!Number.isFinite(roadKm) || roadKm > MAX_DELIVERY_KM) return null
  return DELIVERY_FEE_BANDS.find((band) => roadKm <= band.upToKm)?.fee ?? null
}

export const slotLabel = (meal, slotId) => MEALS[meal]?.slots.find((s) => s.id === slotId)?.label ?? slotId ?? ''
export const handoffLabel = (id) => HANDOFFS.find((h) => h.id === id)?.label ?? ''
export const allergenTicket = (ids = []) => ids.map((id) => ALLERGENS.find((a) => a.id === id)?.ticket ?? id.toUpperCase())
