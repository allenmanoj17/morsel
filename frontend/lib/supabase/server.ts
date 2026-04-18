import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServerEnv } from '@/lib/supabase/env'

export async function createClient() {
  const cookieStore = await cookies()
  const env = getSupabaseServerEnv()

  if (!env) {
    throw new Error(
      'Missing Supabase server env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on the deploy, or provide SUPABASE_URL and SUPABASE_ANON_KEY on the server.'
    )
  }

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — mutations handled by middleware
          }
        },
      },
    }
  )
}
