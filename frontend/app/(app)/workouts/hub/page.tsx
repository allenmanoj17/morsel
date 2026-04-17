'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Search, Plus, ChevronLeft, Info, PlayCircle, Zap, Trophy, TrendingUp, Dumbbell, Filter, Clock3 } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import QuickAddExerciseModal from '@/components/QuickAddExerciseModal'

export default function ExerciseHubPage() {
  const router = useRouter()
  const [exercises, setExercises] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showAddEx, setShowAddEx] = useState(false)
  const [strengthHistory, setStrengthHistory] = useState<any[]>([])
  const [groupFilter, setGroupFilter] = useState('All')
  
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
      
      const composite = await api.getCompositeAnalytics(90, tok)
      setStrengthHistory(composite.trends?.strength_evolution || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const groups = ['All', ...Array.from(new Set(exercises.map(ex => ex.muscle_group_primary).filter(Boolean)))]
  const myExerciseCount = exercises.filter(ex => ex.user_id).length
  const sharedExerciseCount = exercises.filter(ex => !ex.user_id).length
  const filtered = exercises.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase()) || 
    (ex.detail && ex.detail.toLowerCase().includes(search.toLowerCase()))
  ).filter(ex => groupFilter === 'All' || ex.muscle_group_primary === groupFilter)
  const linkedVideos = exercises.filter(ex => ex.youtube_url).length
  const trackedGroups = new Set(exercises.map(ex => ex.muscle_group_primary).filter(Boolean)).size

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
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: 'clamp(14px, 3.6vw, 24px)', marginBottom: 'clamp(12px, 3vw, 16px)', position: 'relative' as const },
    input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px', color: 'white', fontSize: '15px', outline: 'none' }
  }

  return (
    <div style={S.container}>
      <div style={{ ...S.card, padding: 'clamp(16px, 4vw, 22px)', background: 'linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(3,4,9,0) 100%)', border: '1px solid rgba(0,217,255,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: 'clamp(14px, 4vw, 18px)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <button onClick={() => router.push('/workouts')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '14px', padding: '10px', color: 'white', cursor: 'pointer' }}>
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.04em' }}>Exercise Library</h1>
              <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Built-in and your own exercises in one place.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/workouts/log')} style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 900 }}>Start Session</button>
            <button onClick={() => setShowAddEx(true)} style={{ padding: '12px 16px', borderRadius: '14px', background: '#d4ff00', border: 'none', color: '#030409', cursor: 'pointer', fontSize: '12px', fontWeight: 900 }}>Add Exercise</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 'clamp(8px, 2.8vw, 12px)' }}>
          {[
            { label: 'Exercises', value: exercises.length, sub: `${myExerciseCount} yours`, icon: Dumbbell, color: '#d4ff00' },
            { label: 'Groups', value: trackedGroups, sub: 'covered', icon: Filter, color: '#00d9ff' },
            { label: 'Shared', value: sharedExerciseCount, sub: 'built-in', icon: PlayCircle, color: '#ffffff' },
            { label: 'Shown', value: filtered.length, sub: groupFilter === 'All' ? 'all results' : groupFilter, icon: Clock3, color: '#8a8a8a' },
          ].map(card => (
            <div key={card.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: 'clamp(12px, 3.5vw, 16px)' }}>
              <card.icon size={16} color={card.color} style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '24px', fontWeight: 900 }}>{card.value}</p>
              <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 800, marginTop: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '10px', color: '#5a5a5a', marginTop: '2px' }}>{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 'clamp(12px, 3.5vw, 16px)' }}>
        <Search size={20} color="#5a5a5a" style={{ position: 'absolute', left: '16px', top: '16px' }} />
        <input 
          placeholder="Search exercises..." 
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...S.input, paddingLeft: '52px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '10px', scrollbarWidth: 'none' }}>
        {groups.map(group => (
          <button
            key={group}
            onClick={() => setGroupFilter(group)}
            style={{ flexShrink: 0, padding: '10px 14px', borderRadius: '12px', border: 'none', background: groupFilter === group ? 'rgba(212,255,0,0.14)' : 'rgba(255,255,255,0.04)', color: groupFilter === group ? '#d4ff00' : '#8a8a8a', fontSize: '11px', fontWeight: 900, cursor: 'pointer' }}
          >
            {group}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 3vw, 16px)' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#8a8a8a', padding: 'clamp(28px, 10vw, 60px)' }}>Loading exercises...</p>
        ) : filtered.length > 0 ? (
          filtered.map(ex => {
            const history = strengthHistory.find(s => s.exercise_name === ex.name)
            const currentE1RM = history ? history.e1rm_values[history.e1rm_values.length - 1] : null
            const sparkData = history ? history.dates.map((d: any, i: number) => ({ val: history.e1rm_values[i] })) : []
            const color = ex.muscle_group_primary === 'Chest' ? '#00d9ff' : ex.muscle_group_primary === 'Legs' ? '#d4ff00' : ex.muscle_group_primary === 'Back' ? '#ff2d55' : '#ffffff'
            const isMine = Boolean(ex.user_id)

            return (
              <div key={ex.id} style={{ ...S.card, padding: 'clamp(16px, 4vw, 24px)', border: `1px solid ${currentE1RM ? 'rgba(212,255,0,0.15)' : 'rgba(255,255,255,0.08)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'clamp(14px, 4vw, 20px)', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>{ex.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                       <span style={{ fontSize: '10px', fontWeight: 900, color: isMine ? '#d4ff00' : '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                         {isMine ? 'Yours' : 'Built-in'}
                       </span>
                       <span style={{ fontSize: '10px', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{ex.muscle_group_primary || 'Unsorted'}</span>
                       {ex.muscle_group_secondary && <span style={{ fontSize: '10px', fontWeight: 700, color: '#8a8a8a' }}>+ {ex.muscle_group_secondary}</span>}
                       <span style={{ fontSize: '10px', color: '#5a5a5a' }}>•</span>
                       <span style={{ fontSize: '10px', fontWeight: 700, color: '#5a5a5a' }}>{ex.equipment || 'None'}</span>
                       {ex.category && (
                        <>
                          <span style={{ fontSize: '10px', color: '#5a5a5a' }}>•</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#5a5a5a' }}>{ex.category}</span>
                        </>
                       )}
                    </div>
                  </div>
                  {currentE1RM && (
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(212,255,0,0.1)', padding: '6px 12px', borderRadius: '40px', color: '#d4ff00', fontSize: '11px', fontWeight: 900 }}>
                          <Trophy size={12} /> {currentE1RM}kg PR
                       </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 'clamp(12px, 4vw, 20px)', alignItems: 'center' }}>
                    <div style={{ flex: 1, height: '60px' }}>
                       {sparkData.length > 1 ? (
                         <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={sparkData}>
                             <Area type="monotone" dataKey="val" stroke="#d4ff00" strokeWidth={2} fill="rgba(212,255,0,0.05)" />
                           </AreaChart>
                         </ResponsiveContainer>
                       ) : (
                         <div style={{ height: '100%', display: 'flex', alignItems: 'center', color: '#3a3a3a', fontSize: '11px', fontWeight: 800 }}>More logs needed to show progress.</div>
                       )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                       {ex.youtube_url && (
                        <a href={ex.youtube_url} target="_blank" rel="noreferrer" style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          <PlayCircle size={20} />
                        </a>
                       )}
                       <button onClick={() => router.push(`/workouts/log?exercise=${encodeURIComponent(ex.name)}`)} 
                        style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#d4ff00', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#030409', cursor: 'pointer' }}>
                          <Zap size={20} strokeWidth={3} />
                       </button>
                    </div>
                </div>

                {ex.detail && (
                  <div style={{ marginTop: 'clamp(14px, 4vw, 20px)', padding: 'clamp(12px, 3.5vw, 16px)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 900, color: '#5a5a5a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Tip</p>
                    <p style={{ fontSize: '12px', lineHeight: 1.6, color: '#8a8a8a', fontWeight: 600 }}>{ex.detail}</p>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div style={{ padding: 'clamp(32px, 10vw, 80px) clamp(16px, 4vw, 40px)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
               <Info size={32} color="#1a1a1a" />
            </div>
            <p style={{ color: '#5a5a5a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No exercises found.</p>
          </div>
        )}
      </div>

      <button onClick={() => setShowAddEx(true)} 
        style={{ position: 'fixed', bottom: 'calc(104px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '360px', height: '58px', borderRadius: '20px', background: '#d4ff00', color: '#030409', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 12px 40px rgba(212,255,0,0.4)', zIndex: 100, cursor: 'pointer', fontSize: '14px', fontWeight: 900 }}>
        <Plus size={22} strokeWidth={3} />
        Add Exercise
      </button>

      {showAddEx && <QuickAddExerciseModal token={token} onClose={() => setShowAddEx(false)} onSaved={() => { setShowAddEx(false); fetchExercises(token) }} />}
    </div>
  )
}
