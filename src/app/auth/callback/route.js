import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server.js'
import { safeNextPath } from '../../../lib/safeRedirect.js'

// The "magic link" in the sign-in email lands here.
export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  // Same-site paths only (blocks //evil.com and /\evil.com open redirects).
  const next = safeNextPath(url.searchParams.get('next'), '/order')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin))
}
