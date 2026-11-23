'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, MapPin, Navigation, Phone, Radio } from 'lucide-react'
import { getBrowserClient } from '../../lib/supabase/browser.js'
import { RIDER_PING_MS } from '../../lib/config.js'
import { DELIVERY_STATUS } from '../../lib/status.js'
import StatusPill from '../../components/StatusPill.jsx'
import { setRiderStatus } from './actions.js'

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

  async function update(id, status) {
    setBusyId(id)
    setError('')
    if (status === 'out_for_delivery') start()
    const result = await setRiderStatus(id, status)
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
          const closed = d.status === 'delivered'
          return (
            <li key={d.id} className={`app-card rider-card${closed ? ' is-closed' : ''}`}>
              <div className="rider-card-head">
                <strong>#{o.order_number} · {d.item_name}{d.quantity > 1 ? ` × ${d.quantity}` : ''}</strong>
                <StatusPill status={d.status} map={DELIVERY_STATUS} />
              </div>
              <p className="detail-line"><MapPin size={18} aria-hidden="true" /><span>{o.address_line}{o.address_landmark && <> · near {o.address_landmark}</>}</span></p>
              <p className="detail-line"><Phone size={18} aria-hidden="true" /><span>{o.customer_name} · {o.customer_phone}</span></p>
              {o.notes && <p className="app-muted">Note: {o.notes}</p>}
              {!closed && (
                <div className="app-actions">
                  <a className="button button-small button-cream" href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}&travelmode=two-wheeler`} target="_blank" rel="noreferrer">
                    <Navigation size={16} aria-hidden="true" /> Navigate
                  </a>
                  <a className="button button-small button-cream" href={`tel:+91${o.customer_phone}`}>
                    <Phone size={16} aria-hidden="true" /> Call
                  </a>
                  {d.status !== 'out_for_delivery' ? (
                    <button type="button" className="button button-small" disabled={busyId === d.id} onClick={() => update(d.id, 'out_for_delivery')}>
                      Picked up, start delivery
                    </button>
                  ) : (
                    <button type="button" className="button button-small" disabled={busyId === d.id} onClick={() => update(d.id, 'delivered')}>
                      <CircleCheck size={16} aria-hidden="true" /> Mark delivered
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
