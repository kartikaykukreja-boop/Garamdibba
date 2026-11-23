'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bike, ChefHat, CircleCheck, Phone } from 'lucide-react'
import MapView from '../../../components/MapView.jsx'
import { getBrowserClient } from '../../../lib/supabase/browser.js'
import { etaMinutes } from '../../../lib/geo.js'

const STEPS = [
  { status: 'scheduled', label: 'Order received', icon: CircleCheck },
  { status: 'preparing', label: 'Being prepared', icon: ChefHat },
  { status: 'out_for_delivery', label: 'On the way', icon: Bike },
]

function useSecondsAgo(iso) {
  // Starts empty so server and browser render the same HTML; the clock begins after mount.
  const [now, setNow] = useState(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, 5000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [])
  return iso && now ? Math.max(0, Math.round((now - Date.parse(iso)) / 1000)) : null
}

export default function LiveTracker({ orderId, delivery, destination, kitchen, rider }) {
  const router = useRouter()
  const [location, setLocation] = useState(rider?.location ?? null)
  const secondsAgo = useSecondsAgo(location?.updated_at)
  const isLive = delivery.status === 'out_for_delivery' && rider

  // Status changes for this order (preparing → out for delivery → delivered) re-render the page.
  useEffect(() => {
    const supabase = getBrowserClient()
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `order_id=eq.${orderId}` },
        () => router.refresh(),
      )
      .subscribe()
    // Safety net in case the realtime connection drops.
    const poll = setInterval(() => router.refresh(), 60000)
    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [orderId, router])

  // Rider GPS while the dibba is on its way.
  useEffect(() => {
    if (!isLive) return
    const supabase = getBrowserClient()
    const channel = supabase
      .channel(`rider-${rider.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rider_locations', filter: `rider_id=eq.${rider.id}` },
        (payload) => payload.new?.lat && setLocation(payload.new),
      )
      .subscribe()
    const poll = setInterval(async () => {
      const { data } = await supabase.from('rider_locations').select('lat, lng, updated_at').eq('rider_id', rider.id).maybeSingle()
      if (data) setLocation(data)
    }, 15000)
    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [isLive, rider?.id])

  const stepIndex = STEPS.findIndex((step) => step.status === delivery.status)
  const eta = isLive && location ? etaMinutes(location, destination) : null

  return (
    <section className="app-card tracker">
      <div className="tracker-head">
        <div>
          <h2 className="app-subtitle">Today’s dibba: {delivery.item}</h2>
          {isLive && eta != null && <p className="tracker-eta">Arriving in about <strong>{eta} min</strong></p>}
          {isLive && !location && <p className="app-muted">Waiting for the rider’s GPS…</p>}
          {!isLive && <p className="app-muted">Live tracking starts when your rider picks up your dibba.</p>}
        </div>
        {isLive && rider.phone && (
          <a className="button button-small" href={`tel:+91${rider.phone}`}>
            <Phone size={16} aria-hidden="true" /> Call {rider.name}
          </a>
        )}
      </div>

      <ol className="tracker-steps">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <li key={step.status} className={index <= stepIndex ? 'is-done' : undefined}>
              <Icon size={18} aria-hidden="true" />
              <span>{step.label}</span>
            </li>
          )
        })}
      </ol>

      <MapView
        kitchen={kitchen}
        destination={destination}
        rider={isLive && location ? { lat: location.lat, lng: location.lng } : null}
        label="Live delivery map"
        className="map-view-tracker"
      />
      {isLive && secondsAgo != null && (
        <p className="app-hint">Rider location updated {secondsAgo < 15 ? 'just now' : `${Math.round(secondsAgo / 60) || 1} min ago`}.</p>
      )}
    </section>
  )
}
