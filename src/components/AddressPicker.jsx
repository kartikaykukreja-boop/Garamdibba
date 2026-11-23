'use client'

import { useState } from 'react'
import { Crosshair, MapPin, Search } from 'lucide-react'
import MapView from './MapView.jsx'
import { deliveryCheck } from '../lib/geo.js'

// Free OpenStreetMap geocoding (Nominatim). Fine for a small shop's traffic.
const NOMINATIM = 'https://nominatim.openstreetmap.org'

async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept-Language': 'en-IN' },
    })
    const data = await res.json()
    return data?.display_name?.split(', ').slice(0, 4).join(', ') ?? ''
  } catch {
    return ''
  }
}

export default function AddressPicker({ kitchen, radiusKm, point, onPointChange, onAddressSuggestion }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('')
  const [focusKey, setFocusKey] = useState(0)
  const check = deliveryCheck(point)

  async function pick(next, { zoom = false, suggest = true } = {}) {
    onPointChange(next)
    if (zoom) setFocusKey((key) => key + 1)
    if (suggest) {
      const label = await reverseGeocode(next)
      if (label) onAddressSuggestion?.(label)
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus('Your browser can’t share location. Search for your area or tap the map instead.')
      return
    }
    setStatus('Finding you…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('')
        pick({ lat: pos.coords.latitude, lng: pos.coords.longitude }, { zoom: true })
      },
      () => setStatus('Location permission was denied. Search for your area or tap the map instead.'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function search() {
    if (query.trim().length < 3) return
    setStatus('Searching…')
    const d = 0.25 // ~25 km box around the kitchen
    const viewbox = [kitchen.lng - d, kitchen.lat + d, kitchen.lng + d, kitchen.lat - d].join(',')
    try {
      const res = await fetch(
        `${NOMINATIM}/search?format=jsonv2&limit=6&countrycodes=in&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(query)}`,
        { headers: { 'Accept-Language': 'en-IN' } },
      )
      const data = await res.json()
      setResults(data)
      setStatus(data.length ? '' : 'No matches nearby. Try a landmark or area name, or tap the map.')
    } catch {
      setStatus('Search is unavailable right now. Tap the map to drop your pin.')
    }
  }

  return (
    <div className="address-picker">
      <div className="address-tools">
        <button type="button" className="button button-small" onClick={useMyLocation}>
          <Crosshair size={18} aria-hidden="true" /> Use my current location
        </button>
        <div className="address-search" role="search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                search()
              }
            }}
            placeholder="Search area, society or landmark"
            aria-label="Search for your area"
          />
          <button type="button" className="button button-small button-cream" aria-label="Search" onClick={search}>
            <Search size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <ul className="address-results">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => {
                  setResults([])
                  pick({ lat: Number(r.lat), lng: Number(r.lon) }, { zoom: true, suggest: false })
                  onAddressSuggestion?.(r.display_name.split(', ').slice(0, 4).join(', '))
                }}
              >
                <MapPin size={16} aria-hidden="true" /> {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {status && <p className="app-muted address-status">{status}</p>}

      <MapView
        kitchen={kitchen}
        radiusKm={radiusKm}
        destination={point}
        onDestinationChange={(next) => pick(next, { suggest: false })}
        focusKey={focusKey}
        label="Delivery location map. Tap to place your pin."
      />
      <p className="app-hint">Tap the map or drag the 🏠 pin to your exact door. The dashed circle is our delivery area.</p>

      {point && (
        <p className={check.ok ? 'app-alert app-alert-ok' : 'app-alert app-alert-error'} role="status">
          {check.ok
            ? `We deliver here. You’re ${check.distance} km from our kitchen.`
            : `Sorry, this location isn’t available for delivery. It’s ${check.distance} km away and we deliver within ${radiusKm} km.`}
        </p>
      )}
    </div>
  )
}
