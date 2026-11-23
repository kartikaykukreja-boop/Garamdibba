'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddressPicker from '../../components/AddressPicker.jsx'
import { savePin } from './actions.js'

// Move the saved delivery pin. Riders navigate to this exact point.
export default function PinEditor({ kitchen, radiusKm, initial, roadKm }) {
  const router = useRouter()
  const [point, setPoint] = useState(initial)
  const [state, setState] = useState({ busy: false, message: roadKm != null ? `${roadKm} km from our kitchen by road.` : '', error: '' })
  const dirty = point && (!initial || point.lat !== initial.lat || point.lng !== initial.lng)

  async function save() {
    setState({ busy: true, message: '', error: '' })
    const result = await savePin(point)
    if (result.error) return setState({ busy: false, message: '', error: result.error })
    setState({ busy: false, message: `Saved. ${result.km} km from our kitchen by road.`, error: '' })
    router.refresh()
  }

  return (
    <div className="pin-editor">
      <AddressPicker kitchen={kitchen} radiusKm={radiusKm} point={point} onPointChange={setPoint} hideCheck />
      {state.message && <p className="app-alert app-alert-ok">{state.message}</p>}
      {state.error && <p className="app-alert app-alert-error">{state.error}</p>}
      <button type="button" className="button button-small" disabled={!dirty || state.busy} onClick={save}>
        {state.busy ? 'Checking…' : 'Save this pin'}
      </button>
    </div>
  )
}
