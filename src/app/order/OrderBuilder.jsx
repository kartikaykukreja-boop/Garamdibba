'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CreditCard, Minus, Plus } from 'lucide-react'
import AddressPicker from '../../components/AddressPicker.jsx'
import { MENUS, quoteOrder } from '../../lib/catalog.js'
import { formatDate, isDeliveryDay } from '../../lib/dates.js'
import { deliveryCheck } from '../../lib/geo.js'
import { bowls } from '../../siteData.js'
import { createOrder } from './actions.js'
import { confirmPayment } from '../../lib/actions/payment.js'
import { openRazorpay } from '../../lib/razorpayCheckout.js'

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`

export default function OrderBuilder({ kitchen, radiusKm, earliest, latest, company, defaults, initial }) {
  const router = useRouter()
  const [menu, setMenu] = useState(initial.menu)
  const [planId, setPlanId] = useState(initial.planId)
  const [bowlSlug, setBowlSlug] = useState(initial.bowlSlug)
  const [quantity, setQuantity] = useState(1)
  const [startDate, setStartDate] = useState(earliest)
  const [point, setPoint] = useState(defaults.point)
  const [addressLine, setAddressLine] = useState(defaults.addressLine)
  const [landmark, setLandmark] = useState(defaults.landmark)
  const [name, setName] = useState(defaults.name)
  const [phone, setPhone] = useState(defaults.phone)
  const [notes, setNotes] = useState('')
  const [payWith, setPayWith] = useState(company ? 'company' : 'online')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const check = deliveryCheck(point)
  const dateOk = startDate >= earliest && startDate <= latest && isDeliveryDay(startDate)
  const quote = useMemo(
    () => (dateOk ? quoteOrder({ menu, planId, quantity, startDate, bowlSlug }) : null),
    [menu, planId, quantity, startDate, bowlSlug, dateOk],
  )

  function chooseMenu(next) {
    setMenu(next)
    setPlanId(MENUS[next].plans[0].id)
    setBowlSlug('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!check.ok) return setError('Please set a delivery location inside our delivery area.')
    if (!quote) return setError('Please pick a valid start date (Monday to Saturday).')
    setBusy(true)

    const result = await createOrder({
      menu, planId, bowlSlug, quantity, startDate,
      lat: point.lat, lng: point.lng,
      addressLine, landmark, name, phone, notes, payWith,
    })
    if (result.error) {
      setBusy(false)
      return setError(result.error)
    }
    if (result.done) {
      router.push(`/orders/${result.orderId}?placed=1`)
      return
    }

    try {
      await openRazorpay(result.checkout, {
        onSuccess: async (response) => {
          const confirmed = await confirmPayment(response)
          if (confirmed.error) setError(confirmed.error)
          router.push(`/orders/${result.orderId}?placed=1`)
        },
        onDismiss: () => {
          setBusy(false)
          setError('Payment was cancelled. Your order is not placed yet. You can try again.')
        },
        onFailure: (message) => setError(`${message} You can try again.`),
      })
    } catch (loadError) {
      setBusy(false)
      setError(loadError.message)
    }
  }

  const plans = MENUS[menu].plans

  return (
    <form className="order-layout" onSubmit={submit}>
      <div className="order-steps">
        <section className="app-card">
          <h2 className="app-step"><span>1</span> Where should we deliver?</h2>
          <AddressPicker
            kitchen={kitchen}
            radiusKm={radiusKm}
            point={point}
            onPointChange={setPoint}
            onAddressSuggestion={(label) => setAddressLine((current) => current || label)}
          />
          <div className="app-grid-2">
            <label className="app-field app-span-2">
              <span>Full address</span>
              <textarea
                rows={2}
                required
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Flat / house no., building, street, area"
              />
            </label>
            <label className="app-field app-span-2">
              <span>Landmark (optional)</span>
              <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near…" />
            </label>
          </div>
        </section>

        <section className="app-card">
          <h2 className="app-step"><span>2</span> What would you like?</h2>
          <div className="app-segment" role="radiogroup" aria-label="Menu">
            {Object.values(MENUS).map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={menu === m.id}
                className={menu === m.id ? 'is-active' : ''}
                onClick={() => chooseMenu(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>

          <div className="plan-options" role="radiogroup" aria-label="Plan">
            {plans.map((plan) => (
              <label key={plan.id} className={planId === plan.id ? 'plan-option is-active' : 'plan-option'}>
                <input
                  type="radio"
                  name="plan"
                  value={plan.id}
                  checked={planId === plan.id}
                  onChange={() => setPlanId(plan.id)}
                />
                <strong>{plan.name}</strong>
                <span>{plan.boxes} {plan.boxes === 1 ? 'box' : 'boxes'} · {rupees(plan.price)}/box</span>
                <b>{rupees(plan.total)}</b>
                {plan.best && <em>Best value</em>}
              </label>
            ))}
          </div>

          <div className="app-grid-2">
            {menu === 'protein_bowl' && (
              <label className="app-field">
                <span>Bowl</span>
                <select value={bowlSlug} onChange={(e) => setBowlSlug(e.target.value)}>
                  <option value="">Chef’s daily rotation</option>
                  {bowls.map((bowl) => (
                    <option key={bowl.slug} value={bowl.slug}>{bowl.name} ({bowl.protein}g protein)</option>
                  ))}
                </select>
              </label>
            )}
            <label className="app-field">
              <span>Start date</span>
              <input
                type="date"
                required
                min={earliest}
                max={latest}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {!dateOk && <small className="app-error-text">Choose a Monday–Saturday date from {formatDate(earliest)}.</small>}
            </label>
            <div className="app-field">
              <span>Boxes per day</span>
              <div className="stepper">
                <button type="button" aria-label="One fewer" onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus size={16} /></button>
                <output aria-live="polite">{quantity}</output>
                <button type="button" aria-label="One more" onClick={() => setQuantity((q) => Math.min(20, q + 1))}><Plus size={16} /></button>
              </div>
            </div>
          </div>
        </section>

        <section className="app-card">
          <h2 className="app-step"><span>3</span> Your details</h2>
          <div className="app-grid-2">
            <label className="app-field">
              <span>Name</span>
              <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="app-field">
              <span>Mobile number</span>
              <input
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
              />
            </label>
            <label className="app-field app-span-2">
              <span>Note for the kitchen or rider (optional)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Less spicy, call at the gate…" />
            </label>
          </div>
        </section>
      </div>

      <aside className="order-summary app-card">
        <h2 className="app-step"><span>4</span> Summary</h2>
        {quote ? (
          <>
            <p className="summary-plan">
              {MENUS[menu].name}: {quote.plan.name}
              {quantity > 1 && <> × {quantity}</>}
            </p>
            <ol className="summary-schedule">
              {quote.schedule.map((day) => (
                <li key={day.date}>
                  <span>{formatDate(day.date)}</span>
                  <span>{day.item}</span>
                </li>
              ))}
            </ol>
            <p className="summary-total"><span>Total</span><strong>{rupees(quote.total)}</strong></p>
          </>
        ) : (
          <p className="app-muted">Pick a plan and a valid start date to see your schedule.</p>
        )}

        {company && (
          <div className="pay-options" role="radiogroup" aria-label="Payment method">
            <label className={payWith === 'company' ? 'pay-option is-active' : 'pay-option'}>
              <input type="radio" name="pay" checked={payWith === 'company'} onChange={() => setPayWith('company')} />
              <Building2 size={18} aria-hidden="true" />
              <span>
                Charge to {company.name}
                {company.personalLeft != null && <small>{rupees(company.personalLeft)} left in your monthly limit</small>}
              </span>
            </label>
            <label className={payWith === 'online' ? 'pay-option is-active' : 'pay-option'}>
              <input type="radio" name="pay" checked={payWith === 'online'} onChange={() => setPayWith('online')} />
              <CreditCard size={18} aria-hidden="true" />
              <span>Pay myself (UPI, card, netbanking)</span>
            </label>
          </div>
        )}

        {error && <p className="app-alert app-alert-error" role="alert">{error}</p>}

        <button className="button order-submit" type="submit" disabled={busy || !check.ok || !quote}>
          {busy
            ? 'Please wait…'
            : !point
              ? 'Set your delivery location'
              : !check.ok
                ? 'Not available for delivery'
                : quote
                  ? payWith === 'company'
                    ? `Place order · ${rupees(quote.total)}`
                    : `Pay ${rupees(quote.total)}`
                  : 'Choose a start date'}
        </button>
        <p className="app-hint">Secure payments by Razorpay. Need help? WhatsApp us anytime.</p>
      </aside>
    </form>
  )
}
