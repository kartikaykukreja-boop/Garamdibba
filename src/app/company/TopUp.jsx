'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startTopup } from './actions.js'
import { confirmPayment } from '../../lib/actions/payment.js'
import { openRazorpay } from '../../lib/razorpayCheckout.js'

const PRESETS = [25000, 50000, 100000]

export default function TopUp() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function pay(event) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    const result = await startTopup(amount)
    if (result.error) {
      setBusy(false)
      return setMessage({ error: true, text: result.error })
    }
    try {
      await openRazorpay(result.checkout, {
        onSuccess: async (response) => {
          const confirmed = await confirmPayment(response)
          setBusy(false)
          setAmount('')
          setMessage(confirmed.error ? { error: true, text: confirmed.error } : { text: 'Payment received. Budget updated.' })
          router.refresh()
        },
        onDismiss: () => setBusy(false),
        onFailure: (text) => setMessage({ error: true, text }),
      })
    } catch (error) {
      setBusy(false)
      setMessage({ error: true, text: error.message })
    }
  }

  return (
    <form className="app-form" onSubmit={pay}>
      <div className="chip-row">
        {PRESETS.map((preset) => (
          <button key={preset} type="button" className="chip" onClick={() => setAmount(String(preset))}>
            ₹{preset.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
      <div className="app-inline-form">
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="Amount in ₹"
          aria-label="Top-up amount in rupees"
          required
        />
        <button className="button button-small" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : 'Add money'}
        </button>
      </div>
      {message && <p className={message.error ? 'app-alert app-alert-error' : 'app-alert app-alert-ok'}>{message.text}</p>}
      <p className="app-hint">Paying by bank transfer instead? Send it to Garam Dibba and we’ll credit your budget manually.</p>
    </form>
  )
}
