'use client'

import { Clock } from 'lucide-react'
import { mealPhrase, useNextOrderable } from './useNextOrderable.js'

// The real time left until the next order cutoff. Never a fake timer: it counts down to the
// actual cutoff and then rolls over to the next meal ("Order for tonight's dinner").

function left(ms) {
  const mins = Math.max(1, Math.ceil(ms / 60000))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

export default function CutoffCountdown({ closed = [], className = '' }) {
  const next = useNextOrderable(closed)
  // Rendered only in the browser, so the server HTML never shows a stale time.
  if (!next) return <p className={`cutoff-countdown ${className}`} aria-hidden="true">&nbsp;</p>
  const phrase = mealPhrase(next)
  return (
    <p className={`cutoff-countdown ${className}`} role="status">
      <Clock size={16} aria-hidden="true" />
      {next.cutoffAt ? (
        <span>Order in the next <strong>{left(next.cutoffAt - next.now.getTime())}</strong> for {phrase}</span>
      ) : (
        <span>Order now for <strong>{phrase}</strong></span>
      )}
    </p>
  )
}
