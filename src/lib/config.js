// Business settings that can be changed on Vercel without touching code (see .env.example).
// Ordering rules (fees, slots, cutoffs, skips) live in rules.js.
// NEXT_PUBLIC_ values are also visible in the browser, which is fine for these.
import { MAX_DELIVERY_KM } from './rules.js'

function num(value, fallback) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// Kitchen: Tea Time, A4, Doon IT Park, Govind Vihar, Dehradun 248013 (Google Maps pin).
export const KITCHEN = {
  lat: num(process.env.NEXT_PUBLIC_KITCHEN_LAT, 30.365015),
  lng: num(process.env.NEXT_PUBLIC_KITCHEN_LNG, 78.088288),
}

// Orders are only accepted for addresses within this road distance of the kitchen.
export const DELIVERY_RADIUS_KM = num(process.env.NEXT_PUBLIC_DELIVERY_RADIUS_KM, MAX_DELIVERY_KM)

// Riders' GPS points are pushed at most this often (milliseconds).
export const RIDER_PING_MS = 8000
