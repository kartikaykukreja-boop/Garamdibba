import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CircleCheck, MapPin, Phone, Receipt, RotateCcw, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react'
import { requireSession } from '../../../lib/auth.js'
import { createAdminClient } from '../../../lib/supabase/server.js'
import { KITCHEN } from '../../../lib/config.js'
import { MENUS, dishFor } from '../../../lib/catalog.js'
import { addDays, canSkip, formatDate, formatDateTime, formatTime, todayIST } from '../../../lib/dates.js'
import { canReport } from '../../../lib/tracker.js'
import { signedPhotoUrls } from '../../../lib/orderData.js'
import { DELIVERY_STATUS, ORDER_STATUS, rupees } from '../../../lib/status.js'
import { ALLERGENS, HANDOFFS, MEALS, PREFERENCES, REPORT_REASONS, SKIP_CUTOFF, slotLabel } from '../../../lib/rules.js'
import { dishImage } from '../../../dishImages.js'
import StatusPill from '../../../components/StatusPill.jsx'
import AccountNav from '../../../components/AccountNav.jsx'
import BoxTracker from '../../../components/BoxTracker.jsx'
import Flash from '../../../components/Flash.jsx'
import LiveTracker from './LiveTracker.jsx'
import { changeSlot, pausePlan, reportBox, resumePlan, skipBox } from './actions.js'

export const metadata = { title: 'Your order | Garam Dibba', robots: { index: false } }

const MESSAGES = {
  skipped: 'Skipped. Your credit is kept and the box moves to the end of your plan.',
  paused: 'Your plan is paused. Your credits are kept until you resume.',
  resumed: 'Welcome back! Your plan is running again.',
  slot: 'Delivery slot updated for your upcoming boxes.',
  reported: 'Thanks for telling us. We’re checking with the rider and will call you shortly.',
  skip_late: `Too late to skip that one: skips close at ${SKIP_CUTOFF.time === '21:00' ? '9 pm' : SKIP_CUTOFF.time} the day before.`,
  skip_state: 'That box can’t be skipped any more.',
  validity: 'That would go past the date your credits are valid until. Please pick an earlier date or contact us.',
  nothing_to_pause: 'There are no upcoming boxes that can still be paused.',
  resume_date: 'Please pick a resume date at least a day ahead.',
  report_reason: 'Please choose what went wrong.',
  report_late: 'Reports for this box have closed. Please WhatsApp us and we’ll help.',
  report_open: 'You’ve already reported this box. We’re on it.',
  generic: 'Something went wrong. Please try again.',
}

const HANDOFF_DONE = { customer: 'Handed to you', door: 'Left at your door', guard: 'Left with the guard', contact: 'Handed to your delivery contact' }

// First date whose skip deadline hasn't passed (used for resume).
function firstChangeableDate() {
  let day = todayIST()
  while (!canSkip(day)) day = addDays(day, 1)
  return day
}

export default async function OrderDetailPage({ params, searchParams }) {
  const { id } = await params
  const query = await searchParams
  const { user, profile } = await requireSession(`/orders/${id}`)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const admin = createAdminClient()
  const { data: order } = await admin.from('orders').select('*, deliveries(*)').eq('id', id).maybeSingle()
  if (!order || (order.user_id !== user.id && profile.role !== 'admin')) notFound()
  const { data: reports } = await admin.from('delivery_reports').select('delivery_id, status').eq('order_id', id)

  const deliveries = [...order.deliveries].sort((a, b) => a.delivery_date.localeCompare(b.delivery_date) || a.created_at.localeCompare(b.created_at))
  const photos = await signedPhotoUrls(admin, deliveries.map((d) => d.proof_path))
  const today = todayIST()
  const active =
    deliveries.find((d) => d.status === 'out_for_delivery') ??
    deliveries.find((d) => d.delivery_date === today && ['scheduled', 'preparing'].includes(d.status)) ??
    null

  let rider = null
  if (active?.rider_id && active.status === 'out_for_delivery') {
    const [{ data: riderProfile }, { data: location }] = await Promise.all([
      admin.from('profiles').select('full_name, phone').eq('id', active.rider_id).maybeSingle(),
      admin.from('rider_locations').select('lat, lng, updated_at').eq('rider_id', active.rider_id).maybeSingle(),
    ])
    rider = { id: active.rider_id, name: riderProfile?.full_name || 'Your rider', phone: riderProfile?.phone, location }
  }

  const isPlan = order.boxes > 1
  const live = ['confirmed'].includes(order.status)
  const skippable = deliveries.some((d) => d.status === 'scheduled' && canSkip(d.delivery_date))
  const paused = deliveries.some((d) => d.status === 'paused')
  const openReports = new Set((reports ?? []).filter((r) => r.status === 'open').map((r) => r.delivery_id))
  const firstDish = dishFor(order.menu, order.start_date, order.bowl_choice)
  const meal = MEALS[order.meal] ?? MEALS.lunch
  const extras = Array.isArray(order.extras) ? order.extras : []

  return (
    <main className="app-page">
      <div className="shell">
        <AccountNav profile={profile} active="/orders" />
        <Flash params={query} messages={MESSAGES} />

        {query.placed && (
          <section className={`app-card placed-card ${order.status === 'pending_payment' ? 'is-pending' : ''}`}>
            <div className="placed-photo">
              <Image src={dishImage(order.menu, firstDish)} alt={firstDish.name} fill sizes="(max-width: 760px) 100vw, 380px" placeholder="blur" />
            </div>
            <div className="placed-copy">
              {order.status === 'pending_payment' ? (
                <>
                  <h1 className="app-title">Confirming your payment…</h1>
                  <p className="app-muted">This usually takes a few seconds. Refresh this page if it doesn’t update.</p>
                </>
              ) : (
                <>
                  <p className="placed-tick"><CircleCheck aria-hidden="true" /> Order confirmed</p>
                  <h1 className="app-title">Your dibba is booked!</h1>
                  <p>
                    First box: <strong>{formatDate(order.start_date, { weekday: 'long', day: 'numeric', month: 'short' })}</strong>, {meal.label.toLowerCase()}, {slotLabel(order.meal, order.slot)}.
                    {isPlan && <> {order.boxes} meals on your plan.</>}
                  </p>
                  <p className="app-muted">We’ll keep this page updated, and you can track the rider live once your dibba leaves the kitchen.</p>
                  {!isPlan && (
                    <div className="app-actions">
                      <Link className="button" href={`/order?again=${order.id}`}><RotateCcw size={18} aria-hidden="true" /> Same time tomorrow? One tap</Link>
                      {order.menu === 'north_indian' && (
                        <Link className="button button-cream" href={`/order?again=${order.id}&menu=protein_bowl`}><Sparkles size={18} aria-hidden="true" /> Try a Protein Bowl tomorrow</Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        <header className="app-head">
          <p className="order-row-top">
            <strong>Order #{order.order_number}</strong>
            <StatusPill status={order.status} map={ORDER_STATUS} />
          </p>
          {!query.placed && <h1 className="app-title">{order.plan_name}{order.quantity > 1 ? ` × ${order.quantity}` : ''}</h1>}
          <p className="app-muted">
            {rupees(order.total)} · {order.payment_method === 'company' ? 'Charged to company budget' : 'Paid online'}
            {order.paid_at && ` · ${formatDateTime(order.paid_at)}`}
            {' · '}<Link href={`/orders/${order.id}/receipt`}><Receipt size={14} aria-hidden="true" /> Receipt</Link>
          </p>
          {order.refund_due && <p className="app-alert">A refund of {rupees(order.refund_due)} is being processed to your original payment method.</p>}
        </header>

        {deliveries.length > 0 && isPlan && <BoxTracker order={order} deliveries={deliveries} />}

        {active && (
          <LiveTracker
            key={`${active.id}-${active.status}`}
            orderId={order.id}
            delivery={{ id: active.id, status: active.status, item: active.item_name, date: active.delivery_date }}
            destination={{ lat: order.lat, lng: order.lng }}
            kitchen={KITCHEN}
            rider={rider}
          />
        )}

        {isPlan && live && (skippable || paused) && (
          <section className="app-card plan-controls">
            <h2 className="app-subtitle">Manage your plan</h2>
            <p className="app-muted">Skip, pause or change your slot by {SKIP_CUTOFF.time === '21:00' ? '9 pm' : SKIP_CUTOFF.time} the day before. Skipped and paused meals keep their credit{order.valid_until && <> (use by {formatDate(order.valid_until)})</>}.</p>
            <div className="plan-controls-row">
              {paused ? (
                <form action={resumePlan} className="app-inline-form">
                  <input type="hidden" name="order_id" value={order.id} />
                  <label className="app-field">
                    <span>Resume from</span>
                    <input type="date" name="from" min={firstChangeableDate()} defaultValue={firstChangeableDate()} required />
                  </label>
                  <button className="button button-small" type="submit">Resume plan</button>
                </form>
              ) : (
                <form action={pausePlan}>
                  <input type="hidden" name="order_id" value={order.id} />
                  <button className="button button-small button-outline" type="submit">Pause plan</button>
                </form>
              )}
              <form action={changeSlot} className="app-inline-form">
                <input type="hidden" name="order_id" value={order.id} />
                <label className="app-field">
                  <span>{meal.label} slot</span>
                  <select name="slot" defaultValue={order.slot ?? ''}>
                    {meal.slots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
                <button className="button button-small button-cream" type="submit">Change slot</button>
              </form>
            </div>
          </section>
        )}

        <div className="detail-grid">
          <section className="app-card">
            <h2 className="app-subtitle">{isPlan ? 'Day by day' : 'Your delivery'}</h2>
            <ol className="delivery-list">
              {deliveries.map((d) => (
                <li key={d.id} className={`${d.delivery_date === today ? 'is-today' : ''} ${['skipped', 'missed', 'cancelled'].includes(d.status) ? 'is-muted' : ''}`}>
                  <span className="delivery-date">
                    {formatDate(d.delivery_date)}{d.delivery_date === today && <b> · Today</b>}
                    <small> · {MEALS[d.meal]?.label ?? 'Lunch'}{d.slot && `, ${slotLabel(d.meal, d.slot)}`}</small>
                  </span>
                  <span className="delivery-item">
                    {d.item_name.replace('Everyday Dabba: ', '')}{d.quantity > 1 ? ` × ${d.quantity}` : ''}
                    {d.kind === 'makeup' && <em className="kind-tag">Make-up</em>}
                    {d.kind === 'carry' && <em className="kind-tag">Carried over</em>}
                    {Array.isArray(d.extras) && d.extras.length > 0 && <small className="app-muted"> + {d.extras.map((x) => x.name).join(', ')}</small>}
                  </span>
                  <StatusPill status={d.status} map={DELIVERY_STATUS} />
                  {d.delivered_at && (
                    <small className="app-muted">
                      {HANDOFF_DONE[d.handoff_result] ?? 'Delivered'} at {formatTime(d.delivered_at)}
                    </small>
                  )}
                  {photos[d.proof_path] && (
                    <a className="proof-thumb" href={photos[d.proof_path]} target="_blank" rel="noreferrer">
                      <img src={photos[d.proof_path]} alt="Photo of your box at the drop point" />
                    </a>
                  )}
                  <div className="delivery-actions">
                    {d.status === 'scheduled' && isPlan && canSkip(d.delivery_date) && live && (
                      <form action={skipBox}>
                        <input type="hidden" name="order_id" value={order.id} />
                        <input type="hidden" name="delivery_id" value={d.id} />
                        <button className="app-linkbutton" type="submit">Skip this day</button>
                      </form>
                    )}
                    {openReports.has(d.id) && <small className="app-muted"><ShieldAlert size={14} aria-hidden="true" /> Reported. We’re on it.</small>}
                    {!openReports.has(d.id) && canReport(d) && (
                      <details className="report-box">
                        <summary>Didn’t receive this? Let us know</summary>
                        <form action={reportBox} className="app-form">
                          <input type="hidden" name="order_id" value={order.id} />
                          <input type="hidden" name="delivery_id" value={d.id} />
                          <fieldset className="report-reasons">
                            <legend>What went wrong?</legend>
                            {REPORT_REASONS.map((r, i) => (
                              <label key={r.id}><input type="radio" name="reason" value={r.id} defaultChecked={i === 0} /> {r.label}</label>
                            ))}
                          </fieldset>
                          <label className="app-field"><span>Note (optional)</span><input name="note" maxLength={400} /></label>
                          <label className="app-field"><span>Photo (optional)</span><input type="file" name="photo" accept="image/*" /></label>
                          <button className="button button-small" type="submit">Send report</button>
                        </form>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {!deliveries.length && <p className="app-muted">Deliveries appear here once payment is confirmed.</p>}
          </section>

          <section className="app-card">
            <h2 className="app-subtitle">Delivering to</h2>
            <p className="detail-line"><MapPin size={18} aria-hidden="true" /> <span>{order.address_line}{order.address_landmark && <><br />Near {order.address_landmark}</>}</span></p>
            <p className="detail-line"><Phone size={18} aria-hidden="true" /> <span>{order.customer_name} · {order.customer_phone}{order.delivery_contact && <><br />Delivery contact: {order.delivery_contact}</>}</span></p>
            {order.handoff && <p className="app-muted">If we can’t reach you: {HANDOFFS.find((h) => h.id === order.handoff)?.label}</p>}
            {order.delivery_note && <p className="app-muted">Rider note: {order.delivery_note}</p>}
            {order.allergies?.length > 0 && (
              <p className="allergy-line"><TriangleAlert size={16} aria-hidden="true" /> Allergies: {order.allergies.map((a) => ALLERGENS.find((x) => x.id === a)?.label ?? a).join(', ')}</p>
            )}
            {order.preferences?.length > 0 && <p className="app-muted">Preferences: {order.preferences.map((p) => PREFERENCES.find((x) => x.id === p)?.label ?? p).join(', ')}</p>}
            {extras.length > 0 && <p className="app-muted">Add-ons: {extras.map((x) => `${x.name}${x.qty > 1 ? ` × ${x.qty}` : ''}`).join(', ')}</p>}
            <div className="app-actions">
              <Link className="button button-small" href={`/order?again=${order.id}`}>
                <RotateCcw size={16} aria-hidden="true" /> {isPlan ? `Renew ${MENUS[order.menu]?.name ?? ''} plan` : 'Order this again'}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
