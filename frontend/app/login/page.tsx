'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'magic' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const supabase = createClient()

  // Catch errors from the URL (e.g. expired magic links)
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', '?'))
      const errorMsg = params.get('error_description') || 'Authentication failed'
      setMessage({ type: 'error', text: errorMsg.replace(/\+/g, ' ') })
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      window.location.href = '/'
    }
    setLoading(false)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Check your email for a magic link.' })
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error, data } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else if (data?.user && data.session === null) {
      setMessage({ type: 'success', text: 'Success! Check your email to confirm.' })
    } else {
      window.location.href = '/'
    }
    setLoading(false)
  }

  const getSubmitHandler = () => {
    if (mode === 'signin') return handleSignIn
    if (mode === 'magic') return handleMagicLink
    return handleSignUp
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-8 bg-[#030409] text-white selection:bg-[#d4ff00] selection:text-[#030409] font-sans">
      
      {/* Background gradients for a subtle SaaS feel */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute w-[800px] h-[400px] bg-[#d4ff00]/10 blur-[120px] rounded-full top-0 -translate-y-1/2" />
        <div className="absolute w-[600px] h-[600px] bg-[#00d9ff]/5 blur-[120px] rounded-full bottom-0 translate-y-1/3" />
      </div>

      <div className="w-full max-w-[400px] relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
        
        {/* Simple Minimal Logo */}
        <div className="mb-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#d4ff00] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(212,255,0,0.2)]">
            <span className="font-black text-2xl text-[#030409]">M</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            {mode === 'signup' ? 'Create an account' : mode === 'magic' ? 'Magic Link' : 'Welcome back'}
          </h1>
          <p className="text-[15px] text-[#a1a1aa]">
            {mode === 'signup' ? 'Enter your details to get started.' : mode === 'magic' ? 'Sign in via secure email link.' : 'Enter your details to sign in.'}
          </p>
        </div>

        <div className="w-full bg-[#08090a]/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          
          <form onSubmit={getSubmitHandler()} className="flex flex-col gap-5 relative z-10">
            
            {/* Mode Selection */}
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
              {(['signin', 'magic', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    mode === m 
                      ? 'bg-[#d4ff00] text-[#030409] shadow-sm' 
                      : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {m === 'signin' ? 'Sign In' : m === 'magic' ? 'Magic Link' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#e4e4e7] ml-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm outline-none transition-all focus:border-[#d4ff00]/50 focus:bg-[#d4ff00]/5 focus:ring-1 focus:ring-[#d4ff00]/50 placeholder:text-[#52525b]"
                />
              </div>

              {mode !== 'magic' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-medium text-[#e4e4e7]">Password</label>
                    {mode === 'signin' && (
                      <a href="#" className="text-xs text-[#a1a1aa] hover:text-[#d4ff00] transition-colors">Forgot?</a>
                    )}
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm outline-none transition-all focus:border-[#d4ff00]/50 focus:bg-[#d4ff00]/5 focus:ring-1 focus:ring-[#d4ff00]/50 placeholder:text-[#52525b]"
                  />
                </div>
              )}
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-sm flex items-center gap-2 border ${
                message.type === 'error' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                  : 'bg-[#d4ff00]/10 border-[#d4ff00]/20 text-[#d4ff00]'
              }`}>
                {message.text}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-[14px] bg-[#d4ff00] text-[#030409] font-black tracking-wide text-sm flex items-center justify-center gap-2 hover:bg-[#b8dd00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(212,255,0,0.15)] hover:shadow-[0_15px_40px_rgba(212,255,0,0.3)] hover:-translate-y-0.5"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin text-[#030409]" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : mode === 'magic' ? 'Send Magic Link' : 'Create Account'}
                  <ArrowRight size={16} className="text-[#030409]" />
                </>
              )}
            </button>
          </form>

        </div>

        <p className="mt-8 text-xs text-[#71717a]">
          By continuing, you agree to Morsel's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
