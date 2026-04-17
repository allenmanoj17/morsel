'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Pill, Plus, Trash2, ChevronLeft, Info } from 'lucide-react'

export default function SupplementsPage() {
  const router = useRouter()
  const [stack, setStack] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  
  // New Supplement State
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        fetchStack(session.access_token)
      } else {
        router.push('/login')
      }
    })
  }, [router])

  async function fetchStack(tok: string) {
    if (!tok) return
    try {
      setLoading(true)
      const res = await api.getSupplementStack(tok)
      setStack((res || []).sort((a: any, b: any) => a.name.localeCompare(b.name)))
      setError('')
    } catch (e) {
      console.error('SUPPLEMENT_LOAD_FAILED:', e)
      setError('Could not load your supplements.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!name.trim()) {
      setError('Enter a name.')
      return
    }
    try {
      await api.createSupplement({ name: name.trim(), dosage: dosage.trim(), is_active: true }, token)
      setName(''); setDosage(''); setShowAdd(false)
      setError('')
      fetchStack(token)
    } catch (e) {
      console.error(e)
      setError('Could not save the supplement.')
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteSupplement(id, token)
      setError('')
      fetchStack(token)
    } catch (e) {
      console.error(e)
      setError('Could not delete the supplement.')
    }
  }

  const S = {
    container: { width: '100%', maxWidth: '1200px', margin: '0 auto', padding: 'clamp(18px, 4vw, 24px) clamp(14px, 3.5vw, 16px) clamp(112px, 24vw, 140px)', minHeight: '100dvh', background: '#030409', color: 'white', boxSizing: 'border-box' as const },
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: 'clamp(16px, 3.8vw, 20px)', marginBottom: 'clamp(12px, 3vw, 16px)', backdropFilter: 'blur(16px)' },
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '8px' },
    input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 16px', color: 'white', fontSize: '14px', marginBottom: '12px' }
  }

  return (
    <div style={S.container}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/settings')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '10px', color: 'white', cursor: 'pointer' }}>
          <ChevronLeft size={18} />
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>Supplements</h1>
      </div>

      <p style={{ fontSize: '14px', color: '#8a8a8a', marginBottom: '20px', lineHeight: 1.5 }}>Set up your daily supplements. You can tick them off on the home screen.</p>
      {error && <p style={{ fontSize: '13px', color: '#ff2d55', marginBottom: '16px' }}>{error}</p>}

      {showAdd && (
        <div style={{ ...S.card, background: 'linear-gradient(135deg, rgba(212,255,0,0.05) 0%, rgba(3,4,9,0) 100%)', borderColor: 'rgba(212,255,0,0.2)' }} className="animate-in slide-in-from-top-4 duration-300">
           <p style={S.label}>Add Supplement</p>
           <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={S.input} />
           <input placeholder="Amount or time" value={dosage} onChange={e => setDosage(e.target.value)} style={S.input} />
           <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'transparent', border: '1px solid #ff2d55', color: '#ff2d55', fontWeight: 800 }}>Cancel</button>
             <button onClick={handleAdd} style={{ flex: 2, padding: '14px', borderRadius: '14px', background: '#d4ff00', color: '#030409', border: 'none', fontWeight: 900 }}>Save</button>
           </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#8a8a8a', padding: '40px' }}>Loading supplements...</p>
        ) : stack.length > 0 ? (
          stack.map(s => (
            <div key={s.id} style={S.card}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(212,255,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pill size={20} color="#d4ff00" />
                     </div>
                     <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800 }}>{s.name}</h3>
                        <p style={{ fontSize: '11px', color: '#8a8a8a' }}>{s.dosage || 'No amount set'}</p>
                     </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)} style={{ background: 'transparent', border: 'none', color: '#3a3a3a', padding: '10px' }}>
                     <Trash2 size={18} />
                  </button>
               </div>
            </div>
          ))
        ) : !showAdd && (
          <div style={{ padding: '60px 40px', textAlign: 'center', border: '1px dashed #1a1a1a', borderRadius: '32px' }}>
             <Info size={40} color="#1a1a1a" style={{ marginBottom: '16px' }} />
             <p style={{ color: '#5a5a5a', fontWeight: 800 }}>No supplements yet.<br/>Add your first one.</p>
          </div>
        )}
      </div>

      {!showAdd && (
        <button onClick={() => setShowAdd(true)} 
          style={{ position: 'fixed', bottom: 'calc(104px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '420px', justifyContent: 'center', padding: '16px 24px', borderRadius: '20px', background: '#d4ff00', color: '#030409', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 900, boxShadow: '0 8px 30px rgba(212,255,0,0.3)', zIndex: 100 }}>
          <Plus size={18} strokeWidth={3} />
          Add Supplement
        </button>
      )}
    </div>
  )
}
