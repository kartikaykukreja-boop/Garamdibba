'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '../../lib/supabase/browser.js'

// onSignedIn: when given (e.g. inside the order flow), stay on the page instead of redirecting.
export default function LoginForm({ next, onSignedIn }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { error: sendError } = await getBrowserClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    setBusy(false)
    if (sendError) setError(sendError.message)
    else setStep('code')
  }

  async function verifyCode(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { error: verifyError } = await getBrowserClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    if (verifyError) {
      setBusy(false)
      setError('That code is wrong or has expired. Check the latest email, or send a new code.')
      return
    }
    if (onSignedIn) {
      setBusy(false)
      onSignedIn()
      return
    }
    router.replace(next)
    router.refresh()
  }

  if (step === 'code') {
    return (
      <form className="app-form" onSubmit={verifyCode}>
        <p className="app-alert">
          We sent a code to <strong>{email}</strong>. Enter it below, or tap the link in the email.
        </p>
        <label className="app-field">
          <span>8-digit code</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </label>
        {error && <p className="app-alert app-alert-error">{error}</p>}
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
        <button className="app-linkbutton" type="button" onClick={() => setStep('email')}>
          Use a different email
        </button>
      </form>
    )
  }

  return (
    <form className="app-form" onSubmit={sendCode}>
      <label className="app-field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      {error && <p className="app-alert app-alert-error">{error}</p>}
      <button className="button" type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Email me a code'}
      </button>
    </form>
  )
}
