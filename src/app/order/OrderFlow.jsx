'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Candy,
  Check,
  CreditCard,
  CupSoda,
  DoorOpen,
  Leaf,
  Lock,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Soup,
  Sparkles,
  TriangleAlert,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import AddressPicker from '../../components/AddressPicker.jsx'
import CutoffCountdown from '../../components/CutoffCountdown.jsx'
import { mealPhrase, useNextOrderable } from '../../components/useNextOrderable.js'
import LoginForm from '../login/LoginForm.jsx'
import { ALLERGENS_VERIFIED, MENUS, MENU_ORDER, bowlAllergens, conflicts, dishFor, quoteOrder } from '../../lib/catalog.js'
import { addDays, canOrderFor, formatDate, friendlyDate, isOpenDay, todayIST, weekday } from '../../lib/dates.js'
import { slotOptions } from '../../lib/slots.js'
import {
  ALLERGENS,
  DEFAULT_HANDOFF,
  FREE_DELIVERY_KM,
  FREE_DELIVERY_MIN_MEALS,
  FREE_DELIVERY_ORDER_VALUE,
  HANDOFFS,
  MAX_DELIVERY_KM,
  MEALS,
  MEAL_ORDER,
  PREFERENCES,
  PRICES_INCLUDE_GST,
  SUNDAY_CLOSED,
  slotLabel,
} from '../../lib/rules.js'
import { normalisePhone } from '../../lib/validate.js'
import { bowls } from '../../siteData.js'
import { bowlImages } from '../../images.js'
import { dishImage, menuImages } from '../../dishImages.js'
import { checkLocation, createOrder, getCheckoutProfile, getSlotLoad, joinWaitlist } from './actions.js'
import { confirmPayment } from '../../lib/actions/payment.js'
import { openRazorpay } from '../../lib/razorpayCheckout.js'

const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`
const DRAFT_KEY = 'gd-order-draft-v1'
const STEPS = [
  { id: 'location', label: 'Location' },
  { id: 'meal', label: 'Meal' },
  { id: 'plan', label: 'Plan' },
  { id: 'schedule', label: 'When' },
  { id: 'addons', label: 'Add-ons' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Pay' },
]
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ALL_WEEKDAYS = SUNDAY_CLOSED ? [1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6]
const EXTRA_ICON = { food: Soup, drink: CupSoda, sweet: Candy }

function readDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')
    if (!draft || Date.now() - draft.savedAt > 2 * 864e5) return null
    return draft
  } catch {
    return null
  }
}
function writeDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // Private mode or storage blocked: the order still works, it just isn't remembered.
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

const emptyDetails = (saved) => ({
  name: saved?.name ?? '',
  phone: saved?.phone ?? '',
  addressLine: saved?.addressLine ?? '',
  landmark: saved?.landmark ?? '',
  deliveryNote: saved?.deliveryNote ?? '',
  deliveryContact: saved?.deliveryContact ?? '',
  allergies: saved?.allergies ?? [],
  allergyOther: saved?.allergyOther ?? '',
  preferences: saved?.preferences ?? [],
  handoff: saved?.handoff ?? DEFAULT_HANDOFF,
  isOffice: saved?.isOffice ?? false,
  receptionOk: saved?.receptionOk ?? true,
})

function detailsProblem(d) {
  if (d.name.trim().length < 2) return 'Please enter your name.'
  if (!normalisePhone(d.phone)) return 'Please enter a valid 10-digit mobile number.'
  if (d.addressLine.trim().length < 5) return 'Please enter your full address: flat/house, building, street.'
  if (d.deliveryContact && !normalisePhone(d.deliveryContact)) return 'The delivery contact must be a 10-digit mobile number.'
  if (d.isOffice && !d.receptionOk && (!d.handoff.startsWith('call_') || !normalisePhone(d.deliveryContact))) {
    return 'Your building doesn’t accept food at reception, so please choose “Call me first” and add a delivery contact.'
  }
  return null
}

export default function OrderFlow({ kitchen, radiusKm, closed, extrasCatalog, saved, initial }) {
  const router = useRouter()
  const next = useNextOrderable(closed)
  const savedLocationOk = Boolean(saved?.point && saved.roadKm != null && saved.roadKm <= MAX_DELIVERY_KM)

  // ── Order state ────────────────────────────────────────────
  const [step, setStep] = useState(savedLocationOk ? 'meal' : 'location')
  const [point, setPoint] = useState(saved?.point ?? null)
  const [loc, setLoc] = useState(
    savedLocationOk ? { status: 'ok', km: saved.roadKm, far: saved.roadKm > FREE_DELIVERY_KM } : { status: 'idle' },
  )
  const [addressHint, setAddressHint] = useState('')
  const [menu, setMenu] = useState(initial.menu ?? null)
  const [bowlSlug, setBowlSlug] = useState(initial.bowlSlug ?? '')
  const [planId, setPlanId] = useState(initial.planId ?? null)
  const [quantity, setQuantity] = useState(initial.quantity ?? 1)
  // Meal follows the live cutoff (lunch → dinner → tomorrow) unless a reorder link set it.
  const [meal, setMeal] = useState(initial.meal ?? null)
  const [startDate, setStartDate] = useState(initial.startDate ?? null)
  const [weekdays, setWeekdays] = useState(initial.weekdays?.length ? initial.weekdays : ALL_WEEKDAYS)
  const [slot, setSlot] = useState(initial.slot ?? saved?.defaultSlot ?? null)
  const [extras, setExtras] = useState({})
  const [details, setDetails] = useState(() => emptyDetails(saved))
  const [signedIn, setSignedIn] = useState(Boolean(saved))
  const [company, setCompany] = useState(saved?.company ?? null)
  const [payWith, setPayWith] = useState(saved?.company ? 'company' : 'online')
  const [load, setLoad] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const restored = useRef(false)
  const topRef = useRef(null)

  // Restore an unfinished order (e.g. after signing in by email link), unless a link chose for us.
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    if (initial.fromLink) return
    const draft = readDraft()
    if (!draft) return
    /* eslint-disable react-hooks/set-state-in-effect */
    if (draft.point && !savedLocationOk) setPoint(draft.point)
    if (draft.loc?.status === 'ok' && !savedLocationOk) setLoc(draft.loc)
    if (draft.menu) setMenu(draft.menu)
    if (draft.bowlSlug) setBowlSlug(draft.bowlSlug)
    if (draft.planId) setPlanId(draft.planId)
    if (draft.quantity) setQuantity(draft.quantity)
    if (draft.meal) setMeal(draft.meal)
    if (draft.startDate && draft.startDate >= todayIST()) setStartDate(draft.startDate)
    if (draft.weekdays?.length) setWeekdays(draft.weekdays)
    if (draft.slot) setSlot(draft.slot)
    if (draft.extras) setExtras(draft.extras)
    if (draft.details) setDetails((d) => ({ ...d, ...Object.fromEntries(Object.entries(draft.details).filter(([, v]) => v !== '' && v != null)) }))
    if (draft.step && STEPS.some((s) => s.id === draft.step)) setStep(draft.step === 'review' ? 'addons' : draft.step)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initial.fromLink, savedLocationOk])

  useEffect(() => {
    if (!restored.current) return
    writeDraft({ step, point, loc, menu, bowlSlug, planId, quantity, meal, startDate, weekdays, slot, extras, details })
  }, [step, point, loc, menu, bowlSlug, planId, quantity, meal, startDate, weekdays, slot, extras, details])

  // Default meal and date follow the live cutoff: lunch → tonight's dinner → tomorrow's lunch.
  useEffect(() => {
    if (!next) return
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!meal) setMeal(next.meal)
    if (!startDate) setStartDate(next.date)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [next, meal, startDate])

  // ── Derived values ─────────────────────────────────────────
  const plan = menu && planId ? MENUS[menu].plans.find((p) => p.id === planId) : null
  const menuExtras = useMemo(() => extrasCatalog.filter((x) => !menu || x.menus.includes(menu)), [extrasCatalog, menu])
  const extrasList = useMemo(() => Object.entries(extras).filter(([, qty]) => qty > 0).map(([id, qty]) => ({ id, qty })), [extras])
  const quote = useMemo(
    () =>
      menu && planId && meal && startDate
        ? quoteOrder({
            menu,
            planId,
            quantity,
            startDate,
            weekdays,
            meal,
            bowlSlug,
            allergies: details.allergies,
            closed,
            roadKm: loc.km ?? null,
            extras: extrasList,
            extrasCatalog: menuExtras,
          })
        : null,
    [menu, planId, quantity, startDate, weekdays, meal, bowlSlug, details.allergies, closed, loc.km, extrasList, menuExtras],
  )
  const firstDate = quote?.schedule[0]?.date ?? startDate
  const firstDish = menu && firstDate ? dishFor(menu, firstDate, bowlSlug) : null
  const heroImage = menu ? (firstDish ? dishImage(menu, firstDish) : menuImages[menu]) : menuImages.north_indian
  const slots = useMemo(
    () => (meal && firstDate && next ? slotOptions({ meal, date: firstDate, roadKm: loc.km ?? null, load, now: next.now }) : []),
    [meal, firstDate, next, loc.km, load],
  )
  const slotOk = slots.some((s) => s.id === slot && s.available)

  // Slot fill for the first delivery date.
  useEffect(() => {
    if (!meal || !firstDate) return
    let live = true
    getSlotLoad({ date: firstDate, meal }).then((result) => live && setLoad(result))
    return () => {
      live = false
    }
  }, [meal, firstDate])

  // Keep the chosen slot valid when the date, meal or distance changes.
  useEffect(() => {
    if (!slots.length) return
    if (!slots.some((s) => s.id === slot && s.available)) {
      const first = slots.find((s) => s.available)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (first && first.id !== slot) setSlot(first.id)
    }
  }, [slots, slot])

  // ── Location ───────────────────────────────────────────────
  const checkSeq = useRef(0)
  async function onPoint(nextPoint) {
    setPoint(nextPoint)
    setLoc({ status: 'checking' })
    const seq = ++checkSeq.current
    const result = await checkLocation(nextPoint)
    if (seq !== checkSeq.current) return
    if (result.error) setLoc({ status: 'error', message: result.error })
    else setLoc({ status: result.ok ? 'ok' : 'out', km: result.km, fee: result.fee, far: result.far, method: result.method })
  }

  // ── Step navigation ────────────────────────────────────────
  const detailsDone = signedIn && !detailsProblem(details)
  const stepIndex = STEPS.findIndex((s) => s.id === step)

  function problemFor(id) {
    if (id === 'location') {
      if (loc.status === 'checking') return 'Checking your location…'
      if (loc.status !== 'ok') return 'Drop a pin inside our delivery area to continue.'
    }
    if (id === 'meal') {
      if (!menu) return 'Pick Everyday Dabba or a Protein Bowl.'
      if (bowlSlug && conflicts(bowlAllergens(bowlSlug), details.allergies).length) return 'That bowl isn’t safe for your allergies. Pick another one.'
    }
    if (id === 'plan' && !plan) return 'Pick a single meal or a plan.'
    if (id === 'schedule') {
      if (!quote) return 'Pick a date.'
      if (quote.problem) return quote.problem
      if (!canOrderFor(firstDate, meal, next?.now ?? new Date(), closed)) return `Orders for that ${MEALS[meal].label.toLowerCase()} have closed. Pick a later date.`
      if (load?.soldOut && firstDate === todayIST()) return `Sold out for today’s ${MEALS[meal].label.toLowerCase()}. Order for the next meal or tomorrow.`
      if (!slotOk) return 'Pick a delivery slot.'
    }
    if (id === 'details') {
      if (!signedIn) return 'Sign in with your email to continue.'
      return detailsProblem(details)
    }
    return null
  }

  function go(id) {
    setError('')
    setStep(id)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function continueFrom(current) {
    const problem = problemFor(current)
    if (problem) return setError(problem)
    const order = STEPS.map((s) => s.id)
    let target = order[order.indexOf(current) + 1]
    if (target === 'details' && detailsDone) target = 'review'
    go(target)
  }

  // Jump back only to steps already reachable.
  function canVisit(id) {
    const order = STEPS.map((s) => s.id)
    return order.slice(0, order.indexOf(id)).every((s) => s === 'details' ? detailsDone || id === 'details' : !problemFor(s))
  }

  async function afterSignIn() {
    setSignedIn(true)
    const profile = await getCheckoutProfile()
    if (!profile) return
    setCompany(profile.company)
    if (profile.company) setPayWith('company')
    setDetails((d) => {
      const merged = { ...d }
      for (const [key, value] of Object.entries(profile)) {
        if (!(key in merged)) continue
        const empty = merged[key] === '' || merged[key] == null || (Array.isArray(merged[key]) && !merged[key].length)
        if (empty && value !== '' && value != null) merged[key] = value
      }
      return merged
    })
  }

  // ── Pay ────────────────────────────────────────────────────
  async function pay() {
    for (const id of ['location', 'meal', 'plan', 'schedule', 'details']) {
      const problem = problemFor(id)
      if (problem) {
        setError(problem)
        return go(id)
      }
    }
    setBusy(true)
    setError('')
    const result = await createOrder({
      menu,
      planId,
      bowlSlug,
      quantity,
      meal,
      slot,
      startDate,
      weekdays,
      extras: extrasList,
      lat: point.lat,
      lng: point.lng,
      ...details,
      payWith,
    })
    if (result.error) {
      setBusy(false)
      setError(result.error)
      if (result.needsLogin) {
        setSignedIn(false)
        go('details')
      }
      return
    }
    if (result.done) {
      clearDraft()
      router.push(`/orders/${result.orderId}?placed=1`)
      return
    }
    try {
      await openRazorpay(result.checkout, {
        onSuccess: async (response) => {
          const confirmed = await confirmPayment(response)
          clearDraft()
          if (confirmed.error) setError(confirmed.error)
          router.push(`/orders/${result.orderId}?placed=1`)
        },
        onDismiss: () => {
          setBusy(false)
          setError('Payment was cancelled, so your order isn’t placed yet. Your basket is saved: tap Pay to try again.')
        },
        onFailure: (message) => setError(`${message} You can try again, or pick another UPI app or card.`),
      })
    } catch (loadError) {
      setBusy(false)
      setError(loadError.message)
    }
  }

  // ── Render ─────────────────────────────────────────────────
  const mealWord = meal ? MEALS[meal].label.toLowerCase() : 'meal'
  const unit = menu ? MENUS[menu].unit : 'box'
  const ctaLabel =
    step === 'review'
      ? busy
        ? 'Opening payment…'
        : payWith === 'company'
          ? `Place order · ${rupees(quote?.total)}`
          : `Pay ${rupees(quote?.total)}`
      : step === 'addons' && !extrasList.length
        ? 'No add-ons, continue'
        : 'Continue'

  return (
    <div className="of" ref={topRef}>
      <header className="of-head">
        <div>
          <p className="eyebrow">Order online</p>
          <h1 className="app-title">Build your dibba</h1>
        </div>
        <CutoffCountdown closed={closed} />
      </header>

      <nav className="of-progress" aria-label="Order steps">
        {STEPS.map((s, i) => {
          const done = i < stepIndex
          const reachable = done || canVisit(s.id)
          return (
            <button
              key={s.id}
              type="button"
              className={`${s.id === step ? 'is-current' : ''} ${done ? 'is-done' : ''}`}
              aria-current={s.id === step ? 'step' : undefined}
              disabled={!reachable || busy}
              onClick={() => go(s.id)}
            >
              <span>{done ? <Check size={12} aria-hidden="true" /> : i + 1}</span>
              {s.label}
            </button>
          )
        })}
      </nav>

      <div className="of-layout">
        <div className="of-main">
          {step !== 'location' && loc.status === 'ok' && (
            <button type="button" className="of-locbar" onClick={() => go('location')}>
              <MapPin size={16} aria-hidden="true" />
              <span>
                {details.addressLine || addressHint || 'Your pinned location'} · {loc.km} km
                {' · '}
                {loc.far ? `${rupees(loc.fee)} delivery` : 'Free delivery'}
              </span>
              <b>Change</b>
            </button>
          )}

          {/* 1 · Location */}
          {step === 'location' && (
            <section className="app-card of-step">
              <h2 className="of-title">Where should we bring your dibba?</h2>
              <p className="app-muted">
                Drop a pin or search your address. We deliver within {MAX_DELIVERY_KM} km of our kitchen at Doon IT Park.
                Free delivery up to {FREE_DELIVERY_KM} km.
              </p>
              <AddressPicker
                kitchen={kitchen}
                radiusKm={radiusKm}
                point={point}
                onPointChange={onPoint}
                onAddressSuggestion={(label) => {
                  setAddressHint(label)
                  setDetails((d) => (d.addressLine ? d : { ...d, addressLine: label }))
                }}
                hideCheck
              />
              <LocationVerdict loc={loc} />
              {loc.status === 'out' && <Waitlist point={point} address={addressHint} defaults={details} />}
            </section>
          )}

          {/* 2 · Choose a meal */}
          {step === 'meal' && (
            <section className="app-card of-step">
              <h2 className="of-title">What’s for {next ? mealPhrase(next) : 'lunch'}?</h2>
              <div className="of-menu-cards">
                {MENU_ORDER.map((id) => {
                  const m = MENUS[id]
                  const dish = next ? dishFor(id, next.date) : null
                  const from = Math.min(...m.plans.map((p) => p.price))
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`of-menu-card ${menu === id ? 'is-active' : ''} ${id === 'protein_bowl' ? 'is-bowls' : ''}`}
                      aria-pressed={menu === id}
                      onClick={() => {
                        if (menu !== id) {
                          setMenu(id)
                          setPlanId(null)
                          setBowlSlug('')
                          setExtras({})
                        }
                      }}
                    >
                      <span className="of-menu-photo">
                        <Image src={dish ? dishImage(id, dish) : menuImages[id]} alt="" fill sizes="(max-width: 700px) 100vw, 360px" placeholder="blur" />
                        {menu === id && <span className="of-check"><Check size={18} aria-hidden="true" /></span>}
                      </span>
                      <span className="of-menu-body">
                        <strong>{m.name}</strong>
                        <small>{m.blurb}</small>
                        {dish && (
                          <span className="of-today">
                            {next.date === todayIST(next.now) ? 'Today' : formatDate(next.date, { weekday: 'long' })}: <b>{dish.name}</b>
                          </span>
                        )}
                        <span className="of-from">from {rupees(from)}/{m.unit}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {menu === 'north_indian' && <p className="app-hint">Seasonal sabzi may change based on freshness.</p>}

              {menu === 'protein_bowl' && (
                <>
                  <h3 className="of-subtitle">Pick your bowl</h3>
                  <div className="of-bowl-grid">
                    <BowlChoice
                      active={!bowlSlug}
                      onClick={() => setBowlSlug('')}
                      image={next ? dishImage('protein_bowl', dishFor('protein_bowl', next.date)) : menuImages.protein_bowl}
                      name="Daily rotation"
                      note="A different bowl each day"
                    />
                    {bowls.map((b) => {
                      const bad = conflicts(bowlAllergens(b.slug), details.allergies)
                      return (
                        <BowlChoice
                          key={b.slug}
                          active={bowlSlug === b.slug}
                          disabled={bad.length > 0}
                          onClick={() => setBowlSlug(b.slug)}
                          image={bowlImages[b.slug]}
                          name={b.name}
                          note={`${b.protein}g protein`}
                          warning={bad.length ? `Contains ${bad.map((a) => ALLERGENS.find((x) => x.id === a)?.label.toLowerCase()).join(', ')}` : ''}
                        />
                      )
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {/* 3 · Single meal or plan */}
          {step === 'plan' && menu && (
            <section className="app-card of-step">
              <h2 className="of-title">One meal, or a plan?</h2>
              <p className="app-muted">The more you plan, the less you pay. Every plan is prepaid meal credits you can skip or pause.</p>
              <div className="of-plan-grid">
                {MENUS[menu].plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`of-plan ${planId === p.id ? 'is-active' : ''}`}
                    aria-pressed={planId === p.id}
                    onClick={() => setPlanId(p.id)}
                  >
                    {p.tag && <em className={p.tag === 'Best value' ? 'is-best' : ''}>{p.tag}</em>}
                    <strong>{p.boxes === 1 ? 'Single meal' : p.name.replace(' Plan', '')}</strong>
                    <span className="of-plan-price">{rupees(p.price)}<small>/{MENUS[menu].unit}</small></span>
                    <span className="of-plan-meta">{p.boxes} {p.boxes === 1 ? MENUS[menu].unit : MENUS[menu].units} · {rupees(p.total)}</span>
                    {p.savings > 0 ? <span className="of-save">You save {rupees(p.savings)}</span> : <span className="of-save is-none">Try us out</span>}
                  </button>
                ))}
              </div>
              {plan?.boxes === 1 && (() => {
                const three = MENUS[menu].plans.find((p) => p.boxes === 3)
                return three ? (
                  <button type="button" className="of-nudge" onClick={() => setPlanId(three.id)}>
                    <Sparkles size={18} aria-hidden="true" />
                    <span>3 days at {rupees(three.price)}/{MENUS[menu].unit}, save {rupees(three.savings)}.</span>
                    <b>Switch</b>
                  </button>
                ) : null
              })()}
              {loc.far && FREE_DELIVERY_MIN_MEALS != null && plan && plan.boxes < FREE_DELIVERY_MIN_MEALS && (
                <p className="app-hint"><Truck size={14} aria-hidden="true" /> Weekly plans and longer get free delivery to your area.</p>
              )}
              <div className="of-qty">
                <span>{MENUS[menu].units[0].toUpperCase() + MENUS[menu].units.slice(1)} per delivery</span>
                <Stepper value={quantity} onChange={setQuantity} min={1} max={20} />
              </div>
            </section>
          )}

          {/* 4 · Schedule */}
          {step === 'schedule' && plan && (
            <section className="app-card of-step">
              <h2 className="of-title">When should we deliver?</h2>
              <div className="app-segment of-meal-toggle" role="radiogroup" aria-label="Meal">
                {MEAL_ORDER.map((id) => (
                  <button key={id} type="button" role="radio" aria-checked={meal === id} className={meal === id ? 'is-active' : ''} onClick={() => setMeal(id)}>
                    {MEALS[id].label} <small>{MEALS[id].window}</small>
                  </button>
                ))}
              </div>

              <h3 className="of-subtitle">{plan.boxes === 1 ? 'Day' : 'Start from'}</h3>
              <DateChips meal={meal} value={startDate} onChange={setStartDate} closed={closed} now={next?.now} />

              {plan.boxes > 1 && (
                <>
                  <h3 className="of-subtitle">Deliver on</h3>
                  <div className="of-days" role="group" aria-label="Delivery days">
                    {ALL_WEEKDAYS.map((d) => {
                      const on = weekdays.includes(d)
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          className={on ? 'is-active' : ''}
                          onClick={() => setWeekdays((w) => (on ? (w.length > 1 ? w.filter((x) => x !== d) : w) : [...w, d].sort()))}
                        >
                          {DAY_SHORT[d]}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              <h3 className="of-subtitle">Delivery slot</h3>
              {load?.soldOut && firstDate === todayIST() ? (
                <p className="app-alert app-alert-error">Sold out for today’s {mealWord}. Order for the next meal or tomorrow.</p>
              ) : (
                <div className="of-slots" role="radiogroup" aria-label="Delivery slot">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={slot === s.id}
                      disabled={!s.available}
                      className={slot === s.id ? 'is-active' : ''}
                      onClick={() => setSlot(s.id)}
                    >
                      {s.label}
                      {s.full && <small>Full</small>}
                    </button>
                  ))}
                </div>
              )}
              {slots[0]?.late && <p className="app-hint">Ordered now? Arrives {slots.map((s) => s.label).join(' or ')}.</p>}
              {loc.far && <p className="app-hint">Your area gets the later slots so our riders can plan the route.</p>}

              {quote && !quote.problem && (
                <div className="of-schedule">
                  <p>
                    <CalendarDays size={16} aria-hidden="true" />
                    {quote.schedule.length === 1 ? (
                      <span><b>{formatDate(quote.schedule[0].date, { weekday: 'long', day: 'numeric', month: 'short' })}</b> · {slotLabel(meal, slot)}</span>
                    ) : (
                      <span><b>{quote.schedule.length} {MENUS[menu].units}</b> · {formatDate(quote.schedule[0].date)} → {formatDate(quote.endDate)} · {slotLabel(meal, slot)}</span>
                    )}
                  </p>
                  {quote.schedule.length > 1 && (
                    <ol>
                      {quote.schedule.slice(0, 6).map((s) => <li key={s.date}><span>{formatDate(s.date)}</span>{s.item.replace('Everyday Dabba: ', '')}</li>)}
                      {quote.schedule.length > 6 && <li className="app-muted">+ {quote.schedule.length - 6} more</li>}
                    </ol>
                  )}
                  {quote.skippedForAllergy.length > 0 && (
                    <p className="app-hint">Skipped for your allergies (credit kept): {quote.skippedForAllergy.map((d) => formatDate(d)).join(', ')}.</p>
                  )}
                </div>
              )}
              {quote?.problem && <p className="app-alert app-alert-error"><TriangleAlert size={16} aria-hidden="true" /> {quote.problem}</p>}
            </section>
          )}

          {/* 5 · Add-ons */}
          {step === 'addons' && (
            <section className="app-card of-step">
              <h2 className="of-title">Anything with that?</h2>
              <p className="app-muted">Optional. Nothing is added unless you tap it. Add-ons come with your first {unit}.</p>
              <ExtrasRow title="From our kitchen" items={menuExtras.filter((x) => x.kind === 'food')} extras={extras} setExtras={setExtras} />
              <ExtrasRow title="Thanda chahiye?" note="Something cold, packed chilled away from your hot dibba." items={menuExtras.filter((x) => x.kind === 'drink')} extras={extras} setExtras={setExtras} />
              <ExtrasRow title="Kuch meetha ho jaaye?" note="Something sweet." items={menuExtras.filter((x) => x.kind === 'sweet')} extras={extras} setExtras={setExtras} />
              {!menuExtras.length && <p className="app-muted">No add-ons available right now.</p>}
              {quote && FREE_DELIVERY_ORDER_VALUE != null && quote.perDeliveryFee > 0 && !quote.waivedByPlan && (
                <FreeDeliveryBar value={quote.mealsTotal + quote.extrasTotal} target={FREE_DELIVERY_ORDER_VALUE} />
              )}
            </section>
          )}

          {/* 6 + 7 · Login, profile and preferences */}
          {step === 'details' && (
            <section className="app-card of-step">
              {!signedIn ? (
                <>
                  <h2 className="of-title">Sign in to save your order</h2>
                  <p className="app-muted">No password. We’ll email you a code, and the same code creates your account. Your basket stays as it is.</p>
                  <LoginForm next="/order" onSignedIn={afterSignIn} />
                </>
              ) : (
                <DetailsForm details={details} setDetails={setDetails} />
              )}
            </section>
          )}

          {/* 8 · Review and pay */}
          {step === 'review' && quote && (
            <section className="app-card of-step of-review">
              <div className="of-review-hero">
                <Image src={heroImage} alt={firstDish?.name ?? ''} fill sizes="(max-width: 900px) 100vw, 640px" placeholder="blur" />
                <span>
                  <small>{MENUS[menu].name}</small>
                  <strong>{quote.bowl ? quote.bowl.name : quote.plan.boxes === 1 ? firstDish?.name : `${quote.plan.name.replace(' Plan', '')} plan`}</strong>
                </span>
              </div>
              <h2 className="of-title">Review and pay</h2>

              <ul className="of-lines">
                <li>
                  <span>{MENUS[menu].name} · {quote.plan.boxes === 1 ? 'single meal' : quote.plan.name}{quantity > 1 ? ` × ${quantity}` : ''}<small>{quote.plan.boxes} × {rupees(quote.plan.price)}{quantity > 1 ? ` × ${quantity}` : ''}</small></span>
                  <b>{rupees(quote.mealsTotal)}</b>
                </li>
                {quote.extras.map((x) => (
                  <li key={x.id}><span>{x.name}{x.qty > 1 ? ` × ${x.qty}` : ''}</span><b>{rupees(x.total)}</b></li>
                ))}
                <li>
                  <span>Delivery<small>{loc.km} km{quote.perDeliveryFee > 0 ? (quote.feeWaived ? ' · free on this plan' : ` · ${rupees(quote.perDeliveryFee)} × ${quote.schedule.length}`) : ' · free up to 3 km'}</small></span>
                  <b>{quote.deliveryFee ? rupees(quote.deliveryFee) : 'Free'}</b>
                </li>
                {quote.savings > 0 && <li className="of-line-save"><span>You save vs single meals</span><b>{rupees(quote.savings)}</b></li>}
                <li className="of-line-total"><span>Total{PRICES_INCLUDE_GST ? <small>Inclusive of GST</small> : <small>No hidden or extra charges</small>}</span><b>{rupees(quote.total)}</b></li>
              </ul>

              <dl className="of-facts">
                <div><dt>Credits</dt><dd>{quote.schedule.length} {quote.schedule.length === 1 ? 'meal' : 'meals'}{quantity > 1 ? ` × ${quantity}` : ''} · last box {formatDate(quote.endDate)}{quote.schedule.length > 1 && <> · use by {formatDate(quote.validUntil)}</>}</dd></div>
                <div><dt>When</dt><dd>{MEALS[meal].label}, {friendlyDate(firstDate, next?.now)} · {slotLabel(meal, slot)}</dd></div>
                <div><dt>Where</dt><dd>{details.addressLine}{details.landmark && `, near ${details.landmark}`}</dd></div>
                <div><dt>If we can’t reach you</dt><dd>{HANDOFFS.find((h) => h.id === details.handoff)?.label} <button type="button" className="app-linkbutton" onClick={() => go('details')}>Change</button></dd></div>
                {details.allergies.length > 0 && <div><dt>Allergies</dt><dd className="of-allergy">{details.allergies.map((a) => ALLERGENS.find((x) => x.id === a)?.label).join(', ')}</dd></div>}
              </dl>

              <ForgotSomething items={menuExtras} extras={extras} setExtras={setExtras} />

              {company && (
                <div className="pay-options" role="radiogroup" aria-label="Payment method">
                  <label className={payWith === 'company' ? 'pay-option is-active' : 'pay-option'}>
                    <input type="radio" name="pay" checked={payWith === 'company'} onChange={() => setPayWith('company')} />
                    <Building2 size={18} aria-hidden="true" />
                    <span>Charge to {company.name}</span>
                  </label>
                  <label className={payWith === 'online' ? 'pay-option is-active' : 'pay-option'}>
                    <input type="radio" name="pay" checked={payWith === 'online'} onChange={() => setPayWith('online')} />
                    <CreditCard size={18} aria-hidden="true" />
                    <span>Pay myself (UPI, card, netbanking)</span>
                  </label>
                </div>
              )}

              <ul className="of-trust">
                <li><Lock size={16} aria-hidden="true" /> Secure payment by Razorpay. UPI, cards, netbanking.</li>
                <li><CalendarDays size={16} aria-hidden="true" /> Skip or pause by 9 pm the day before. Credits are kept.</li>
                <li><Leaf size={16} aria-hidden="true" /> Cooked fresh the same day. 100% vegetarian.</li>
              </ul>
            </section>
          )}

          {error && <p className="app-alert app-alert-error of-error" role="alert">{error}</p>}

          <div className="of-nav">
            {stepIndex > 0 && (
              <button type="button" className="button button-outline" onClick={() => go(STEPS[stepIndex - 1].id)} disabled={busy}>
                <ArrowLeft size={18} aria-hidden="true" /> Back
              </button>
            )}
          </div>

          <div className="of-bar">
            <div className="of-bar-total">
              {quote ? (
                <>
                  <strong>{rupees(quote.total)}</strong>
                  <small>{quote.schedule.length > 1 ? `${quote.schedule.length} meals` : '1 meal'}{quote.deliveryFee ? ' + delivery' : ' · free delivery'}</small>
                </>
              ) : (
                <small>{STEPS[stepIndex].label}: step {stepIndex + 1} of {STEPS.length}</small>
              )}
            </div>
            {!(step === 'details' && !signedIn) && (
              <button
                type="button"
                className="button of-cta"
                disabled={busy || (step === 'location' && loc.status !== 'ok')}
                onClick={() => (step === 'review' ? pay() : continueFrom(step))}
              >
                {step === 'review' && <Lock size={16} aria-hidden="true" />}
                {ctaLabel}
                {step !== 'review' && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>

        <aside className="of-summary app-card" aria-label="Your order">
          <div className="of-summary-photo">
            <Image src={heroImage} alt="" fill sizes="320px" placeholder="blur" />
          </div>
          <p className="of-summary-title">{menu ? MENUS[menu].name : 'Your dibba'}</p>
          {plan ? (
            <ul className="of-summary-list">
              <li><UtensilsCrossed size={14} aria-hidden="true" />{plan.boxes === 1 ? 'Single meal' : plan.name}{quantity > 1 ? ` × ${quantity}` : ''}</li>
              {quote?.bowl && <li><Soup size={14} aria-hidden="true" />{quote.bowl.name}</li>}
              {meal && firstDate && <li><CalendarDays size={14} aria-hidden="true" />{MEALS[meal].label}, {friendlyDate(firstDate, next?.now)}{slot && ` · ${slotLabel(meal, slot)}`}</li>}
              {extrasList.length > 0 && <li><Plus size={14} aria-hidden="true" />{quote?.extras.map((x) => x.name).join(', ')}</li>}
              {loc.status === 'ok' && <li><Truck size={14} aria-hidden="true" />{quote?.deliveryFee ? `${rupees(quote.deliveryFee)} delivery` : 'Free delivery'}</li>}
            </ul>
          ) : (
            <p className="app-muted">Pick a meal and plan to see your total.</p>
          )}
          {quote && <p className="of-summary-total"><span>Total</span><strong>{rupees(quote.total)}</strong></p>}
          {quote?.savings > 0 && <p className="of-save">You save {rupees(quote.savings)}</p>}
        </aside>
      </div>

    </div>
  )
}

// ── Pieces ───────────────────────────────────────────────────

function LocationVerdict({ loc }) {
  if (loc.status === 'idle') return null
  if (loc.status === 'checking') return <p className="app-alert" role="status">Checking the road distance from our kitchen…</p>
  if (loc.status === 'error') return <p className="app-alert app-alert-error" role="alert">{loc.message}</p>
  if (loc.status === 'out') {
    return (
      <p className="app-alert app-alert-error" role="status">
        Abhi hum yahan tak nahi pahunche 😔 This pin is {loc.km} km away by road and we deliver within {MAX_DELIVERY_KM} km. Leave your number and we’ll tell you the day we do.
      </p>
    )
  }
  return (
    <p className="app-alert app-alert-ok" role="status">
      <Check size={16} aria-hidden="true" /> We deliver here! {loc.km} km by road ·{' '}
      {loc.fee ? (
        <>₹{loc.fee} delivery per box{FREE_DELIVERY_MIN_MEALS != null && <>, free on Weekly plans and longer</>}</>
      ) : (
        <b>Free delivery</b>
      )}
      {loc.method === 'straight' && <small> (approximate)</small>}
    </p>
  )
}

function Waitlist({ point, address, defaults }) {
  const [name, setName] = useState(defaults.name)
  const [phone, setPhone] = useState(defaults.phone)
  const [state, setState] = useState({ busy: false, done: false, error: '' })
  if (state.done) return <p className="app-alert app-alert-ok">Thank you! We’ll WhatsApp you the day we start delivering to your area.</p>
  return (
    <div className="of-waitlist">
      <h3 className="of-subtitle">Join the waitlist</h3>
      <div className="app-grid-2">
        <label className="app-field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label className="app-field"><span>Mobile number</span><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="numeric" autoComplete="tel-national" /></label>
      </div>
      {state.error && <p className="app-alert app-alert-error">{state.error}</p>}
      <button
        type="button"
        className="button button-small"
        disabled={state.busy}
        onClick={async () => {
          setState({ busy: true, done: false, error: '' })
          const result = await joinWaitlist({ name, phone, lat: point?.lat, lng: point?.lng, address })
          setState({ busy: false, done: Boolean(result.ok), error: result.error ?? '' })
        }}
      >
        {state.busy ? 'Saving…' : 'Tell me when you deliver here'}
      </button>
    </div>
  )
}

function BowlChoice({ active, disabled, onClick, image, name, note, warning }) {
  return (
    <button type="button" className={`of-bowl ${active ? 'is-active' : ''} ${warning ? 'is-unsafe' : ''}`} aria-pressed={active} disabled={disabled} onClick={onClick}>
      <span className="of-bowl-photo">
        <Image src={image} alt="" fill sizes="(max-width: 700px) 45vw, 180px" placeholder="blur" />
        {active && <span className="of-check"><Check size={16} aria-hidden="true" /></span>}
      </span>
      <strong>{name}</strong>
      <small>{note}</small>
      {warning && <small className="of-warn"><TriangleAlert size={12} aria-hidden="true" /> {warning}</small>}
    </button>
  )
}

function Stepper({ value, onChange, min = 1, max = 10, label = '' }) {
  return (
    <div className="stepper">
      <button type="button" aria-label={`One fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={16} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={`One more ${label}`} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={16} /></button>
    </div>
  )
}

function DateChips({ meal, value, onChange, closed, now }) {
  if (!now) return <div className="of-dates" />
  const chips = []
  for (let i = 0, day = todayIST(now); chips.length < 8 && i < 21; i += 1, day = addDays(day, 1)) {
    if (!isOpenDay(day, closed)) continue
    chips.push({ day, ok: canOrderFor(day, meal, now, closed) })
  }
  const inChips = chips.some((c) => c.day === value)
  return (
    <div className="of-dates" role="radiogroup" aria-label="Date">
      {chips.map(({ day, ok }) => (
        <button key={day} type="button" role="radio" aria-checked={value === day} disabled={!ok} className={value === day ? 'is-active' : ''} onClick={() => onChange(day)}>
          <small>{friendlyDate(day, now) === 'today' ? 'Today' : friendlyDate(day, now) === 'tomorrow' ? 'Tomorrow' : DAY_SHORT[weekday(day)]}</small>
          <b>{formatDate(day, { day: 'numeric', month: 'short' })}</b>
          {!ok && <small>Closed</small>}
        </button>
      ))}
      <label className={`of-date-more ${value && !inChips ? 'is-active' : ''}`}>
        <small>Later</small>
        <input type="date" min={todayIST(now)} max={addDays(todayIST(now), 30)} value={value && !inChips ? value : ''} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Pick a later date" />
      </label>
    </div>
  )
}

function ExtraCard({ item, qty, setQty }) {
  const Icon = EXTRA_ICON[item.kind] ?? Soup
  return (
    <div className={`of-extra ${qty ? 'is-active' : ''}`}>
      <span className={`of-extra-icon kind-${item.kind}`}>
        {item.image_url ? <img src={item.image_url} alt="" /> : <Icon size={26} aria-hidden="true" />}
        {item.price < 50 && <em>Under ₹50</em>}
      </span>
      <strong>{item.name}</strong>
      <small>{item.note ?? ''}{item.mrp ? `${item.note ? ' · ' : ''}MRP ₹${item.mrp}` : ''}</small>
      <span className="of-extra-foot">
        <b>{rupees(item.price)}</b>
        {qty ? (
          <span className="of-extra-qty">
            <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => setQty(qty - 1)}><Minus size={14} /></button>
            <output>{qty}</output>
            <button type="button" aria-label={`Add one more ${item.name}`} onClick={() => setQty(Math.min(10, qty + 1))} disabled={item.stock != null && qty >= item.stock}><Plus size={14} /></button>
          </span>
        ) : (
          <button type="button" className="of-add" onClick={() => setQty(1)}>+ Add</button>
        )}
      </span>
    </div>
  )
}

function ExtrasRow({ title, note, items, extras, setExtras }) {
  if (!items.length) return null
  return (
    <div className="of-extras-row">
      <h3 className="of-subtitle">{title}</h3>
      {note && <p className="app-hint">{note}</p>}
      <div className="of-extras-scroll">
        {items.map((item) => (
          <ExtraCard key={item.id} item={item} qty={extras[item.id] ?? 0} setQty={(q) => setExtras((e) => ({ ...e, [item.id]: Math.max(0, q) }))} />
        ))}
      </div>
    </div>
  )
}

function ForgotSomething({ items, extras, setExtras }) {
  const picks = [...items].sort((a, b) => (a.kind === 'food') - (b.kind === 'food')).filter((x) => !extras[x.id]).slice(0, 4)
  if (!picks.length) return null
  return (
    <div className="of-forgot">
      <h3 className="of-subtitle">Forgot something?</h3>
      <div className="of-forgot-row">
        {picks.map((x) => {
          const Icon = EXTRA_ICON[x.kind] ?? Soup
          return (
            <button key={x.id} type="button" onClick={() => setExtras((e) => ({ ...e, [x.id]: 1 }))}>
              <Icon size={18} aria-hidden="true" />
              <span>{x.name}</span>
              <b>+ {rupees(x.price)}</b>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FreeDeliveryBar({ value, target }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div className="of-freebar">
      <p>{value >= target ? 'You’ve unlocked free delivery!' : `Add ${rupees(target - value)} more for free delivery`}</p>
      <span><i style={{ width: `${pct}%` }} /></span>
    </div>
  )
}

function DetailsForm({ details, setDetails }) {
  const set = (key) => (e) => setDetails((d) => ({ ...d, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const toggle = (key, id) => setDetails((d) => ({ ...d, [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id] }))
  const icons = { call_then_guard: Phone, call_then_door: Phone, door: DoorOpen, guard: ShieldCheck }

  return (
    <div className="of-details">
      <h2 className="of-title">Your details</h2>
      <p className="app-muted">Saved for next time, so your next order takes a few taps.</p>
      <div className="app-grid-2">
        <label className="app-field"><span>Name</span><input value={details.name} onChange={set('name')} autoComplete="name" required /></label>
        <label className="app-field"><span>Mobile number</span><input value={details.phone} onChange={set('phone')} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" required /></label>
        <label className="app-field app-span-2"><span>Full address</span><textarea rows={2} value={details.addressLine} onChange={set('addressLine')} placeholder="Flat / house no., building, street, area" required /></label>
        <label className="app-field"><span>Landmark (optional)</span><input value={details.landmark} onChange={set('landmark')} placeholder="Near…" /></label>
        <label className="app-field"><span>Note for our rider (optional)</span><input value={details.deliveryNote} onChange={set('deliveryNote')} placeholder="3rd floor, Tower B, ring twice" /></label>
      </div>

      <label className="of-check-line">
        <input type="checkbox" checked={details.isOffice} onChange={set('isOffice')} />
        <span>This is an office or tech-park address</span>
      </label>
      {details.isOffice && (
        <div className="of-inline-q">
          <span>Does your building accept food at reception?</span>
          <div className="app-segment">
            <button type="button" className={details.receptionOk ? 'is-active' : ''} onClick={() => setDetails((d) => ({ ...d, receptionOk: true }))}>Yes</button>
            <button type="button" className={!details.receptionOk ? 'is-active' : ''} onClick={() => setDetails((d) => ({ ...d, receptionOk: false, handoff: d.handoff.startsWith('call_') ? d.handoff : 'call_then_guard' }))}>No</button>
          </div>
        </div>
      )}

      <fieldset className="of-fieldset">
        <legend>If we can’t reach you, where should we leave your dibba?</legend>
        <p className="app-hint">Hum aapko call karenge, nahi uthaya toh guard bhaiya ke paas chhod denge. (We’ll call you, and if you don’t pick up, we’ll leave it with the guard.)</p>
        <div className="of-handoffs">
          {HANDOFFS.map((h) => {
            const Icon = icons[h.id]
            const blocked = details.isOffice && !details.receptionOk && !h.id.startsWith('call_')
            return (
              <label key={h.id} className={`of-handoff ${details.handoff === h.id ? 'is-active' : ''}`}>
                <input type="radio" name="handoff" checked={details.handoff === h.id} disabled={blocked} onChange={() => setDetails((d) => ({ ...d, handoff: h.id }))} />
                <Icon size={18} aria-hidden="true" />
                <span>{h.label}</span>
              </label>
            )
          })}
        </div>
        <label className="app-field">
          <span>Delivery contact (optional){details.isOffice && !details.receptionOk && ' · required'}</span>
          <input value={details.deliveryContact} onChange={set('deliveryContact')} type="tel" inputMode="numeric" placeholder="A colleague or family member who can collect" />
        </label>
        <p className="app-hint">Once left as per your choice, the meal counts as delivered.</p>
      </fieldset>

      <fieldset className="of-fieldset">
        <legend>Any food allergies?</legend>
        <p className="app-hint">Tell us once and we’ll flag every dish that isn’t safe for you.</p>
        <div className="of-chips">
          {ALLERGENS.map((a) => (
            <label key={a.id} className={`of-chip ${details.allergies.includes(a.id) ? 'is-active is-allergy' : ''}`}>
              <input type="checkbox" checked={details.allergies.includes(a.id)} onChange={() => toggle('allergies', a.id)} />
              {a.label}
            </label>
          ))}
        </div>
        <label className="app-field"><span>Other (optional)</span><input value={details.allergyOther} onChange={set('allergyOther')} placeholder="Anything else the kitchen should know" /></label>
        <p className="of-allergy-note">
          Our kitchen handles dairy, gluten and nuts. We take care to keep your meal safe, but we can’t guarantee zero traces.
          If your allergy is severe, please call us before ordering.
          {!ALLERGENS_VERIFIED && ' Dish allergen details are still being verified by our kitchen.'}
        </p>
      </fieldset>

      <fieldset className="of-fieldset">
        <legend>Preferences (optional)</legend>
        <div className="of-chips">
          {PREFERENCES.map((p) => (
            <label key={p.id} className={`of-chip ${details.preferences.includes(p.id) ? 'is-active' : ''}`}>
              <input type="checkbox" checked={details.preferences.includes(p.id)} onChange={() => toggle('preferences', p.id)} />
              {p.label}
            </label>
          ))}
        </div>
        <p className="app-hint">We print these on your kitchen ticket and try our best, but can’t always guarantee them.</p>
      </fieldset>
    </div>
  )
}
