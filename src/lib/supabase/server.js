import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export function supabaseConfigured() {
  return Boolean(URL && PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY)
}

// Acts as the signed-in visitor (reads their session cookie). Create one per request.
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes the session instead.
        }
      },
    },
  })
}

// Full database access. Server-only: never import this from a 'use client' file.
// Every caller must check who the user is before reading or writing with it.
export function createAdminClient() {
  return createSupabaseClient(URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
