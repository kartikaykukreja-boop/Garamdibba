import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server.js'

export async function POST(request) {
  // Only our own pages may sign people out (blocks cross-site "logout CSRF").
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return new NextResponse('Forbidden', { status: 403 })
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
