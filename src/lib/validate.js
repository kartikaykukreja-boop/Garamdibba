export const clean = (value, max) => String(value ?? '').trim().slice(0, max)

// Indian mobile number → 10 digits, or null.
export function normalisePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-10)
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}
