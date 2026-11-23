import { DELIVERY_RADIUS_KM, KITCHEN } from './config.js'

// Straight-line ("as the crow flies") distance between two points, in km.
export function distanceKm(a, b) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function isValidPoint(point) {
  return (
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  )
}

export function deliveryCheck(point) {
  if (!isValidPoint(point)) return { ok: false, distance: null }
  const distance = distanceKm(KITCHEN, point)
  return { ok: distance <= DELIVERY_RADIUS_KM, distance: Math.round(distance * 100) / 100 }
}

// Rough rider ETA for city traffic (~18 km/h average, road ≈ 1.3× straight line).
export function etaMinutes(from, to) {
  return Math.max(2, Math.round(((distanceKm(from, to) * 1.3) / 18) * 60))
}
