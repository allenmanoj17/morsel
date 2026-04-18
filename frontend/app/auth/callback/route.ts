import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseServerEnv } from '@/lib/supabase/env'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const env = getSupabaseServerEnv()

  if (!env) {
    return NextResponse.redirect(new URL('/login?error=missing-supabase-env', requestUrl.origin))
  }
  
  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      env.url,
      env.anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL('/', requestUrl.origin))
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/login?error=auth-callback-failed', requestUrl.origin))
}
