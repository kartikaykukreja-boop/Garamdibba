// Business settings. Values come from environment variables (see .env.example)
// so they can be changed on Vercel/Netlify without touching code.
// NEXT_PUBLIC_ values are also visible in the browser, which is fine for these.

function num(value, fallback) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const KITCHEN = {
  lat: num(process.env.NEXT_PUBLIC_KITCHEN_LAT, 30.3165),
  lng: num(process.env.NEXT_PUBLIC_KITCHEN_LNG, 78.0322),
}

// Orders are only accepted for addresses within this straight-line distance of the kitchen.
export const DELIVERY_RADIUS_KM = num(process.env.NEXT_PUBLIC_DELIVERY_RADIUS_KM, 5)

// Same-day orders are accepted until this hour (IST, 24h clock). After that, the earliest date is the next delivery day.
export const ORDER_CUTOFF_HOUR = num(process.env.NEXT_PUBLIC_ORDER_CUTOFF_HOUR, 10)

// How far ahead a plan can start.
export const MAX_DAYS_AHEAD = 30

// Riders' GPS points are pushed at most this often (milliseconds).
export const RIDER_PING_MS = 8000
