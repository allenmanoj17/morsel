'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Plus, Loader2, Check, Zap, TrendingUp, ChevronRight, ChevronLeft } from 'lucide-react'
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
  carbs: MacroProgress; fat: MacroProgress
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
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
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

function StreakBars({ days }: { days: { date: string; score: number | null }[] }) {
  if (!days || days.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '28px' }}>
      {days.map((d, i) => {
        const h = d.score !== null ? Math.max(6, (d.score / 100) * 28) : 4
        const bg = d.score === null ? 'rgba(255,255,255,0.05)' : d.score >= 80 ? '#d4ff00' : d.score >= 50 ? '#00d9ff' : '#ff2d55'
        return (
          <div key={i} style={{
            width: '8px', height: `${h}px`,
            background: bg, borderRadius: '3px',
            transition: 'all 0.4s ease', alignSelf: 'flex-end'
          }} title={d.date} />
        )
      })}
    </div>
  )
}

// ── Main Page ──
export default function DashboardPage() {
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
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([])

  const load = useCallback(async (tok: string, date: string) => {
    try {
      setLoading(true)
      setError(null)
      const [data, meals] = await Promise.all([
        api.getDailyDashboard(date, tok),
        api.getMeals(date, tok),
      ])
      setDashboard(data)
      setRecentMeals(meals.slice(0, 3))
      setReview(null)

      const tRes = await api.getAnalyticsTrends(7, tok)
      if (tRes?.dates) {
        setWeeklyTrends(tRes.dates.map((date: string, i: number) => ({
          date, score: tRes.adherence?.[i] ?? null
        })))
      }
    } catch (e) { 
      console.error(e) 
      setError('Connection dropped. Is the backend running?')
    }
    finally { setLoading(false) }
  }, [today])

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      router.replace(`/auth/callback?code=${code}`)
      return
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        load(session.access_token, selectedDate)
        
        const metaName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name
        const emailPrefix = session.user.email?.split('@')[0]
        setDisplayName(metaName || emailPrefix || '')

        api.getOnboarding(session.access_token)
          .then((d: any) => {
            if (d?.display_name) setDisplayName(d.display_name)
          })
          .catch(() => {})
      }
    })
  }, [load, searchParams, router, selectedDate])

  const handleReview = async () => {
    setGeneratingReview(true)
    try {
      const res = await api.generateEODReview(selectedDate, token)
      setReview(res)
    } catch (e: any) { 
      console.error(e)
      alert(e.message === 'API error' 
        ? 'Could not reach AI Coach.' 
        : `Analysis Error: ${e.message}`) 
    }
    finally { setGeneratingReview(false) }
  }

  const h = new Date().getHours()
  const greeting = h < 12 ? 'gm' : h < 17 ? 'hey' : 'good night'
  const score = dashboard?.adherence_score ?? null
  const scoreColor = score === null ? 'rgba(255,255,255,0.05)' : score >= 80 ? '#d4ff00' : score >= 50 ? '#00d9ff' : '#ff2d55'
  const isToday = selectedDate === today

  const changeDate = (delta: number) => {
    const next = offsetDate(selectedDate, delta)
    setSelectedDate(next)
  }

  // Obsidian Theme Styles
  const S = {
    container: { maxWidth: '540px', margin: '0 auto', padding: '40px 20px 120px', minHeight: '100dvh', background: '#0a0e27', color: 'white' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '8px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
             <button onClick={() => changeDate(-1)} style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
               <ChevronLeft size={16} color="#8a8a8a" />
             </button>
             <p style={S.label}>{friendlyDate(selectedDate)}</p>
             <button onClick={() => changeDate(1)} disabled={isToday} style={{ padding: '4px', background: 'transparent', border: 'none', cursor: isToday ? 'not-allowed' : 'pointer', opacity: isToday ? 0.2 : 1 }}>
               <ChevronRight size={16} color="#8a8a8a" />
             </button>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {greeting}{displayName ? `, ${displayName.split(' ')[0]}` : ''} ✨
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            {score !== null && (
              <div style={{
                background: scoreColor, color: '#0a0e27', borderRadius: '8px',
                padding: '6px 12px', fontSize: '11px', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}>
                <TrendingUp size={12} />
                {Math.round(score)}% today
              </div>
            )}
            <StreakBars days={weeklyTrends} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ ...S.card, height: '100px', opacity: 0.3 }} />
          ))}
        </div>
      ) : dashboard ? (
        <>
          {/* ── Macro Dashboard ── */}
          <div style={{ ...S.card, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '24px 16px' }}>
            <MacroRing label="Cals" value={dashboard.calories.consumed} target={dashboard.calories.target} percent={dashboard.calories.percent} color="#00d9ff" unit="" />
            <MacroRing label="Pro"  value={dashboard.protein.consumed}  target={dashboard.protein.target}  percent={dashboard.protein.percent}  color="#d4ff00" unit="g" />
            <MacroRing label="Cho"  value={dashboard.carbs.consumed}    target={dashboard.carbs.target}    percent={dashboard.carbs.percent}    color="#ff2d55" unit="g" />
            <MacroRing label="Fat"  value={dashboard.fat.consumed}      target={dashboard.fat.target}      percent={dashboard.fat.percent}      color="#8a8a8a" unit="g" />
          </div>

          {/* ── Energy Detail ── */}
          <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={S.label}>Energy Pipeline</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '48px', fontWeight: 900, color: 'white', letterSpacing: '-0.05em', lineHeight: 1 }}>
                  {Math.round(dashboard.calories.consumed)}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#8a8a8a' }}>
                  {dashboard.calories.target ? `/ ${dashboard.calories.target} k` : 'kcal'}
                </span>
              </div>
            </div>
            {dashboard.calories.target && (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '28px', fontWeight: 900,
                  color: (dashboard.calories.remaining ?? 0) < 0 ? '#ff2d55' : '#d4ff00'
                }}>
                  {dashboard.calories.remaining !== null ? Math.abs(Math.round(dashboard.calories.remaining)) : '--'}
                </div>
                <p style={{ ...S.label, marginBottom: 0 }}>{(dashboard.calories.remaining ?? 0) < 0 ? 'Surplus' : 'Remaining'}</p>
              </div>
            )}
          </div>

          {/* ── Meal History ── */}
          {recentMeals.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '0 4px' }}>
                <p style={S.label}>Recent Logs ({dashboard.entry_count})</p>
                <a href="/log" style={{ fontSize: '11px', fontWeight: 900, color: '#00d9ff', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.1em' }}>View All</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentMeals.map(m => (
                  <div key={m.id} style={{ ...S.card, padding: '18px 24px', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                       <span style={{ fontSize: '15px', fontWeight: 700, color: 'white', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.meal_name}</span>
                       <span style={{ fontSize: '11px', color: '#8a8a8a', fontWeight: 600 }}>Decoded: {Math.round(m.calories)} kcal</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                       <div style={{ textAlign: 'right' }}><span style={{ fontSize: '14px', fontWeight: 900, color: '#d4ff00' }}>{Math.round(m.protein_g)}g</span><p style={{ fontSize: '9px', fontWeight: 800, color: '#8a8a8a' }}>P</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI Coach ── */}
          <div style={{ ...S.card }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(212,255,0,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={20} color="#d4ff00" />
                </div>
                <div>
                   <p style={{ fontSize: '14px', fontWeight: 800 }}>AI Coach Analysis</p>
                   <p style={{ fontSize: '10px', color: '#8a8a8a' }}>End-of-day bio-check</p>
                </div>
              </div>
              <button
                onClick={handleReview} disabled={generatingReview}
                style={{
                  background: '#d4ff00', color: '#0a0e27', border: 'none', borderRadius: '10px',
                  padding: '10px 18px', fontSize: '11px', fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                  opacity: generatingReview ? 0.6 : 1,
                }}
              >
                {generatingReview ? <Loader2 size={14} className="animate-spin" /> : 'Run Check ✨'}
              </button>
            </div>
            {review ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'white', opacity: 0.9 }}>"{review.summary}"</p>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#8a8a8a', fontStyle: 'italic' }}>Analysis available after logging fuel.</p>
            )}
          </div>
        </>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,45,85,0.05)', borderRadius: '24px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📡</p>
          <p style={{ fontSize: '18px', fontWeight: 800, color: '#ff2d55' }}>Signal Lost</p>
          <p style={{ fontSize: '13px', opacity: 0.6, marginTop: '8px', marginBottom: '24px' }}>{error}</p>
          <button onClick={() => load(token, selectedDate)} style={{ background: 'white', color: '#0a0e27', border: 'none', padding: '12px 24px', borderRadius: '14px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>Reconnect</button>
        </div>
      ) : (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '40px', marginBottom: '16px' }}>🍽️</p>
          <p style={{ fontSize: '16px', fontWeight: 800 }}>System Silent</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>Tap + to initialize payload log</p>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)',
          width: '64px', height: '64px', borderRadius: '20px',
          background: '#d4ff00', color: '#0a0e27', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(212,255,0,0.4)',
          zIndex: 50,
        }}
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {showAdd && (
        <QuickAddModal
          token={token}
          initialDate={selectedDate}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(token, selectedDate) }}
        />
      )}
    </div>
  )
}
