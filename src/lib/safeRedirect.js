// Only same-site paths may be used as "go here after sign-in" targets.
// Rejects //evil.com, /\evil.com (browsers treat \ as /), absolute URLs and control characters.
const BASE = 'https://garamdibba.invalid'

export function safeNextPath(value, fallback = '/order') {
  if (typeof value !== 'string' || !value || value.length > 512) return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code < 32 || code === 127) return fallback
  }
  try {
    const url = new URL(value, BASE)
    if (url.origin !== BASE) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
