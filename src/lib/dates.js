import { MAX_DAYS_AHEAD, ORDER_CUTOFF_HOUR } from './config.js'

// All delivery dates are calendar dates in India (IST), stored as 'YYYY-MM-DD'.

const istParts = (date = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  )
  return parts
}

export function todayIST(now = new Date()) {
  const p = istParts(now)
  return `${p.year}-${p.month}-${p.day}`
}

function istHour(now = new Date()) {
  const p = istParts(now)
  return Number(p.hour) + Number(p.minute) / 60
}

// Date-only arithmetic in UTC so time zones never shift the day.
export function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function weekday(ymd) {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay() // 0 = Sunday
}

export const isDeliveryDay = (ymd) => weekday(ymd) !== 0

export function nextDeliveryDay(ymd) {
  let day = ymd
  while (!isDeliveryDay(day)) day = addDays(day, 1)
  return day
}

export function earliestStartDate(now = new Date()) {
  const today = todayIST(now)
  const start = istHour(now) < ORDER_CUTOFF_HOUR ? today : addDays(today, 1)
  return nextDeliveryDay(start)
}

export function latestStartDate(now = new Date()) {
  return addDays(todayIST(now), MAX_DAYS_AHEAD)
}

// `boxes` delivery days starting at `start`, skipping Sundays.
export function deliveryDates(start, boxes) {
  const dates = []
  let day = nextDeliveryDay(start)
  while (dates.length < boxes) {
    dates.push(day)
    day = nextDeliveryDay(addDays(day, 1))
  }
  return dates
}

export function formatDate(ymd, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' })
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function isValidYmd(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}
