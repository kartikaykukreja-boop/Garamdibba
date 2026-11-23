import { requireSession } from '../../../lib/auth.js'
import { createClient } from '../../../lib/supabase/server.js'
import { safeNextPath } from '../../../lib/safeRedirect.js'
import AccountNav from '../../../components/AccountNav.jsx'
import MfaPanel from './MfaPanel.jsx'

export const metadata = { title: '2-step login | Garam Dibba', robots: { index: false } }

// Admins must use 2-step login (an authenticator app) before Kitchen admin opens.
export default async function SecurityPage({ searchParams }) {
  const params = await searchParams
  const session = await requireSession('/account/security')
  const next = safeNextPath(params.next, session.profile.role === 'admin' ? '/admin' : '/account')
  const { data } = await (await createClient()).auth.mfa.listFactors()
  const hasFactor = Boolean(data?.totp?.length)

  return (
    <main className="app-page">
      <div className="shell app-narrow">
        <AccountNav profile={session.profile} active="/account" />
        <div className="app-card">
          <p className="eyebrow">Account security</p>
          <h1 className="app-title">2-step login</h1>
          {session.profile.role === 'admin' && session.needsMfa && (
            <p className="app-alert">Kitchen admin can see every customer’s orders and addresses, so it needs a code from your phone as well as your email.</p>
          )}
          {session.aal === 'aal2' && !session.needsMfa ? (
            <p className="app-alert app-alert-ok">2-step login is on for this session.</p>
          ) : (
            <MfaPanel hasFactor={hasFactor} next={next} />
          )}
        </div>
      </div>
    </main>
  )
}
