'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'magic'>('signin')
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

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[#fafafa]">
      <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in duration-700">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#d4ff00] text-[#0a0e27] font-black text-xl shadow-sm">M</div>
        <div className="flex flex-col">
          <span className="font-bold text-2xl tracking-tighter text-[#0a0e27]">Morsel</span>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#8a8a8a] -mt-1">Private Tracker</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full bg-white rounded-[10px] border-2 border-[#f0f0f0] p-8 shadow-sm scale-in">
        <h1 className="text-2xl font-bold mb-1 text-[#0a0e27]">Welcome back</h1>
        <p className="text-[14px] font-medium text-[#8a8a8a] mb-8">
          Sign in to your tracker ✨
        </p>

        <form onSubmit={mode === 'signin' ? handleSignIn : handleMagicLink} className="flex flex-col gap-4">
          <div className="flex gap-2 mb-6 p-1 rounded-md bg-[#fafafa] border border-[#f0f0f0]">
            {(['signin', 'magic'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all cursor-pointer ${mode === m ? 'bg-white text-[#0a0e27] shadow-sm' : 'text-[#8a8a8a]'}`}>
                {m === 'signin' ? 'Password' : 'Magic'}
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
                className="w-full rounded-[10px] px-5 py-4 text-sm font-bold outline-none border-2 border-[#f0f0f0] bg-white text-[#0a0e27] placeholder:text-[#8a8a8a]/50 transition-all focus:border-[#f0f0f0]"
              />
            </div>
          </div>

          {mode === 'signin' && (
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
                  className="w-full rounded-[10px] px-5 py-4 text-sm font-bold outline-none border-2 border-[#f0f0f0] bg-white text-[#0a0e27] placeholder:text-[#8a8a8a]/50 transition-all focus:border-[#f0f0f0]"
                />
              </div>
            </div>
          )}

          {message && (
            <div className={`rounded-[10px] p-4 text-sm font-bold border ${message.type === 'error' ? 'bg-[#ff2d55]/[0.05] border-[#ff2d55]/20 text-[#ff2d55]' : 'bg-[#d4ff00]/[0.05] border-[#d4ff00]/20 text-[#0a0e27]'}`}>
              {message.text}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-5 mt-2 rounded-[10px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all enabled:bg-[#d4ff00] enabled:text-[#0a0e27] disabled:bg-[#f0f0f0] disabled:text-[#8a8a8a] cursor-pointer shadow-sm active:scale-95">
            {loading ? <Loader2 size={10} className="animate-spin" /> : (
              <>
                {mode === 'signin' ? 'Engage' : 'Send Link'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a8a8a]">
        Private tracker — active access only
      </p>
      </div>
    </div>
  )
}
