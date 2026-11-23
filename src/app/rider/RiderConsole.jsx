'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CircleCheck, CupSoda, MapPin, Navigation, Phone, Radio, TriangleAlert, X } from 'lucide-react'
import { getBrowserClient } from '../../lib/supabase/browser.js'
import { RIDER_PING_MS } from '../../lib/config.js'
import { distanceKm } from '../../lib/geo.js'
import { HANDOFFS, PROOF_MAX_DISTANCE_M, allergenTicket, slotLabel } from '../../lib/rules.js'
import { DELIVERY_STATUS } from '../../lib/status.js'
import StatusPill from '../../components/StatusPill.jsx'
import { markDelivered, markMissed, startDelivery } from './actions.js'

// Shares the rider's GPS with customers while this page is open.
// Browsers pause GPS when the screen locks, so we ask to keep the screen awake.
function useLocationSharing(riderId) {
  const [sharing, setSharing] = useState(false)
  const [info, setInfo] = useState({ message: '', lastSent: null, accuracy: null })
  const watchId = useRef(null)
  const lastSent = useRef(0)
  const wakeLock = useRef(null)

  async function send(position) {
    const now = Date.now()
    if (now - lastSent.current < RIDER_PING_MS) return
    lastSent.current = now
    const { latitude, longitude, accuracy, heading } = position.coords
    const { error } = await getBrowserClient().from('rider_locations').upsert({
      rider_id: riderId,
      lat: latitude,
      lng: longitude,
      accuracy,
      heading: Number.isFinite(heading) ? heading : null,
      updated_at: new Date().toISOString(),
    })
    setInfo({
      message: error ? 'Could not send location. Check your internet.' : '',
      lastSent: error ? null : new Date(),
      accuracy: Math.round(accuracy),
    })
  }

  async function start() {
    if (watchId.current != null) return
    if (!navigator.geolocation) {
      setInfo((i) => ({ ...i, message: 'This phone/browser can’t share location.' }))
      return
    }
    lastSent.current = 0
    watchId.current = navigator.geolocation.watchPosition(
      send,
      (err) => setInfo((i) => ({ ...i, message: err.code === 1 ? 'Location permission denied. Allow it in browser settings.' : 'Waiting for GPS signal…' })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    try {
      wakeLock.current = await navigator.wakeLock?.request('screen')
    } catch {
      // Not supported. Rider should keep the screen on manually.
    }
    setSharing(true)
  }

  function stop() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    wakeLock.current?.release?.()
    wakeLock.current = null
    setSharing(false)
  }

  useEffect(() => () => stop(), [])

  return { sharing, info, start, stop }
}

// Shrinks a phone photo to ~1280 px JPEG so it uploads quickly on mobile data.
async function compress(file) {
  if (!file || !file.type.startsWith('image/')) return null
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72))
    return blob ? new File([blob], 'proof.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

function currentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    )
  })
}

// What the customer's saved choice means at the door.
const EXPECTED = { call_then_guard: 'guard', call_then_door: 'door', door: 'door', guard: 'guard' }

// Proof of delivery: where it was left, GPS, time and a photo of the box.
function DeliverPanel({ delivery, onDone }) {
  const o = delivery.order
  const [result, setResult] = useState('customer')
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const options = [
    ['customer', 'To customer'],
    ['door', 'At door'],
    ['guard', 'With guard'],
    ...(o.delivery_contact ? [['contact', 'To contact']] : []),
  ]

  async function submit() {
    setBusy(true)
    setError('')
    const here = await currentPosition()
    if (here) {
      const metres = Math.round(distanceKm(here, { lat: o.lat, lng: o.lng }) * 1000)
      if (metres > PROOF_MAX_DISTANCE_M && !window.confirm(`You are about ${metres} m from the customer’s pin. Mark delivered anyway?`)) {
        setBusy(false)
        return
      }
    }
    const form = new FormData()
    form.set('delivery_id', delivery.id)
    form.set('handoff', result)
    if (here) {
      form.set('lat', String(here.lat))
      form.set('lng', String(here.lng))
    }
    const small = await compress(photo)
    if (small) form.set('photo', small)
    const response = await markDelivered(form)
    setBusy(false)
    if (response.error) return setError(response.error)
    onDone()
  }

  return (
    <div className="deliver-panel">
      <div className="app-segment" role="radiogroup" aria-label="Where did you leave it?">
        {options.map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={result === id} className={result === id ? 'is-active' : ''} onClick={() => setResult(id)}>
            {label}
          </button>
        ))}
      </div>
      {result !== 'customer' && o.handoff && EXPECTED[o.handoff] !== result && (
        <p className="app-hint"><TriangleAlert size={14} aria-hidden="true" /> Customer asked: {HANDOFFS.find((h) => h.id === o.handoff)?.label}</p>
      )}
      <label className="photo-input">
        <Camera size={18} aria-hidden="true" />
        <span>{photo ? 'Photo added ✓' : 'Take a photo of the box'}</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </label>
      {error && <p className="app-alert app-alert-error">{error}</p>}
      <button type="button" className="button button-small" disabled={busy} onClick={submit}>
        <CircleCheck size={16} aria-hidden="true" /> {busy ? 'Saving…' : 'Mark delivered'}
      </button>
    </div>
  )
}

export default function RiderConsole({ riderId, deliveries }) {
  const router = useRouter()
  const { sharing, info, start, stop } = useLocationSharing(riderId)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const hasLive = deliveries.some((d) => d.status === 'out_for_delivery')

  // Keep sharing on while any drop is still out for delivery (e.g. after a page reload).
  useEffect(() => {
    if (hasLive && !sharing) start()
  }, [hasLive]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pickUp(id) {
    setBusyId(id)
    setError('')
    start()
    const result = await startDelivery(id)
    setBusyId(null)
    if (result.error) setError(result.error)
    router.refresh()
  }

  async function missed(id) {
    if (!window.confirm('Couldn’t deliver this box? The customer keeps the credit and gets a make-up box.')) return
    setBusyId(id)
    const result = await markMissed(id)
    setBusyId(null)
    if (result.error) setError(result.error)
    router.refresh()
  }

  return (
    <>
      <div className={sharing ? 'app-card share-bar is-on' : 'app-card share-bar'}>
        <Radio aria-hidden="true" />
        <div>
          <strong>{sharing ? 'Sharing live location' : 'Location sharing is off'}</strong>
          <p className="app-muted">
            {info.message ||
              (sharing
                ? info.lastSent
                  ? `Last sent ${info.lastSent.toLocaleTimeString('en-IN')} · ±${info.accuracy} m. Keep this page open.`
                  : 'Getting GPS…'
                : 'Starts automatically when you pick up a delivery.')}
          </p>
        </div>
        <button type="button" className={sharing ? 'button button-small button-outline' : 'button button-small'} onClick={sharing ? stop : start}>
          {sharing ? 'Stop' : 'Start'}
        </button>
      </div>

      {error && <p className="app-alert app-alert-error" role="alert">{error}</p>}
      {!deliveries.length && <div className="app-card app-empty"><p>No deliveries assigned to you today.</p></div>}

      <ul className="rider-list">
        {deliveries.map((d) => {
          const o = d.order
          const closed = ['delivered', 'missed'].includes(d.status)
          const chilled = (d.extras ?? []).filter((x) => x.kind === 'drink' || x.kind === 'sweet')
          return (
            <li key={d.id} className={`app-card rider-card${closed ? ' is-closed' : ''}`}>
              <div className="rider-card-head">
                <strong>#{o.order_number} · {d.item_name.replace('Everyday Dabba: ', '')}{d.quantity > 1 ? ` × ${d.quantity}` : ''}</strong>
                <StatusPill status={d.status} map={DELIVERY_STATUS} />
              </div>
              <p className="rider-slot">{slotLabel(d.meal, d.slot)}{d.kind === 'makeup' && ' · MAKE-UP'}</p>
              <p className="detail-line"><MapPin size={18} aria-hidden="true" /><span>{o.address_line}{o.address_landmark && <> · near {o.address_landmark}</>}</span></p>
              <p className="detail-line"><Phone size={18} aria-hidden="true" /><span>{o.customer_name} · {o.customer_phone}{o.delivery_contact && <> · contact {o.delivery_contact}</>}</span></p>
              {o.handoff && <p className="rider-handoff">If unreachable: {HANDOFFS.find((h) => h.id === o.handoff)?.label}</p>}
              {o.delivery_note && <p className="app-muted">Note: {o.delivery_note}</p>}
              {o.allergies?.length > 0 && <p className="ticket-allergy">{allergenTicket(o.allergies).join(' · ')}</p>}
              {chilled.length > 0 && (
                <p className="app-muted"><CupSoda size={14} aria-hidden="true" /> From the chiller: {chilled.map((x) => `${x.name}${x.qty > 1 ? ` × ${x.qty}` : ''}`).join(', ')}</p>
              )}
              {!closed && (
                <div className="app-actions">
                  <a className="button button-small button-cream" href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}&travelmode=two-wheeler`} target="_blank" rel="noreferrer">
                    <Navigation size={16} aria-hidden="true" /> Navigate
                  </a>
                  <a className="button button-small button-cream" href={`tel:+91${o.customer_phone}`}>
                    <Phone size={16} aria-hidden="true" /> Call
                  </a>
                  {d.status !== 'out_for_delivery' ? (
                    <button type="button" className="button button-small" disabled={busyId === d.id} onClick={() => pickUp(d.id)}>
                      Picked up, start delivery
                    </button>
                  ) : (
                    <button type="button" className="app-linkbutton app-danger" disabled={busyId === d.id} onClick={() => missed(d.id)}>
                      <X size={14} aria-hidden="true" /> Couldn’t deliver
                    </button>
                  )}
                </div>
              )}
              {d.status === 'out_for_delivery' && <DeliverPanel delivery={d} onDone={() => router.refresh()} />}
            </li>
          )
        })}
      </ul>
    </>
  )
}
