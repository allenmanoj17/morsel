'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Mail, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react'

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
      // Clear the hash so the error doesn't persist on refresh
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
      setMessage({ type: 'success', text: 'Check your email for a magic link ✨' })
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
      setMessage({ type: 'success', text: 'Success! Check your email to confirm ✨' })
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
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[#0a0e27] text-white">
      <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in duration-700">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#d4ff00] text-[#0a0e27] font-black text-xl shadow-[0_0_20px_rgba(212,255,0,0.2)]">M</div>
        <div className="flex flex-col">
          <span className="font-bold text-2xl tracking-tighter text-white">Morsel</span>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#8a8a8a] -mt-1">Private Tracker</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-1 text-white">
          {mode === 'signup' ? 'Create Account' : mode === 'magic' ? 'Magic Access' : 'Welcome Back'}
        </h1>
        <p className="text-[14px] font-medium text-[#8a8a8a] mb-8">
          {mode === 'signup' ? 'Join the private tracking core ✨' : mode === 'magic' ? 'Passwordless entry protocol' : 'Sign in to your tracker ✨'}
        </p>

        <form onSubmit={getSubmitHandler()} className="flex flex-col gap-4">
          <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            {(['signin', 'magic', 'signup'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-[11px] uppercase tracking-widest font-black transition-all cursor-pointer ${mode === m ? 'bg-[#d4ff00] text-[#0a0e27] shadow-sm' : 'text-[#8a8a8a]'}`}>
                {m === 'signin' ? 'Login' : m === 'magic' ? 'Magic' : 'Join'}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[10px] uppercase font-black tracking-widest text-[#8a8a8a] ml-2 mb-2 block">Email</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-[16px] px-5 py-4 text-sm font-bold outline-none border-2 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-[#8a8a8a]/50 transition-all focus:border-[#d4ff00]/30"
              />
            </div>
          </div>

          {mode !== 'magic' && (
            <div>
              <label className="text-[10px] uppercase font-black tracking-widest text-[#8a8a8a] ml-2 mb-2 block">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-[16px] px-5 py-4 text-sm font-bold outline-none border-2 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-[#8a8a8a]/50 transition-all focus:border-[#d4ff00]/30"
                />
              </div>
            </div>
          )}

          {message && (
            <div className={`rounded-[16px] p-4 text-sm font-bold border ${message.type === 'error' ? 'bg-[#ff2d55]/[0.05] border-[#ff2d55]/20 text-[#ff2d55]' : 'bg-[#d4ff00]/[0.05] border-[#d4ff00]/20 text-[#d4ff00]'}`}>
              {message.text}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-5 mt-2 rounded-[14px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all enabled:bg-[#d4ff00] enabled:text-[#0a0e27] disabled:bg-white/[0.05] disabled:text-[#8a8a8a] cursor-pointer shadow-[0_8px_24px_rgba(212,255,0,0.2)] active:scale-95">
            {loading ? <Loader2 size={14} className="animate-spin" /> : (
              <>
                {mode === 'signin' ? 'Engage Protocol' : mode === 'magic' ? 'Send Link' : 'Initialize Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
           {mode === 'signup' ? (
             <p className="text-[11px] font-bold text-[#8a8a8a]">
               Already initialized? <button onClick={() => setMode('signin')} className="text-[#d4ff00] uppercase tracking-widest ml-1 font-black">Sign In</button>
             </p>
           ) : mode === 'signin' ? (
             <p className="text-[11px] font-bold text-[#8a8a8a]">
               New operator? <button onClick={() => setMode('signup')} className="text-[#d4ff00] uppercase tracking-widest ml-1 font-black">Create Core</button>
             </p>
           ) : null}
        </div>
      </div>

      <p className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a8a8a]">
        Private tracker — active access only
      </p>
      </div>
    </div>
  )
}
