import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server.js'

// The "magic link" in the sign-in email lands here.
export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const nextParam = url.searchParams.get('next') || '/order'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/order'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin))
}
