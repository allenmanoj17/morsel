'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { addDaysToDateString, getLocalDateString } from '@/lib/utils'
import { useCurrentDateString } from '@/lib/useCurrentDateString'
import { Plus, Loader2, Check, Zap, TrendingUp, ChevronRight, ChevronLeft, Droplets, Minus, Scale, CircleDashed } from 'lucide-react'
import QuickAddModal from '@/components/QuickAddModal'

// ── Helpers ──
function offsetDate(base: string, delta: number) {
  return addDaysToDateString(base, delta)
}

function friendlyDate(iso: string) {
  const t = getLocalDateString()
  const yest = offsetDate(t, -1)
  if (iso === t) return 'Today'
  if (iso === yest) return 'Yesterday'
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface MacroProgress {
  consumed: number; target: number | null; remaining: number | null
  percent: number | null; hit: boolean | null
}
interface Dashboard {
  date: string; calories: MacroProgress; protein: MacroProgress
  carbs: MacroProgress; fat: MacroProgress; water: MacroProgress
  adherence_score: number | null; entry_count: number
}

interface Template {
  id: string
  template_name: string
  description?: string
}

// ── Components ──
function Ring({ pct, color, size = 72, stroke = 6, children }: {
  pct: number; color: string; size?: number; stroke?: number; children?: React.ReactNode
}) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const filled = Math.min(pct, 100)
  const dash = (filled / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 4px ${color}66)` }}
      />
      {children}
    </svg>
  )
}

function MacroRing({ label, value, target, percent, color, unit }: {
  label: string; value: number; target: number | null; percent: number | null
  color: string; unit: string
}) {
  const pct = percent ?? 0
  const done = pct >= 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <Ring pct={pct} color={done ? '#d4ff00' : color} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          {done
            ? <Check size={18} color="#d4ff00" strokeWidth={3} />
            : <span style={{ fontSize: '14px', fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>
              {Math.round(value)}
            </span>
          }
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{label}</p>
        {target && (
          <p style={{ fontSize: '9px', color: '#8a8a8a', marginTop: '1px' }}>/ {target}{unit}</p>
        )}
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [degraded, setDegraded] = useState(false)
  const [degradedReason, setDegradedReason] = useState<string | null>(null)

  const liveToday = useCurrentDateString()
  const [today, setToday] = useState(liveToday)
  const [selectedDate, setSelectedDate] = useState(liveToday)

  const [review, setReview] = useState<any>(null)
  const [generatingReview, setGeneratingReview] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [recentMeals, setRecentMeals] = useState<any[]>([])
  const [waterTotal, setWaterTotal] = useState(0)
  const [latestWeight, setLatestWeight] = useState<number | null>(null)
  const [quickTemplates, setQuickTemplates] = useState<Template[]>([])

  // -- Components --
  const SkeletonCard = () => (
    <div style={{ ...S.card, height: '120px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="shimmer" style={{ width: '40%', height: '14px', borderRadius: '4px' }} />
      <div className="shimmer" style={{ width: '100%', height: '32px', borderRadius: '8px' }} />
    </div>
  )

  // -- Kinetic Engine Integration --
  const [workoutSummary, setWorkoutSummary] = useState<{ sessions: number; totalVolume: number; lastSessionDate?: string } | null>(null)
  
  // -- Supplements Logic --
  const [supps, setSupps] = useState<any[]>([])
  const [suppLogs, setSuppLogs] = useState<Record<string, boolean>>({})

  const load = useCallback(async (tok: string, date: string) => {
    if (!tok || !date) return 

    try {
      setLoading(true)
      setError(null)
      const data = await api.getHomeComposite(date, tok)
      setDashboard(data.dashboard)
      setRecentMeals(data.dashboard?.entries?.slice(0, 3) || [])
      setWaterTotal(data.dashboard?.water?.consumed || 0)
      localStorage.setItem(`morsel_dash_cache_${date}`, JSON.stringify(data.dashboard))

      const stack = (data.supplements || [])
        .filter((s: any) => s.is_active)
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
      setSupps(stack)

      const logMap: Record<string, boolean> = {}
      ;(data.supplement_logs || []).forEach((entry: any) => {
        logMap[entry.supplement_id] = entry.taken
      })
      setSuppLogs(logMap)

      setWorkoutSummary({
        sessions: data.workout_summary?.sessions || 0,
        totalVolume: data.workout_summary?.total_volume || 0,
        lastSessionDate: data.workout_summary?.last_session_date
      })
      setLatestWeight(data.latest_weight?.weight_value ?? null)
      setQuickTemplates((data.quick_templates || []).slice(0, 4))
      setDegraded(false)
      setDegradedReason('')
      setReview(null)
    } catch (e: any) {
      console.error('DASHBOARD_FATAL_ERROR:', e)
      if (e.message?.includes('404')) router.push('/onboarding')
      const cached = localStorage.getItem(`morsel_dash_cache_${date}`)
      if (cached) {
        try {
          const fallback = JSON.parse(cached)
          setDashboard(fallback)
          setRecentMeals(fallback.entries?.slice(0, 3) || [])
          setWaterTotal(fallback.water?.consumed || 0)
          setDegraded(true)
          setDegradedReason('Showing cached nutrition data')
        } catch (cacheError) {
          console.error('Failed to parse dashboard cache:', cacheError)
          setError('Could not load your home data.')
        }
      } else {
      setError('Could not load your home data.')
      }
    }
    finally { setLoading(false) }
  }, [router])

  const toggleSupp = async (id: string) => {
    const isTaken = !suppLogs[id]
    // Optimistic Update
    setSuppLogs(prev => ({ ...prev, [id]: isTaken }))
    try {
      await api.logSupplement({ supplement_id: id, date: selectedDate, taken: isTaken }, token)
    } catch (e) {
      // Revert on error
      setSuppLogs(prev => ({ ...prev, [id]: !isTaken }))
      alert("Could not save this check.")
    }
  }

  useEffect(() => {
    if (!selectedDate) return
    const cached = localStorage.getItem(`morsel_dash_cache_${selectedDate}`)
    if (cached) {
      try {
        const d = JSON.parse(cached)
        setDashboard(d)
        setRecentMeals(d.entries?.slice(0, 3) || [])
        setWaterTotal(d.water?.consumed || 0)
      } catch (e: any) {
        console.error('Failed to parse dashboard cache:', e)
      }
    }
  }, [selectedDate])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        load(session.access_token, selectedDate)

        const metaName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name
        setDisplayName(metaName || session.user.email?.split('@')[0] || '')
      } else { 
        router.push('/login') 
      }
    })
  }, [load, selectedDate, router])

  const handleWater = async (amt: number) => {
    const nextAmount = Math.max(0, waterTotal + amt)
    const prevWater = waterTotal
    setWaterTotal(nextAmount)
    try {
      await api.logWater({ date: selectedDate, amount_ml: nextAmount }, token)
    } catch { 
      setWaterTotal(prevWater)
    }
  }

  const handleReview = async () => {
    setGeneratingReview(true)
    try {
      const res = await api.generateEODReview(selectedDate, token)
      setReview(res)
    } catch (e: any) { alert(`Coach Error: ${e.message}`) }
    finally { setGeneratingReview(false) }
  }

  const [greeting, setGreeting] = useState('Good day')

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  useEffect(() => {
    setSelectedDate((prev) => (prev === today ? liveToday : prev))
    setToday(liveToday)
  }, [liveToday, today])

  const isToday = selectedDate === today
  const supplementsDone = supps.filter(s => suppLogs[s.id]).length
  const supplementTotal = supps.length
  const score = Math.round(dashboard?.adherence_score || 0)
  const calorieRemaining = Math.round(dashboard?.calories.remaining ?? 0)
  const calorieState = calorieRemaining < 0 ? 'Over target' : calorieRemaining === 0 ? 'On target' : 'Left today'
  const quickLogTemplate = async (templateId: string) => {
    try {
      await api.logTemplate(templateId, token, selectedDate)
      load(token, selectedDate)
    } catch (e: any) {
      alert(e.message || 'Could not log template')
    }
  }

  const S = {
    container: {
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px 20px 140px',
      minHeight: '100dvh',
      background: '#030409',
      color: 'white',
      boxSizing: 'border-box'
    } as React.CSSProperties,
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--card-radius)', padding: '24px', marginBottom: '16px', backdropFilter: 'blur(16px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '8px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        .card-hover:active { transform: scale(0.98); opacity: 0.9; }
        .card-hover { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ ...S.card, padding: '22px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(212,255,0,0.08) 0%, rgba(0,217,255,0.04) 45%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(212,255,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <button onClick={() => setSelectedDate(offsetDate(selectedDate, -1))} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                <ChevronLeft size={14} color="white" />
              </button>
              <p style={{ ...S.label, marginBottom: 0, fontSize: '11px', color: 'white' }}>{friendlyDate(selectedDate)}</p>
              <button onClick={() => setSelectedDate(offsetDate(selectedDate, 1))} disabled={isToday}
                style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: 'none', cursor: isToday ? 'not-allowed' : 'pointer', opacity: isToday ? 0.2 : 1 }}>
                <ChevronRight size={14} color="white" />
              </button>
            </div>
            <h1 style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.05, marginTop: '6px' }}>
              <span style={{ color: '#d4ff00' }}>{greeting}</span>{displayName ? `, ${displayName.split(' ')[0]}` : ''}
            </h1>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
          {[
            { label: 'Daily score', value: `${score}%`, sub: 'overall' },
            { label: 'Meals', value: String(dashboard?.entry_count || 0), sub: 'logged' },
            { label: 'Water', value: `${waterTotal} ml`, sub: dashboard?.water.target ? `of ${dashboard.water.target} ml` : 'today' },
            { label: 'Supps', value: `${supplementsDone}/${supplementTotal || 0}`, sub: 'done' },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{item.label}</p>
              <p style={{ fontSize: '24px', fontWeight: 900, color: 'white', marginTop: '8px' }}>{item.value}</p>
              <p style={{ fontSize: '10px', color: '#5a5a5a', marginTop: '4px' }}>{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {degraded && (
        <div style={{ background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.2)', padding: '12px 20px', borderRadius: '16px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }} className="animate-in fade-in slide-in-from-top-4">
           <Zap size={16} color="#ff2d55" />
           <p style={{ fontSize: '12px', color: '#ff2d55', fontWeight: 700 }}>Some data could not load. Showing saved data instead. {degradedReason ? `(${degradedReason})` : ''}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ ...S.card, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', opacity: 0.5 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }} />)}
          </div>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : dashboard ? (
        <>
          {/* ── Macros ── */}
          <div style={{ ...S.card, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', padding: '24px 16px', position: 'relative', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,255,0,0.2), transparent)' }} />
            <MacroRing label="Cals" value={dashboard.calories.consumed} target={dashboard.calories.target} percent={dashboard.calories.percent} color="#00d9ff" unit="" />
            <MacroRing label="Prot" value={dashboard.protein.consumed} target={dashboard.protein.target} percent={dashboard.protein.percent} color="#d4ff00" unit="g" />
            <MacroRing label="Carb" value={dashboard.carbs.consumed} target={dashboard.carbs.target} percent={dashboard.carbs.percent} color="#ff2d55" unit="g" />
            <MacroRing label="Fat" value={dashboard.fat.consumed} target={dashboard.fat.target} percent={dashboard.fat.percent} color="#8a8a8a" unit="g" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Scale size={16} color="white" />
                <p style={{ ...S.label, marginBottom: 0 }}>Weight</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 900 }}>{latestWeight !== null ? latestWeight : '--'}</span>
                <span style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 700 }}>kg</span>
              </div>
              <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '4px' }}>{latestWeight !== null ? `Latest for ${friendlyDate(selectedDate)}` : 'No weight logged yet'}</p>
            </div>

            <div style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <CircleDashed size={16} color="#d4ff00" />
                <p style={{ ...S.label, marginBottom: 0 }}>Calories Left</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 900, color: calorieRemaining < 0 ? '#ff2d55' : '#d4ff00' }}>{Math.abs(calorieRemaining)}</span>
                <span style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 700 }}>{calorieRemaining < 0 ? 'over' : 'left'}</span>
              </div>
              <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '4px' }}>{dashboard.calories.target ? `${calorieState} · target ${dashboard.calories.target}` : 'No calorie target set'}</p>
            </div>

          </div>

          {/* ── Workout Summary ── */}
          <div className="card-hover" style={{ ...S.card, background: 'linear-gradient(135deg, rgba(0,217,255,0.05) 0%, rgba(3,4,9,0) 100%)', border: '1px solid rgba(0,217,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="#00d9ff" />
                <p style={{ ...S.label, marginBottom: 0 }}>Training</p>
              </div>
              <button onClick={() => router.push('/workouts')} style={{ background: 'transparent', border: 'none', color: '#00d9ff', fontSize: '11px', fontWeight: 900, cursor: 'pointer' }}>OPEN</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '32px', fontWeight: 900 }}>{Math.round((workoutSummary?.totalVolume || 0) / 1000)}k</span>
              <span style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 700 }}>KG TOTAL</span>
            </div>
            <p style={{ fontSize: '11px', color: '#5a5a5a', marginTop: '4px' }}>
              {workoutSummary?.sessions || 0} sessions • {workoutSummary?.lastSessionDate ? `Last: ${new Date(workoutSummary.lastSessionDate).toLocaleDateString()}` : 'No sessions yet'}
            </p>
          </div>

          {/* ── Supplements Checklist ── */}
          {supps.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={S.label}>Supplements</p>
                  <button onClick={() => router.push('/supplements')} style={{ background: 'rgba(212,255,0,0.1)', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                     <Plus size={14} color="#d4ff00" />
                     <span style={{ fontSize: '10px', fontWeight: 900, color: '#d4ff00' }}>ADD</span>
                  </button>
               </div>
               <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {supps.map(s => {
                    const taken = suppLogs[s.id]
                    return (
                      <button key={s.id} onClick={() => toggleSupp(s.id)}
                        style={{ flexShrink: 0, padding: '12px 20px', borderRadius: '18px', background: taken ? 'rgba(212,255,0,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${taken ? 'rgba(212,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${taken ? '#d4ff00' : '#5a5a5a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: taken ? '#d4ff00' : 'transparent' }}>
                          {taken && <Check size={12} color="#030409" strokeWidth={4} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '13px', fontWeight: 800, color: taken ? 'white' : '#8a8a8a', lineHeight: 1.2 }}>{s.name}</span>
                           {s.dosage && <span style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 700 }}>{s.dosage}</span>}
                        </div>
                      </button>
                    )
                  })}
               </div>
            </div>
          )}

          {quickTemplates.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={S.label}>Templates</p>
                <button onClick={() => router.push('/templates')} style={{ background: 'transparent', border: 'none', fontSize: '11px', fontWeight: 900, color: '#d4ff00', cursor: 'pointer' }}>View All</button>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {quickTemplates.map(template => (
                  <button key={template.id} onClick={() => quickLogTemplate(template.id)} style={{ ...S.card, marginBottom: 0, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{template.template_name}</p>
                      <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '4px' }}>{template.description || 'Tap to log this meal fast'}</p>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(212,255,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Plus size={16} color="#d4ff00" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Progress Card ── */}
          <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={S.label}>Calories</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '42px', fontWeight: 900, color: 'white', letterSpacing: '-0.05em' }}>{Math.round(dashboard.calories.consumed)}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#8a8a8a' }}>{dashboard.calories.target ? `/ ${dashboard.calories.target}` : 'kcal'}</span>
              </div>
            </div>
            {dashboard.calories.target && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: (dashboard.calories.remaining ?? 0) < 0 ? '#ff2d55' : '#d4ff00' }}>
                  {Math.abs(Math.round(dashboard.calories.remaining ?? 0))}
                </div>
                <p style={{ ...S.label, marginBottom: 0 }}>{(dashboard.calories.remaining ?? 0) < 0 ? 'Over' : 'Left'}</p>
              </div>
            )}
          </div>

          {/* ── Water Tracker ── */}
          <div className="card-hover" style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--glow-blue)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                <Ring pct={dashboard.water.percent || 0} color="#00d9ff" size={56} stroke={4} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={18} color="#00d9ff" />
                </div>
              </div>
              <div>
                <p style={S.label}>WATER GOAL</p>
                <p style={{ fontSize: '20px', fontWeight: 900 }}>
                  {dashboard.water.consumed} <span style={{ fontSize: '11px', color: '#8a8a8a', fontWeight: 600 }}>/ {dashboard.water.target || 2000}ml</span>
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleWater(-250)} style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={18} /></button>
              <button onClick={() => handleWater(250)} style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(0,217,255,0.15)', border: '1px solid rgba(0,217,255,0.2)', color: '#00d9ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', fontWeight: 900, boxShadow: '0 4px 15px rgba(0,217,255,0.2)' }}>+250</button>
            </div>
          </div>

          {/* ── Recent Meals ── */}
          {recentMeals.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <p style={S.label}>Recent Logs</p>
                <button onClick={() => router.push('/log')} style={{ background: 'transparent', border: 'none', fontSize: '11px', fontWeight: 900, color: '#d4ff00', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>View All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentMeals.map(m => (
                  <div key={m.id} className="card-hover" style={{ ...S.card, padding: '16px 20px', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.meal_name}</span>
                        <p style={{ fontSize: '11px', color: '#8a8a8a' }}>{Math.round(m.calories)} kcal</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#d4ff00' }}>{Math.round(m.protein_g)}g</span>
                        <p style={{ fontSize: '9px', color: '#8a8a8a' }}>PRO</p>
                      </div>
                    </div>
                    {m.items && m.items.length > 0 ? (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)', marginBottom: '10px' }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {m.items.map((item: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                               <span style={{ fontSize: '10px', fontWeight: 800, color: 'white' }}>{item.name}</span>
                               <span style={{ fontSize: '9px', fontWeight: 600, color: '#5a5a5a' }}>{Math.round(item.calories)}<span style={{ fontSize: '7px' }}>kcal</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : m.meal_name.toLowerCase().includes('composite') && m.entry_text_raw && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)', marginBottom: '10px' }} />
                        <p style={{ fontSize: '11px', color: '#5a5a5a', fontStyle: 'italic', fontWeight: 600 }}>{m.entry_text_raw}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Coach ── */}
          <div className="card-hover" style={{ ...S.card, background: 'linear-gradient(135deg, rgba(212,255,0,0.05) 0%, rgba(3,4,9,0) 100%)', border: '1px solid rgba(212,255,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={18} color="#d4ff00" style={{ filter: 'drop-shadow(0 0 5px #d4ff00)' }} />
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#d4ff00' }}>DAY SUMMARY</p>
              </div>
              <button onClick={handleReview} disabled={generatingReview} style={{ background: '#d4ff00', color: '#030409', border: 'none', borderRadius: '12px', padding: '10px 18px', fontSize: '11px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,255,0,0.3)' }}>
                {generatingReview ? <Loader2 size={12} className="animate-spin" /> : 'Get Summary'}
              </button>
            </div>
            {review ? <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#e0e0e0' }}>{review.summary}</p> : <p style={{ fontSize: '12px', color: '#8a8a8a' }}>Log your meals to see a daily summary.</p>}
          </div>
        </>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ color: '#ff2d55', fontWeight: 800 }}>{error}</p></div>
      ) : null}

      {/* FAB */}
      <button onClick={() => setShowAdd(true)} style={{ position: 'fixed', bottom: 'calc(104px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: '64px', height: '64px', borderRadius: '20px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px rgba(212,255,0,0.4)', zIndex: 100 }}><Plus size={32} strokeWidth={3} /></button>

      {showAdd && <QuickAddModal token={token} initialDate={selectedDate} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(token, selectedDate) }} />}
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#030409' }} />}><DashboardContent /></Suspense>
}
