'use client'

import { useEffect, useState } from 'react'
import { addDays, formatDate, nextOrderable, todayIST } from '../lib/dates.js'
import { MEALS } from '../lib/rules.js'

// The next meal a customer can order, re-checked every 20 seconds in the browser.
// null on the server and the first render, so the HTML never carries a stale time.
export function useNextOrderable(closed = []) {
  const [now, setNow] = useState(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, 20000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [])
  return now ? { now, ...nextOrderable(now, closed) } : null
}

export function mealPhrase({ meal, date, now }) {
  const label = MEALS[meal].label.toLowerCase()
  const today = todayIST(now)
  if (date === today) return meal === 'dinner' ? 'tonight’s dinner' : `today’s ${label}`
  if (date === addDays(today, 1)) return `tomorrow’s ${label}`
  return `${formatDate(date, { weekday: 'long' })}’s ${label}`
}

