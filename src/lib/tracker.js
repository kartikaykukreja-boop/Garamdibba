import { todayIST, windowEnd } from './dates.js'
import { REPORT_WINDOW_MINUTES } from './rules.js'

// One credit = one delivery row that wasn't replaced (skipped and missed rows hand their
// credit to a carry-over or make-up row).
const PENDING = ['scheduled', 'preparing', 'out_for_delivery', 'paused']

export function trackerCounts(deliveries) {
  const credits = deliveries.filter((d) => !['skipped', 'missed'].includes(d.status))
  const sorted = [...credits].sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
  const today = todayIST()
  const next = sorted.find((d) => PENDING.includes(d.status) && d.status !== 'paused' && d.delivery_date >= today)
  const lastPending = [...sorted].reverse().find((d) => PENDING.includes(d.status))
  return {
    credits: sorted,
    delivered: sorted.filter((d) => d.status === 'delivered').length,
    left: sorted.filter((d) => PENDING.includes(d.status)).length,
    paused: sorted.filter((d) => d.status === 'paused').length,
    skipped: deliveries.filter((d) => d.status === 'skipped').length,
    makeups: deliveries.filter((d) => d.kind === 'makeup').length,
    next,
    last: lastPending ?? sorted.at(-1),
  }
}

// "Didn't get my box?" stays open until REPORT_WINDOW_MINUTES after the delivery window ends.
export function canReport(d, now = new Date()) {
  if (!['delivered', 'out_for_delivery'].includes(d.status)) return false
  return now.getTime() <= windowEnd(d.delivery_date, d.meal) + REPORT_WINDOW_MINUTES * 60000
}
