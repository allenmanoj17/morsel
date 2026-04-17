'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Plus, Trash2, Check, ChevronLeft, Dumbbell, Hash, Weight, Save, Timer, Zap, Clock } from 'lucide-react'
import QuickAddExerciseModal from '@/components/QuickAddExerciseModal'

const calculate1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight
  if (reps === 0 || weight === 0) return 0
  return Math.round(weight / (1.0278 - (0.0278 * reps)))
}

interface WorkoutSet {
  exercise_name: string
  set_index: number
  reps: number
  weight: number
}

interface ActiveExercise {
  id: string
  name: string
  sets: WorkoutSet[]
  history?: any[]
  detail?: string
}

export default function WorkoutLogPage() {
  const router = useRouter()
  const [exercises, setExercises] = useState<any[]>([])
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [timer, setTimer] = useState<number | null>(null)
  const [showAddEx, setShowAddEx] = useState(false)

  useEffect(() => {
    let interval: any
    if (timer !== null && timer > 0) {
      interval = setInterval(() => setTimer(t => (t !== null && t > 0) ? t - 1 : null), 1000)
    } else {
      setTimer(null)
    }
    return () => clearInterval(interval)
  }, [timer])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        fetchExercises(session.access_token)
      } else {
        router.push('/login')
      }
    })
  }, [router])

  async function fetchExercises(tok: string) {
    try {
      const data = await api.getExercises(tok)
      setExercises(data || [])
    } finally { setLoading(false) }
  }

  const addExercise = async (ex: any) => {
    const exId = Math.random().toString(36).substr(2, 9)
    let initialSets = [{ exercise_name: ex.name, set_index: 0, reps: 0, weight: 0 }]
    let historyData = []

    try {
      const history = await api.getExerciseHistory(ex.name, token)
      historyData = history || []
      if (historyData.length > 0) {
        const lastSession = historyData[0]
        initialSets = lastSession.sets.slice(0, 1).map((s: any) => ({
          ...s,
          set_index: 0
        }))
      }
    } catch (e) {
      console.error('Failed to hydration history:', e)
    }

    setActiveExercises(prev => [...prev, {
      id: exId,
      name: ex.name,
      sets: initialSets,
      history: historyData,
      detail: ex.detail
    }])
  }

  const cloneHistory = (exId: string) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.id === exId && ex.history && ex.history.length > 0) {
        return {
          ...ex,
          sets: ex.history[0].sets.map((s: any, i: number) => ({ ...s, set_index: i }))
        }
      }
      return ex
    }))
  }

  const addSet = (exId: string) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.sets[ex.sets.length - 1]
        return {
          ...ex,
          sets: [...ex.sets, { ...lastSet, set_index: ex.sets.length }]
        }
      }
      return ex
    }))
  }

  const updateSet = (exId: string, setIndex: number, field: keyof WorkoutSet, value: number) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.map((s, idx) => idx === setIndex ? { ...s, [field]: value } : s)
        }
      }
      return ex
    }))
  }

  const removeExercise = (exId: string) => {
    setActiveExercises(prev => prev.filter(ex => ex.id !== exId))
  }

  const removeSet = (exId: string, setIndex: number) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.filter((_, idx) => idx !== setIndex).map((s, idx) => ({ ...s, set_index: idx }))
        }
      }
      return ex
    }).filter(ex => ex.sets.length > 0))
  }

  const handleSave = async () => {
    const allSets = activeExercises.flatMap(ex => ex.sets)
    if (allSets.length === 0) return alert('Add at least one set.')
    
    setSaving(true)
    try {
      await api.createWorkoutSession({ session_date: sessionDate, notes, sets: allSets }, token)
      router.push('/workouts')
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const S = {
    container: { 
      width: '100%', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: 'clamp(18px, 4vw, 24px) clamp(14px, 4vw, 20px) clamp(112px, 24vw, 140px)', 
      minHeight: '100dvh', 
      background: '#030409', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column' as const, 
      boxSizing: 'border-box' 
    } as React.CSSProperties,
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: 'clamp(16px, 4vw, 24px)', marginBottom: 'clamp(14px, 3vw, 20px)' },
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '8px' },
    input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: 'white', fontSize: '14px', width: '100%', boxSizing: 'border-box' as const }
  }

  const totalVolume = activeExercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + (s.reps * s.weight), 0), 0)

  return (
    <div style={S.container}>
      {/* Unified Timer HUD */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#030409', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => router.push('/workouts')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '10px', color: 'white', cursor: 'pointer' }}>
              <ChevronLeft size={18} />
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>Log <span style={{ color: '#d4ff00' }}>Session</span></h1>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
             {timer !== null && (
               <div style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.2)', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={14} color="#00d9ff" className="animate-pulse" />
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#00d9ff', fontFamily: 'monospace' }}>{Math.floor(timer/60)}:{String(timer%60).padStart(2,'0')}</span>
               </div>
             )}
             <div>
                <p style={{ ...S.label, marginBottom: 0 }}>Vol</p>
                <p style={{ fontSize: '16px', fontWeight: 900, color: '#d4ff00' }}>{Math.round(totalVolume)}kg</p>
             </div>
          </div>
        </div>

        {/* Timer Controls with Tuning */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
             {[60, 90, 120, 180].map(sec => (
               <button key={sec} onClick={() => setTimer(sec)}
                 style={{ flexShrink: 0, padding: '8px 16px', borderRadius: '12px', background: timer === sec ? 'rgba(0,217,255,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${timer === sec ? 'rgba(0,217,255,0.3)' : 'rgba(255,255,255,0.08)'}`, color: timer === sec ? '#00d9ff' : '#8a8a8a', fontSize: '11px', fontWeight: 900 }}>
                 {sec}s
               </button>
             ))}
          </div>
          {timer !== null && (
            <div style={{ display: 'flex', gap: '6px' }}>
               <button onClick={() => setTimer(t => (t||0) + 5)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '10px', fontWeight: 900 }}>+5s</button>
               <button onClick={() => setTimer(t => Math.max(0, (t||0) - 5))} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '10px', fontWeight: 900 }}>-5s</button>
               <button onClick={() => setTimer(null)} style={{ color: '#ff2d55', border: 'none', background: 'none', padding: '6px', fontSize: '10px', fontWeight: 900 }}>OFF</button>
            </div>
          )}
        </div>
      </div>

      {/* Meta Input */}
      <div style={{ ...S.card, display: 'flex', gap: '12px', alignItems: 'center', padding: '16px', marginTop: '20px' }}>
         <div style={{ flex: 1 }}>
            <p style={S.label}>Date</p>
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} style={{ ...S.input, padding: '8px' }} />
         </div>
         <div style={{ flex: 2 }}>
            <p style={S.label}>Session Focus</p>
            <input placeholder="Personal bests, technique focus..." value={notes} onChange={e => setNotes(e.target.value)} style={{ ...S.input, padding: '8px' }} />
         </div>
      </div>

      {/* Active Exercises */}
      {activeExercises.map(ex => (
        <div key={ex.id} style={S.card}>
           <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#d4ff00' }}>{ex.name}</h3>
                 <button onClick={() => removeExercise(ex.id)} style={{ background: 'transparent', border: 'none', color: '#ff2d55' }}><Trash2 size={18} /></button>
              </div>
              
              {/* Technique Cue & History Overlay */}
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 {ex.detail && (
                    <div style={{ background: 'rgba(0,217,255,0.05)', border: '1px solid rgba(0,217,255,0.1)', padding: '12px', borderRadius: '12px', display: 'flex', gap: '8px' }}>
                       <Zap size={14} color="#00d9ff" style={{ flexShrink: 0 }} />
                       <p style={{ fontSize: '12px', color: '#00d9ff', fontWeight: 600, lineHeight: 1.4 }}>TIP: {ex.detail}</p>
                    </div>
                 )}
                 {ex.history && ex.history.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <div style={{ display: 'flex', gap: '12px' }}>
                          <p style={{ fontSize: '11px', color: '#8a8a8a', fontWeight: 700 }}>LAST BEST: <span style={{ color: 'white' }}>{ex.history[0].sets[0].weight}kg x {ex.history[0].sets[0].reps}</span></p>
                       </div>
                       <button onClick={() => cloneHistory(ex.id)} style={{ background: 'rgba(212,255,0,0.1)', border: 'none', borderRadius: '8px', padding: '4px 10px', color: '#d4ff00', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>USE LAST</button>
                    </div>
                 )}
              </div>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ex.sets.map((s, idx) => (
                 <div key={idx} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 40px 40px', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: '#313131', textAlign: 'center' }}>{idx + 1}</div>
                    <div style={{ position: 'relative' }}>
                       <input type="number" placeholder="Weight" value={s.weight || ''} onChange={e => updateSet(ex.id, idx, 'weight', parseFloat(e.target.value) || 0)} style={{ ...S.input, textAlign: 'center' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                       <input type="number" placeholder="Reps" value={s.reps || ''} onChange={e => updateSet(ex.id, idx, 'reps', parseInt(e.target.value) || 0)} style={{ ...S.input, textAlign: 'center' }} />
                    </div>
                    <button 
                       onClick={() => {
                          setTimer(90) // Auto-trigger 90s rest
                       }}
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4ff00', cursor: 'pointer' }}
                    >
                       <Check size={18} />
                    </button>
                    <button onClick={() => removeSet(ex.id, idx)} style={{ background: 'transparent', border: 'none', color: '#2a2a2a' }}><Trash2 size={16} /></button>
                 </div>
              ))}
           </div>

           <button onClick={() => addSet(ex.id)} 
             style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: '#8a8a8a', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
             <Plus size={14} /> ADD SET
           </button>
        </div>
      ))}

      {/* Add Exercise */}
      <div style={{ marginBottom: '32px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={S.label}>Add Exercise</p>
            <button onClick={() => setShowAddEx(true)} style={{ background: 'rgba(212,255,0,0.1)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#d4ff00', fontSize: '11px', fontWeight: 900 }}>NEW EXERCISE</button>
         </div>
         <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
            {exercises.map(ex => (
              <button key={ex.id} onClick={() => addExercise(ex)}
                style={{ flexShrink: 0, padding: '12px 20px', borderRadius: '18px', background: ex.user_id ? 'rgba(212,255,0,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${ex.user_id ? 'rgba(212,255,0,0.14)' : 'rgba(255,255,255,0.08)'}`, color: 'white', fontSize: '13px', fontWeight: 800, textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>{ex.name}</span>
                  <span style={{ fontSize: '10px', color: ex.user_id ? '#d4ff00' : '#8a8a8a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    {ex.user_id ? 'Yours' : 'Built-in'}
                  </span>
                </div>
              </button>
            ))}
         </div>
      </div>

      {showAddEx && <QuickAddExerciseModal token={token} onClose={() => setShowAddEx(false)} onSaved={() => { setShowAddEx(false); fetchExercises(token) }} />}

      {/* Floating Meta Save */}
      <button onClick={handleSave} disabled={saving}
        style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 40px)', maxWidth: '400px', padding: '22px', borderRadius: '24px', background: '#d4ff00', color: '#030409', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', fontWeight: 900, boxShadow: '0 15px 45px rgba(212,255,0,0.4)', zIndex: 100 }}>
        {saving ? 'RECORDING SESSION...' : <><Save size={24} strokeWidth={3} /> FINISH & SAVE</>}
      </button>
    </div>
  )
}
