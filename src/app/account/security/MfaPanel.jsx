'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '../../../lib/supabase/browser.js'
import { safeNextPath } from '../../../lib/safeRedirect.js'

// Supabase Auth TOTP (authenticator app) enrolment and verification.
export default function MfaPanel({ hasFactor, next }) {
  const router = useRouter()
  const [enrol, setEnrol] = useState(null) // { factorId, qr, secret }
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function startEnrol() {
    setBusy(true)
    setError('')
    const mfa = getBrowserClient().auth.mfa
    // Remove half-finished set-ups so a fresh QR code can be made.
    const { data: existing } = await mfa.listFactors()
    for (const f of existing?.all ?? []) {
      if (f.status !== 'verified') await mfa.unenroll({ factorId: f.id })
    }
    const { data, error: enrolError } = await mfa.enroll({ factorType: 'totp', friendlyName: `Garam Dibba ${Date.now()}` })
    setBusy(false)
    if (enrolError) return setError(enrolError.message)
    setEnrol({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }

  async function verify(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const mfa = getBrowserClient().auth.mfa
    let factorId = enrol?.factorId
    if (!factorId) {
      const { data } = await mfa.listFactors()
      factorId = data?.totp?.[0]?.id
    }
    if (!factorId) {
      setBusy(false)
      return setError('No authenticator is set up yet.')
    }
    const { error: verifyError } = await mfa.challengeAndVerify({ factorId, code: code.trim() })
    if (verifyError) {
      setBusy(false)
      setCode('')
      return setError('That code didn’t match. Check the time on your phone and use the newest code.')
    }
    router.replace(safeNextPath(next, '/account'))
    router.refresh()
  }

  const codeForm = (
    <form className="app-form" onSubmit={verify}>
      <label className="app-field">
        <span>6-digit code from your authenticator app</span>
        <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
      </label>
      {error && <p className="app-alert app-alert-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify'}</button>
    </form>
  )

  if (hasFactor && !enrol) return codeForm

  if (!enrol) {
    return (
      <div className="app-form">
        <p className="app-muted">You’ll need an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or Authy. It takes about a minute.</p>
        {error && <p className="app-alert app-alert-error" role="alert">{error}</p>}
        <button type="button" className="button" disabled={busy} onClick={startEnrol}>{busy ? 'Preparing…' : 'Set up 2-step login'}</button>
      </div>
    )
  }

  return (
    <div className="app-form">
      <ol className="mfa-steps">
        <li>Open your authenticator app and add an account by scanning this code.</li>
      </ol>
      <img className="mfa-qr" src={enrol.qr} alt="QR code to add Garam Dibba to your authenticator app" width={200} height={200} />
      <details className="app-details">
        <summary>Can’t scan? Enter this key instead</summary>
        <code className="mfa-secret">{enrol.secret}</code>
      </details>
      <ol className="mfa-steps" start={2}>
        <li>Type the 6-digit code the app shows.</li>
      </ol>
      {codeForm}
    </div>
  )
}
