'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

const icon = (L, kind, label) =>
  L.divIcon({
    className: '',
    html: `<span class="map-pin map-pin-${kind}" aria-hidden="true">${label}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    tooltipAnchor: [0, -30],
  })

/**
 * OpenStreetMap view with the kitchen, an optional delivery radius, a destination pin
 * (draggable when onDestinationChange is given) and an optional live rider marker.
 */
export default function MapView({
  kitchen,
  radiusKm,
  destination,
  onDestinationChange,
  rider,
  focusKey,
  className = '',
  label = 'Map',
}) {
  const container = useRef(null)
  const layers = useRef({})
  const onChange = useRef(onDestinationChange)
  const [ready, setReady] = useState(false)
  const editable = Boolean(onDestinationChange)

  useEffect(() => {
    onChange.current = onDestinationChange
  })

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    import('leaflet').then((mod) => {
      if (cancelled || !container.current) return
      const L = mod.default ?? mod
      const map = L.map(container.current, { scrollWheelZoom: false })
      map.setView([kitchen.lat, kitchen.lng], 13)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)
      L.marker([kitchen.lat, kitchen.lng], { icon: icon(L, 'kitchen', '🍲'), keyboard: false })
        .addTo(map)
        .bindTooltip('Garam Dibba kitchen')
      if (radiusKm) {
        const circle = L.circle([kitchen.lat, kitchen.lng], {
          radius: radiusKm * 1000,
          color: '#ad2517',
          weight: 2,
          dashArray: '6 6',
          fillColor: '#dd9b3c',
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(map)
        map.fitBounds(circle.getBounds(), { padding: [10, 10] })
      }
      if (editable) {
        map.on('click', (event) => onChange.current?.({ lat: event.latlng.lat, lng: event.latlng.lng }))
      }
      layers.current = { L, map }
      setReady(true)
    })
    return () => {
      cancelled = true
      layers.current.map?.remove()
      layers.current = {}
      setReady(false)
    }
  }, [kitchen.lat, kitchen.lng, radiusKm, editable])

  // Destination pin.
  useEffect(() => {
    const state = layers.current
    if (!ready || !state.map) return
    const { L, map } = state
    if (!destination) {
      state.destination?.remove()
      state.destination = null
      return
    }
    const latlng = [destination.lat, destination.lng]
    if (!state.destination) {
      state.destination = L.marker(latlng, { icon: icon(L, 'home', '🏠'), draggable: editable, autoPan: true })
        .addTo(map)
        .bindTooltip(editable ? 'Drag me to your exact door' : 'Delivery address')
      if (editable) {
        state.destination.on('dragend', () => {
          const point = state.destination.getLatLng()
          onChange.current?.({ lat: point.lat, lng: point.lng })
        })
      }
    } else {
      state.destination.setLatLng(latlng)
    }
    if (!map.getBounds().pad(-0.15).contains(latlng)) map.panTo(latlng)
  }, [ready, destination?.lat, destination?.lng, editable]) // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom in on the destination when the parent asks (e.g. after "use my location").
  useEffect(() => {
    const { map } = layers.current
    if (!ready || !map || !focusKey || !destination) return
    map.setView([destination.lat, destination.lng], 17)
  }, [ready, focusKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live rider marker.
  useEffect(() => {
    const state = layers.current
    if (!ready || !state.map) return
    const { L, map } = state
    if (!rider) {
      state.rider?.remove()
      state.rider = null
      return
    }
    const latlng = [rider.lat, rider.lng]
    if (!state.rider) {
      state.rider = L.marker(latlng, { icon: icon(L, 'rider', '🛵'), zIndexOffset: 1000 })
        .addTo(map)
        .bindTooltip('Your rider')
      const points = [latlng]
      if (destination) points.push([destination.lat, destination.lng])
      map.fitBounds(points, { padding: [50, 50], maxZoom: 16 })
    } else {
      state.rider.setLatLng(latlng)
      if (!map.getBounds().contains(latlng)) map.panTo(latlng)
    }
  }, [ready, rider?.lat, rider?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={container} className={`map-view ${className}`.trim()} role="region" aria-label={label} />
}
