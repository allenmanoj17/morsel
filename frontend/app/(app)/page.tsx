'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Plus, Loader2, Check, Zap, TrendingUp, ChevronRight, ChevronLeft, Droplets, Minus } from 'lucide-react'
import QuickAddModal from '@/components/QuickAddModal'

// ── Helpers ──
function offsetDate(base: string, delta: number) {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

function friendlyDate(iso: string) {
  const t = new Date().toISOString().split('T')[0]
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
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
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
  const searchParams = useSearchParams()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)

  const [review, setReview] = useState<any>(null)
  const [generatingReview, setGeneratingReview] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [recentMeals, setRecentMeals] = useState<any[]>([])
  const [waterTotal, setWaterTotal] = useState(0)

  const load = useCallback(async (tok: string, date: string) => {
    try {
      setLoading(true)
      setError(null)
      const [data, meals, water] = await Promise.all([
        api.getDailyDashboard(date, tok),
        api.getMeals(date, tok),
        api.getWaterLogs(date, tok).catch(() => []),
      ])
      setDashboard(data)
      setRecentMeals(meals.slice(0, 3))
      setWaterTotal(data.water.consumed)
      setReview(null)
    } catch (e: any) {
      console.error('DASHBOARD_LOAD_ERROR:', e)
      if (e.message?.includes('404')) router.push('/onboarding')
      setError('Connection dropped. Is the server running?')
    }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        load(session.access_token, selectedDate)

        const metaName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name
        setDisplayName(metaName || session.user.email?.split('@')[0] || '')
      } else { router.push('/login') }
    })
  }, [load, selectedDate, router])

  const handleWater = async (amt: number) => {
    try {
      const res = await api.logWater({ date: selectedDate, amount_ml: amt }, token)
      setWaterTotal(res.amount_ml)
    } catch { }
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
  const h = new Date().getHours()

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  const isToday = selectedDate === today

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
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <button onClick={() => setSelectedDate(offsetDate(selectedDate, -1))} style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
              <ChevronLeft size={14} color="white" />
            </button>
            <p style={{ ...S.label, marginBottom: 0, fontSize: '11px', color: 'white' }}>{friendlyDate(selectedDate)}</p>
            <button onClick={() => setSelectedDate(offsetDate(selectedDate, 1))} disabled={isToday}
              style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: 'none', cursor: isToday ? 'not-allowed' : 'pointer', opacity: isToday ? 0.2 : 1 }}>
              <ChevronRight size={14} color="white" />
            </button>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginTop: '12px' }}>
            <span style={{ color: '#d4ff00' }}>{greeting}</span>{displayName ? `, ${displayName.split(' ')[0]}` : ''} ✨
          </h1>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ ...S.card, height: '100px', opacity: 0.3 }} />)}
        </div>
      ) : dashboard ? (
        <>
          {/* ── Macros ── */}
          <div style={{ ...S.card, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '24px 16px' }}>
            <MacroRing label="Cals" value={dashboard.calories.consumed} target={dashboard.calories.target} percent={dashboard.calories.percent} color="#00d9ff" unit="" />
            <MacroRing label="Prot" value={dashboard.protein.consumed} target={dashboard.protein.target} percent={dashboard.protein.percent} color="#d4ff00" unit="g" />
            <MacroRing label="Carb" value={dashboard.carbs.consumed} target={dashboard.carbs.target} percent={dashboard.carbs.percent} color="#ff2d55" unit="g" />
            <MacroRing label="Fat" value={dashboard.fat.consumed} target={dashboard.fat.target} percent={dashboard.fat.percent} color="#8a8a8a" unit="g" />
          </div>

          {/* ── Progress Card ── */}
          <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={S.label}>Daily Intake</p>
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
          <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--glow-blue)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                <Ring pct={dashboard.water.percent || 0} color="#00d9ff" size={56} stroke={4} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={18} color="#00d9ff" />
                </div>
              </div>
              <div>
                <p style={S.label}>Hydration Progress</p>
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
                  <div key={m.id} style={{ ...S.card, padding: '16px 20px', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}><span style={{ fontSize: '15px', fontWeight: 700, display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.meal_name}</span><p style={{ fontSize: '11px', color: '#8a8a8a' }}>{Math.round(m.calories)} kcal</p></div>
                    <div style={{ textAlign: 'right' }}><span style={{ fontSize: '14px', fontWeight: 900, color: '#d4ff00' }}>{Math.round(m.protein_g)}g</span><p style={{ fontSize: '9px', color: '#8a8a8a' }}>PRO</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Coach ── */}
          <div style={{ ...S.card, background: 'linear-gradient(135deg, rgba(212,255,0,0.05) 0%, rgba(3,4,9,0) 100%)', border: '1px solid rgba(212,255,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={18} color="#d4ff00" style={{ filter: 'drop-shadow(0 0 5px #d4ff00)' }} />
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#d4ff00' }}>Coach</p>
              </div>
              <button onClick={handleReview} disabled={generatingReview} style={{ background: '#d4ff00', color: '#030409', border: 'none', borderRadius: '12px', padding: '10px 18px', fontSize: '11px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,255,0,0.3)' }}>
                {generatingReview ? <Loader2 size={12} className="animate-spin" /> : 'Get Analysis'}
              </button>
            </div>
            {review ? <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#e0e0e0' }}>{review.summary}</p> : <p style={{ fontSize: '12px', color: '#8a8a8a' }}>Log your meals for a personalized daily summary.</p>}
          </div>
        </>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ color: '#ff2d55', fontWeight: 800 }}>{error}</p></div>
      ) : null}

      {/* FAB */}
      <button onClick={() => setShowAdd(true)} style={{ position: 'fixed', bottom: '92px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '60px', borderRadius: '18px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(212,255,0,0.3)', zIndex: 50 }}><Plus size={28} strokeWidth={3} /></button>

      {showAdd && <QuickAddModal token={token} initialDate={selectedDate} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(token, selectedDate) }} />}
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#030409' }} />}><DashboardContent /></Suspense>
}
