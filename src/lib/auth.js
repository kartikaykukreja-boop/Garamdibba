// Who is signed in, and what are they allowed to see? Server-only.
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createAdminClient, createClient, supabaseConfigured } from './supabase/server.js'

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

// Returns { user, profile } or null. profile.company is joined in when present.
export async function getSession() {
  await connection() // always per-request, never prerendered
  if (!supabaseConfigured()) return null
  const supabase = await createClient()
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

  // Emails listed in ADMIN_EMAILS are promoted to admin on their next visit.
  if (profile.role !== 'admin' && user.email && adminEmails().includes(user.email.toLowerCase())) {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id)
    profile.role = 'admin'
  }

  return { user, profile }
}

export async function requireSession(nextPath = '/account') {
  await connection()
  if (!supabaseConfigured()) redirect('/setup-needed')
  const session = await getSession()
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return session
}

export async function requireRole(roles, nextPath) {
  const session = await requireSession(nextPath)
  if (!roles.includes(session.profile.role)) redirect('/account?denied=1')
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
