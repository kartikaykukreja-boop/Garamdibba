// Which delivery slots a customer can pick. Shared by the browser and the server.
import { FREE_DELIVERY_KM, MEALS, SLOT_CAPACITY, minutesOf } from './rules.js'
import { istMinutes, todayIST } from './dates.js'

/**
 * @param meal 'lunch' | 'dinner'
 * @param date 'YYYY-MM-DD' of the (first) delivery
 * @param roadKm customer's road distance, or null if unknown
 * @param load { bySlot: { '13:00': 12, … } } boxes already booked
 * Returns the slots to show: { id, label, available, full, late }.
 * Far addresses (beyond the free zone) only see the middle and later slots.
 * Late same-day orders only see the later slots.
 */
export function slotOptions({ meal, date, roadKm = null, load = null, now = new Date() }) {
  const m = MEALS[meal]
  if (!m) return []
  const isToday = date === todayIST(now)
  const mins = istMinutes(now)
  const late = isToday && mins > minutesOf(m.lateAfter)
  const closed = isToday && mins > minutesOf(m.cutoff)
  const far = roadKm != null && roadKm > FREE_DELIVERY_KM

  return m.slots
    .filter((s) => !far || m.farSlots.includes(s.id))
    .filter((s) => !late || m.lateSlots.includes(s.id))
    .map((s) => {
      const full = (load?.bySlot?.[s.id] ?? 0) >= SLOT_CAPACITY
      return { ...s, full, late, available: !closed && !full }
    })
}

export function slotAllowed(args, slotId) {
  return slotOptions(args).some((s) => s.id === slotId && s.available)
}
