import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Keeps the Supabase login session fresh on account pages.
// Marketing pages are not matched, so they stay fully static.
export async function proxy(request) {
  let response = NextResponse.next({ request })
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    },
  )

  // Refreshes an expired access token. Do not remove.
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: [
    '/login',
    '/auth/:path*',
    '/order/:path*',
    '/orders/:path*',
    '/account/:path*',
    '/company/:path*',
    '/rider/:path*',
    '/admin/:path*',
  ],
}
