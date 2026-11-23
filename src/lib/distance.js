// Road distance from the kitchen to a customer's pin. Server-only.
// 1. Google Distance Matrix, when GOOGLE_MAPS_API_KEY is set (what the spec asks for).
// 2. The free OpenStreetMap router (OSRM demo server) otherwise. Fine for low volume.
// 3. Straight-line distance × 1.3 if both are unreachable, so ordering never breaks.
import { KITCHEN } from './config.js'
import { distanceKm, isValidPoint } from './geo.js'

const round2 = (n) => Math.round(n * 100) / 100

async function fetchJson(url, ms = 4000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { 'User-Agent': 'garamdibba.com ordering' } })
    return res.ok ? await res.json() : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function google(point) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return null
  const url =
    'https://maps.googleapis.com/maps/api/distancematrix/json' +
    `?origins=${KITCHEN.lat},${KITCHEN.lng}&destinations=${point.lat},${point.lng}&mode=driving&units=metric&key=${key}`
  const data = await fetchJson(url)
  const meters = data?.rows?.[0]?.elements?.[0]?.distance?.value
  return Number.isFinite(meters) ? meters / 1000 : null
}

async function osrm(point) {
  const url = `https://router.project-osrm.org/route/v1/driving/${KITCHEN.lng},${KITCHEN.lat};${point.lng},${point.lat}?overview=false`
  const data = await fetchJson(url)
  const meters = data?.routes?.[0]?.distance
  return Number.isFinite(meters) ? meters / 1000 : null
}

// Returns { km, method } or null for an invalid point.
export async function roadDistance(point) {
  if (!isValidPoint(point)) return null
  const straight = distanceKm(KITCHEN, point)
  // Far beyond any delivery zone: no need to ask a router.
  if (straight > 15) return { km: round2(straight * 1.3), method: 'straight' }
  const viaGoogle = await google(point)
  if (viaGoogle != null) return { km: round2(viaGoogle), method: 'google' }
  const viaOsrm = await osrm(point)
  if (viaOsrm != null) return { km: round2(viaOsrm), method: 'osrm' }
  return { km: round2(straight * 1.3), method: 'straight' }
}
