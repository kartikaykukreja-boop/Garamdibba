import Link from 'next/link'
import { formatDate } from '../lib/dates.js'
import { trackerCounts } from '../lib/tracker.js'
import { MEALS, slotLabel } from '../lib/rules.js'

// "2-Week Plan · Everyday Dabba ■■■■■■■□□□□□ 7 of 12 delivered · 5 left"
export default function BoxTracker({ order, deliveries, href }) {
  const t = trackerCounts(deliveries)
  const title = order.plan_name.includes(': ') ? order.plan_name.split(': ').reverse().join(' · ') : order.plan_name
  const body = (
    <>
      <p className="box-tracker-title">
        <strong>{title}</strong>
        <span>{t.delivered} of {t.credits.length} delivered · {t.left} left</span>
      </p>
      <ol className="box-tracker-icons" aria-label={`${t.delivered} of ${t.credits.length} boxes delivered`}>
        {t.credits.map((d) => (
          <li key={d.id} className={`is-${d.status}`} title={`${formatDate(d.delivery_date)}: ${d.status.replaceAll('_', ' ')}`} />
        ))}
      </ol>
      <p className="box-tracker-meta">
        {t.next && <>Next box: {formatDate(t.next.delivery_date)}, {MEALS[t.next.meal]?.label.toLowerCase() ?? 'lunch'}{t.next.slot && `, ${slotLabel(t.next.meal, t.next.slot)}`}</>}
        {t.next && t.last && ' · '}
        {t.last && t.left > 0 && <>Last box: {formatDate(t.last.delivery_date)}</>}
        {!t.left && 'All boxes delivered. Hope you enjoyed them!'}
      </p>
      {(t.skipped > 0 || t.makeups > 0 || t.paused > 0) && (
        <p className="box-tracker-meta">
          {[
            t.skipped && `${t.skipped} skipped (credit kept)`,
            t.makeups && `${t.makeups} make-up`,
            t.paused && `${t.paused} paused`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </>
  )
  return href ? <Link href={href} className="app-card box-tracker is-link">{body}</Link> : <section className="app-card box-tracker">{body}</section>
}
