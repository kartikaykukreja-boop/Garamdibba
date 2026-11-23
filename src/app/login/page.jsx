import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { getSession } from '../../lib/auth.js'
import { supabaseConfigured } from '../../lib/supabase/server.js'
import LoginForm from './LoginForm.jsx'

export const metadata = { title: 'Sign in | Garam Dibba', robots: { index: false } }

function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/order'
}

export default async function LoginPage({ searchParams }) {
  await connection()
  if (!supabaseConfigured()) redirect('/setup-needed')
  const params = await searchParams
  const next = safeNext(params.next)
  if (await getSession()) redirect(next)

  return (
    <main className="app-page">
      <div className="shell app-narrow">
        <div className="app-card">
          <p className="eyebrow">Sign in</p>
          <h1 className="app-title">Order, pay and track your dibba</h1>
          <p className="app-muted">
            We’ll email you a 6-digit code. No password needed. New here? The same code creates your account.
          </p>
          {params.error && <p className="app-alert app-alert-error">That sign-in link didn’t work. Please request a new code.</p>}
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  )
}
