import { MAX_DAYS_AHEAD, MEALS, MEAL_ORDER, SKIP_CUTOFF, SUNDAY_CLOSED, minutesOf } from './rules.js'

// All delivery dates are calendar dates in India (IST), stored as 'YYYY-MM-DD'.
// Shared by the browser and the server.

const istParts = (date = new Date()) =>
  Object.fromEntries(
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

export function todayIST(now = new Date()) {
  const p = istParts(now)
  return `${p.year}-${p.month}-${p.day}`
}

// Minutes since midnight, IST.
export function istMinutes(now = new Date()) {
  const p = istParts(now)
  return Number(p.hour) * 60 + Number(p.minute)
}

// Date-only arithmetic in UTC so time zones never shift the day.
export function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

export function weekday(ymd) {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay() // 0 = Sunday
}

// Is the kitchen open on this date? closed = Set or array of 'YYYY-MM-DD'.
export function isOpenDay(ymd, closed = []) {
  if (SUNDAY_CLOSED && weekday(ymd) === 0) return false
  return !(closed instanceof Set ? closed.has(ymd) : closed.includes(ymd))
}

// Kept for older callers: Monday–Saturday.
export const isDeliveryDay = (ymd) => isOpenDay(ymd)

export function nextOpenDay(ymd, closed = []) {
  let day = ymd
  for (let i = 0; i < 60 && !isOpenDay(day, closed); i += 1) day = addDays(day, 1)
  return day
}

// Can this meal still be ordered for this date? (today: only before the cutoff)
export function canOrderFor(ymd, meal, now = new Date(), closed = []) {
  const today = todayIST(now)
  if (ymd < today || !isOpenDay(ymd, closed) || !MEALS[meal]) return false
  if (ymd > addDays(today, MAX_DAYS_AHEAD)) return false
  return ymd > today || istMinutes(now) <= minutesOf(MEALS[meal].cutoff)
}

export function earliestDate(meal, now = new Date(), closed = []) {
  const today = todayIST(now)
  let day = canOrderFor(today, meal, now, closed) ? today : addDays(today, 1)
  return nextOpenDay(day, closed)
}

export const latestStartDate = (now = new Date()) => addDays(todayIST(now), MAX_DAYS_AHEAD)

// The next meal a customer can order, for the live countdown and the automatic rollover.
// Returns { meal, date, cutoffAt (ms, only when ordering for today) }.
export function nextOrderable(now = new Date(), closed = []) {
  const today = todayIST(now)
  if (isOpenDay(today, closed)) {
    for (const meal of MEAL_ORDER) {
      if (istMinutes(now) <= minutesOf(MEALS[meal].cutoff)) {
        const cutoffAt = Date.parse(`${today}T${MEALS[meal].cutoff}:59+05:30`)
        return { meal, date: today, cutoffAt }
      }
    }
  }
  return { meal: MEAL_ORDER[0], date: nextOpenDay(addDays(today, 1), closed), cutoffAt: null }
}

// Delivery dates for a plan: `count` open days from `start`, only on the chosen weekdays
// (0–6), skipping closed dates and any date `skip(ymd)` rejects (e.g. allergen days).
export function planDates(start, count, { weekdays = [1, 2, 3, 4, 5, 6], closed = [], skip = () => false } = {}) {
  const allowed = new Set(weekdays)
  const dates = []
  const skipped = []
  let day = start
  for (let guard = 0; dates.length < count && guard < 400; guard += 1, day = addDays(day, 1)) {
    if (!isOpenDay(day, closed) || !allowed.has(weekday(day))) continue
    if (skip(day)) skipped.push(day)
    else dates.push(day)
  }
  return { dates, skipped, complete: dates.length === count }
}

// Skips must be made before SKIP_CUTOFF (e.g. 9 pm the day before).
export function skipDeadline(ymd) {
  const day = addDays(ymd, -SKIP_CUTOFF.daysBefore)
  return Date.parse(`${day}T${SKIP_CUTOFF.time}:00+05:30`)
}
export const canSkip = (ymd, now = new Date()) => now.getTime() < skipDeadline(ymd)

// When the delivery window for a meal on a date ends (ms).
export function windowEnd(ymd, meal) {
  const slots = MEALS[meal]?.slots ?? MEALS.lunch.slots
  const last = minutesOf(slots[slots.length - 1].id) + 30
  const hh = String(Math.floor(last / 60)).padStart(2, '0')
  const mm = String(last % 60).padStart(2, '0')
  return Date.parse(`${ymd}T${hh}:${mm}:00+05:30`)
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

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })
}

// "today" / "tomorrow" / "Mon 7 Dec"
export function friendlyDate(ymd, now = new Date()) {
  const today = todayIST(now)
  if (ymd === today) return 'today'
  if (ymd === addDays(today, 1)) return 'tomorrow'
  return formatDate(ymd)
}

export function isValidYmd(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}
