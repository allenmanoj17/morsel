'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Dumbbell, Plus, History, Book, ChevronRight, Trophy, Zap, Activity, TrendingUp, Calendar, Scale, Flame, Clock3 } from 'lucide-react'
import QuickAddExerciseModal from '@/components/QuickAddExerciseModal'

export default function WorkoutsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showAddEx, setShowAddEx] = useState(false)
  const [recovery, setRecovery] = useState<any[]>([])
  const [trends, setTrends] = useState<any>(null)
  const [range, setRange] = useState<'7D' | '30D' | 'ALL'>('30D')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        fetchSessions(session.access_token)
      } else {
        router.push('/login')
      }
    })
  }, [router])

  async function fetchSessions(tok: string) {
    try {
      const data = await api.getWorkoutSessions(tok)
      setSessions(data || [])
      
      const composite = await api.getCompositeAnalytics(30, tok)
      setRecovery(composite.trends?.recovery_status || [])
      setTrends(composite.trends)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--card-radius)', padding: 'clamp(14px, 3.6vw, 24px)', marginBottom: 'clamp(12px, 3vw, 16px)', backdropFilter: 'blur(16px)' },
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '8px' }
  }

  const totalSessions = sessions.length
  const totalWeight = sessions.reduce((acc, s) => acc + (s.total_volume || 0), 0)
  const lastSession = sessions[0] || null

  const filteredSessions = useMemo(() => {
    if (range === 'ALL') return sessions
    const days = range === '7D' ? 7 : 30
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - (days - 1))
    return sessions.filter((session: any) => new Date(session.session_date) >= cutoff)
  }, [sessions, range])

  const totalVolumeInRange = filteredSessions.reduce((acc: number, session: any) => acc + (session.total_volume || 0), 0)
  const avgVolume = filteredSessions.length ? Math.round(totalVolumeInRange / filteredSessions.length) : 0
  const totalSets = filteredSessions.reduce((acc: number, session: any) => acc + (session.sets?.length || 0), 0)
  const topTypes = (trends?.volume_by_category || []).slice(0, 3)

  const weekdayVolume = useMemo(() => {
    const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ({ day, volume: 0, sessions: 0 }))
    filteredSessions.forEach((session: any) => {
      const idx = new Date(session.session_date).getDay()
      base[idx].volume += session.total_volume || 0
      base[idx].sessions += 1
    })
    const maxVolume = Math.max(...base.map(item => item.volume), 0)
    return base.map(item => ({
      ...item,
      height: maxVolume > 0 ? Math.max(12, (item.volume / maxVolume) * 88) : 12
    }))
  }, [filteredSessions])

  const nextStep = useMemo(() => {
    const tiredCount = recovery.filter((item: any) => item.status === 'Tired').length
    const readyCount = recovery.filter((item: any) => item.status === 'Ready').length
    if (!sessions.length) return 'Start with one simple session.'
    if (tiredCount >= 2) return 'Keep it light today or rest.'
    if (readyCount >= 2) return 'Good day for a harder workout.'
    return 'A normal workout should feel fine today.'
  }, [recovery, sessions.length])

  return (
    <div style={S.container}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: 'clamp(16px, 4vw, 24px)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(24px, 7vw, 32px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '6px' }}>Workouts</h1>
          <p style={{ fontSize: '14px', color: '#8a8a8a' }}>Track your sessions, volume, and recovery.</p>
        </div>
        <button onClick={() => router.push('/analytics')} style={{ padding: '12px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
          <TrendingUp size={16} color="#00d9ff" />
          Insights
        </button>
      </div>

      <div style={{ ...S.card, background: 'linear-gradient(135deg, rgba(212,255,0,0.08) 0%, rgba(3,4,9,0) 100%)', border: '1px solid rgba(212,255,0,0.16)', marginBottom: 'clamp(14px, 4vw, 20px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: 'clamp(14px, 4vw, 20px)', flexWrap: 'wrap' }}>
          <div>
            <p style={S.label}>Overview</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: 'clamp(30px, 9vw, 42px)', fontWeight: 900, color: '#d4ff00', letterSpacing: '-0.05em' }}>{filteredSessions.length}</span>
              <span style={{ fontSize: '13px', color: '#8a8a8a', fontWeight: 700 }}>sessions in {range.toLowerCase()}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#8a8a8a', marginTop: '6px' }}>{nextStep}</p>
          </div>

          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['7D', '30D', 'ALL'] as const).map(option => (
              <button
                key={option}
                onClick={() => setRange(option)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: range === option ? 'rgba(212,255,0,0.15)' : 'transparent',
                  color: range === option ? '#d4ff00' : '#8a8a8a',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: 'clamp(8px, 2.8vw, 12px)' }}>
          {[
            { label: 'Volume', value: `${Math.round(totalVolumeInRange / 1000)}k`, sub: 'kg total', icon: Trophy, color: '#d4ff00' },
            { label: 'Avg Session', value: `${avgVolume}`, sub: 'kg each', icon: Scale, color: '#00d9ff' },
            { label: 'Sets', value: `${totalSets}`, sub: 'logged', icon: Flame, color: '#ff8a00' },
            { label: 'Last', value: lastSession ? new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--', sub: 'session day', icon: Calendar, color: '#ffffff' }
          ].map(card => (
            <div key={card.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: 'clamp(12px, 3.5vw, 16px)' }}>
              <card.icon size={16} color={card.color} style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: 'clamp(18px, 5.5vw, 24px)', fontWeight: 900, color: 'white', lineHeight: 1 }}>{card.value}</p>
              <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 800, marginTop: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '10px', color: '#5a5a5a', marginTop: '2px' }}>{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 'clamp(10px, 3vw, 16px)', marginBottom: 'clamp(16px, 4vw, 24px)' }}>
        <div style={{ ...S.card, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Clock3 size={16} color="#8a8a8a" />
            <p style={S.label}>Weekly Pattern</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: '6px', height: '104px' }}>
            {weekdayVolume.map(day => (
              <div key={day.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '100%', maxWidth: '24px', height: `${Math.min(day.height, 84)}px`, borderRadius: '10px 10px 4px 4px', background: day.sessions ? 'linear-gradient(180deg, rgba(212,255,0,0.95), rgba(212,255,0,0.25))' : 'rgba(255,255,255,0.06)', transition: 'height 0.2s ease' }} />
                <span style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 800 }}>{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Activity size={16} color="#8a8a8a" />
            <p style={S.label}>Top Focus</p>
          </div>
          {topTypes.length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {topTypes.map((item: any, index: number) => (
                <div key={item.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 800 }}>{index + 1}. {item.category}</p>
                    <p style={{ fontSize: '10px', color: '#8a8a8a', marginTop: '4px' }}>{Math.round(item.volume)} kg total</p>
                  </div>
                  <TrendingUp size={16} color="#00d9ff" />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: '#5a5a5a', fontWeight: 600 }}>Your top workout types will show here after you log a few sessions.</p>
          )}
        </div>
      </div>

      {/* Recovery HUD */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Activity size={16} color="#8a8a8a" />
          <p style={S.label}>Recovery</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
          {recovery.length > 0 ? recovery.map((mg, i) => (
            <div key={i} style={{ ...S.card, flexShrink: 0, width: '144px', marginBottom: 0, padding: 'clamp(12px, 3.5vw, 16px)', border: `1px solid ${mg.status === 'Ready' ? 'rgba(212,255,0,0.3)' : mg.status === 'Tired' ? 'rgba(255,45,85,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                 <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a' }}>{mg.muscle_group}</p>
                 <span style={{ fontSize: '10px', fontWeight: 900, color: mg.status === 'Ready' ? '#d4ff00' : mg.status === 'Tired' ? '#ff2d55' : '#00d9ff' }}>{mg.status}</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                 <p style={{ fontSize: '20px', fontWeight: 900, color: mg.status === 'Ready' ? '#d4ff00' : 'white' }}>{Math.round(mg.recovery_pct)}<span style={{ fontSize: '10px', color: '#5a5a5a' }}>%</span></p>
               </div>
               <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '12px' }}>
                  <div style={{ width: `${mg.recovery_pct}%`, height: '100%', borderRadius: '2px', background: mg.status === 'Ready' ? '#d4ff00' : mg.status === 'Tired' ? '#ff2d55' : '#00d9ff' }} />
               </div>
            </div>
          )) : (
            <div style={{ padding: 'clamp(14px, 4vw, 20px)', color: '#5a5a5a', fontSize: '12px', fontWeight: 600 }}>Recovery data will show after you log workouts.</div>
          )}
        </div>
      </div>

      {/* Main Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 'clamp(8px, 2.8vw, 12px)', marginBottom: 'clamp(18px, 5vw, 32px)' }}>
        <button onClick={() => router.push('/workouts/log')} 
          style={{ padding: 'clamp(18px, 4vw, 24px)', borderRadius: '28px', background: '#d4ff00', color: '#030409', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', fontWeight: 900, boxShadow: '0 12px 40px rgba(212,255,0,0.3)', cursor: 'pointer' }}>
          <Plus size={22} strokeWidth={3} />
          Start Session
        </button>
        <button onClick={() => router.push('/workouts/hub')} 
          style={{ padding: 'clamp(14px, 3.5vw, 18px)', borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
          <Book size={18} color="#00d9ff" />
          Exercise Library
        </button>
        <button onClick={() => setShowAddEx(true)} 
          style={{ padding: 'clamp(14px, 3.5vw, 18px)', borderRadius: '24px', background: 'rgba(212,255,0,0.05)', border: '1px solid rgba(212,255,0,0.15)', color: '#d4ff00', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
          <Zap size={18} color="#d4ff00" />
          Add Exercise
        </button>
        <button onClick={() => router.push('/analytics')} 
          style={{ padding: 'clamp(14px, 3.5vw, 18px)', borderRadius: '24px', background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.15)', color: '#00d9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
          <TrendingUp size={18} color="#00d9ff" />
          View Trends
        </button>
      </div>

      {/* Replay */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: 'clamp(18px, 5vw, 32px)' }}>
           <p style={S.label}>Repeat Last Session</p>
           <button 
              onClick={() => {
                // Pre-populate logic for workouts/log can go here or via query params
                router.push(`/workouts/log?replay=${sessions[0].id}`)
              }}
              style={{ width: '100%', padding: 'clamp(14px, 4vw, 20px)', borderRadius: '24px', background: 'rgba(212,255,0,0.05)', border: '1px dashed rgba(212,255,0,0.3)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}
           >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                 <p style={{ fontSize: '14px', fontWeight: 900, color: '#d4ff00' }}>Repeat Last Session</p>
                 <ChevronRight size={18} color="#d4ff00" />
              </div>
              <p style={{ fontSize: '11px', color: '#8a8a8a', fontWeight: 600 }}>Start with: {new Date(sessions[0].session_date).toLocaleDateString()}</p>
           </button>
        </div>
      )}

      {/* History */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <History size={16} color="#8a8a8a" />
          <p style={S.label}>Recent Workouts</p>
        </div>

        {loading ? (
          <div style={{ padding: '28px 18px', textAlign: 'center' }}><p style={{ color: '#8a8a8a' }}>Loading workouts...</p></div>
        ) : filteredSessions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredSessions.slice(0, 6).map((s: any) => {
              const exerciseNames = Array.from<string>(new Set((s.sets || []).map((set: any) => String(set.exercise_name)))).slice(0, 3)
              const bestSet = (s.sets || []).reduce((best: any, set: any) => {
                const currentScore = (set.weight || 0) * (set.reps || 0)
                const bestScore = best ? (best.weight || 0) * (best.reps || 0) : -1
                return currentScore > bestScore ? set : best
              }, null)

              return (
              <div key={s.id} style={{ ...S.card, padding: 'clamp(14px, 3.5vw, 18px)', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800 }}>{new Date(s.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <span style={{ fontSize: '10px', color: '#5a5a5a' }}>•</span>
                    <span style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 800 }}>{exerciseNames.length} exercises</span>
                    <span style={{ fontSize: '10px', color: '#5a5a5a' }}>•</span>
                    <span style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 800 }}>{s.sets.length} sets</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#8a8a8a' }}>{Math.round(s.total_volume)}kg total</p>
                  {exerciseNames.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {exerciseNames.map((name: string) => (
                        <span key={name} style={{ fontSize: '10px', fontWeight: 800, color: 'white', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '999px', padding: '5px 9px' }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  {bestSet && (
                    <p style={{ fontSize: '10px', color: '#5a5a5a', marginTop: '10px' }}>
                      Best set: {bestSet.weight}kg x {bestSet.reps}
                    </p>
                  )}
                  {s.notes && (
                    <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.notes}</p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '10px', flexShrink: 0 }}>
                  <button
                    onClick={() => router.push(`/workouts/log?replay=${s.id}`)}
                    style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(212,255,0,0.08)', border: '1px solid rgba(212,255,0,0.16)', color: '#d4ff00', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}
                  >
                    Repeat
                  </button>
                  <ChevronRight size={18} color="#5a5a5a" />
                </div>
              </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '28px 18px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Dumbbell size={32} color="#2a2a2a" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>No workout data yet.<br/>Log your first session.</p>
          </div>
        )}
      </div>
      {showAddEx && <QuickAddExerciseModal token={token} onClose={() => setShowAddEx(false)} onSaved={() => { setShowAddEx(false); fetchSessions(token) }} />}
    </div>
  )
}
