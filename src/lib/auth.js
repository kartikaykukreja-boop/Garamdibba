// Who is signed in, and what are they allowed to see? Server-only.
//
// Roles live in public.profiles.role and can only be changed by the server (service key):
// there is no RLS policy that lets a browser update profiles, and no form field maps to it.
// Admin powers also require 2-step login (TOTP, Supabase "aal2"), checked here on every
// request and again inside the database (public.is_admin()).
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createAdminClient, createClient, supabaseConfigured } from './supabase/server.js'
import { EVENTS, logEvent } from './securityLog.js'

// Set ADMIN_MFA_REQUIRED=false only for local development.
export const ADMIN_MFA_REQUIRED = process.env.ADMIN_MFA_REQUIRED !== 'false'

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

/**
 * Returns { user, profile, aal, isAdmin, needsMfa } or null.
 * profile.company is joined in when present.
 * isAdmin is true only for role 'admin' WITH a verified second factor in this session.
 */
export async function getSession() {
  await connection() // always per-request, never prerendered
  if (!supabaseConfigured()) return null
  const supabase = await createClient()
  // getUser() asks Supabase Auth to validate the token; never trust cookie contents alone.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  let { data: profile } = await admin
    .from('profiles')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    // Users created before the schema was installed have no profile yet.
    await admin.from('profiles').upsert({ id: user.id, email: user.email })
    profile = { id: user.id, email: user.email, role: 'customer', company: null }
  }

  // Trusted provisioning: emails in the ADMIN_EMAILS server variable become admins once
  // they have signed in with a confirmed email. They still need 2-step login to act as admin.
  if (
    profile.role !== 'admin' &&
    user.email &&
    user.email_confirmed_at &&
    adminEmails().includes(user.email.toLowerCase())
  ) {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id)
    profile.role = 'admin'
    await logEvent(EVENTS.ADMIN_PROMOTED, { userId: user.id })
  }

  let aal = 'aal1'
  if (profile.role === 'admin') {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    aal = data?.currentLevel ?? 'aal1'
  }
  const isAdmin = profile.role === 'admin' && (!ADMIN_MFA_REQUIRED || aal === 'aal2')

  return { user, profile, aal, isAdmin, needsMfa: profile.role === 'admin' && !isAdmin }
}

export async function requireSession(nextPath = '/account') {
  await connection()
  if (!supabaseConfigured()) redirect('/setup-needed')
  const session = await getSession()
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return session
}

// Deny by default: the page renders only for the listed roles. An admin who hasn't
// completed 2-step login is sent to set it up / enter the code first.
export async function requireRole(roles, nextPath) {
  const session = await requireSession(nextPath)
  const { role } = session.profile
  if (role === 'admin' && session.needsMfa) redirect(`/account/security?next=${encodeURIComponent(nextPath)}`)
  if (!roles.includes(role)) {
    await logEvent(EVENTS.ADMIN_DENIED, { userId: session.user.id, detail: { path: nextPath } })
    redirect('/account?denied=1')
  }
  return session
}

export async function requireHr(nextPath = '/company') {
  const session = await requireSession(nextPath)
  const { profile } = session
  if (!profile.company_id || profile.company_role !== 'hr') redirect('/account?denied=1')
  return session
}

// For server actions: same checks, but return null instead of redirecting.
export async function actionSession() {
  try {
    return await getSession()
  } catch {
    return null
  }
}
