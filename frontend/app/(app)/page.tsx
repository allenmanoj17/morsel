'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Plus, Loader2, Check, Zap, TrendingUp, ChevronRight, ChevronLeft } from 'lucide-react'
import QuickAddModal from '@/components/QuickAddModal'

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

// SVG Circular Progress Ring
function Ring({ pct, color, size = 72, stroke = 6, children }: {
  pct: number; color: string; size?: number; stroke?: number; children?: React.ReactNode
}) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const filled = Math.min(pct, 100)
  const dash = (filled / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
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
            : <span style={{ fontSize: '14px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em' }}>
                {Math.round(value)}
              </span>
          }
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
        {target && (
          <p style={{ fontSize: '9px', color: '#8a8a8a', marginTop: '1px' }}>/ {target}{unit}</p>
        )}
      </div>
    </div>
  )
}

// 7-day adherence mini bar
function StreakBars({ days }: { days: { date: string; score: number | null }[] }) {
  if (!days || days.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '28px' }}>
      {days.map((d, i) => {
        const h = d.score !== null ? Math.max(6, (d.score / 100) * 28) : 4
        const bg = d.score === null ? '#f0f0f0' : d.score >= 80 ? '#d4ff00' : d.score >= 50 ? '#00d9ff' : '#ff2d55'
        return (
          <div key={i} style={{
            width: '8px', height: `${h}px`,
            background: bg, borderRadius: '3px',
            transition: 'height 0.4s ease', alignSelf: 'flex-end'
          }} title={d.date} />
        )
      })}
    </div>
  )
}

import { useRouter, useSearchParams } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  
  // Safety net for PKCE codes landing on the home page
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      router.replace(`/auth/callback?code=${code}`)
    }
  }, [searchParams, router])
  
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
      setReview(null) // Reset review when date changes

      // Also grab trends for streak bars
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
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        load(session.access_token, selectedDate)
        
        // Initial fallback from session
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
  }, [load])

  const handleReview = async () => {
    setGeneratingReview(true)
    try {
      const res = await api.generateEODReview(selectedDate, token)
      setReview(res)
    } catch (e: any) { 
      console.error(e)
      alert(e.message === 'API error' 
        ? 'Could not reach AI Coach. Check your backend/internet.' 
        : `Analysis Error: ${e.message}`) 
    }
    finally { setGeneratingReview(false) }
  }

  const h = new Date().getHours()
  const greeting = h < 12 ? 'gm' : h < 17 ? 'hey' : 'good night'
  const score = dashboard?.adherence_score ?? null
  const scoreColor = score === null ? '#f0f0f0' : score >= 80 ? '#d4ff00' : score >= 50 ? '#00d9ff' : '#ff2d55'
  const isToday = selectedDate === today

  const changeDate = (delta: number) => {
    const next = offsetDate(selectedDate, delta)
    setSelectedDate(next)
  }

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', padding: '28px 20px 120px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
             <button onClick={() => changeDate(-1)} style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
               <ChevronLeft size={16} color="#8a8a8a" />
             </button>
             <p style={{ fontSize: '11px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
               {friendlyDate(selectedDate)}
             </p>
             <button onClick={() => changeDate(1)} disabled={isToday} style={{ padding: '2px', border: 'none', background: 'transparent', cursor: isToday ? 'not-allowed' : 'pointer', opacity: isToday ? 0.3 : 1 }}>
               <ChevronRight size={16} color="#8a8a8a" />
             </button>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em', marginTop: '2px' }}>
            {greeting}{displayName ? `, ${displayName.split(' ')[0]}` : ''} ✨
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            {score !== null && (
              <div style={{
                background: scoreColor, color: '#0a0e27', borderRadius: '6px',
                padding: '4px 10px', fontSize: '11px', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}>
                <TrendingUp size={10} />
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
            <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0', height: '80px', borderRadius: '14px', opacity: 0.6 }} />
          ))}
        </div>
      ) : dashboard ? (
        <>
          {/* ── Macro Rings ── */}
          <div style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            padding: '24px 20px', marginBottom: '12px',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px'
          }}>
            <MacroRing label="Calories" value={dashboard.calories.consumed} target={dashboard.calories.target} percent={dashboard.calories.percent} color="#00d9ff" unit="" />
            <MacroRing label="Protein"  value={dashboard.protein.consumed}  target={dashboard.protein.target}  percent={dashboard.protein.percent}  color="#d4ff00" unit="g" />
            <MacroRing label="Carbs"    value={dashboard.carbs.consumed}    target={dashboard.carbs.target}    percent={dashboard.carbs.percent}    color="#ff2d55" unit="g" />
            <MacroRing label="Fat"      value={dashboard.fat.consumed}      target={dashboard.fat.target}      percent={dashboard.fat.percent}      color="#8a8a8a" unit="g" />
          </div>

          {/* ── Calorie Big Number ── */}
          <div style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            padding: '20px 24px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Energy</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '40px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {Math.round(dashboard.calories.consumed)}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#8a8a8a' }}>
                  {dashboard.calories.target ? `/ ${dashboard.calories.target} kcal` : 'kcal'}
                </span>
              </div>
            </div>
            {dashboard.calories.target && (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '24px', fontWeight: 800,
                  color: dashboard.calories.remaining && dashboard.calories.remaining < 0 ? '#ff2d55' : '#0a0e27'
                }}>
                  {dashboard.calories.remaining !== null
                    ? `${Math.abs(Math.round(dashboard.calories.remaining))}`
                    : '--'}
                </div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {dashboard.calories.remaining !== null && dashboard.calories.remaining < 0 ? 'over' : 'remaining'}
                </p>
              </div>
            )}
          </div>

          {/* ── Protein bar ── */}
          <div style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            padding: '20px 24px', marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Protein</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#d4ff00', letterSpacing: '-0.02em' }}>
                  {Math.round(dashboard.protein.consumed)}g
                </span>
                {dashboard.protein.target && (
                  <span style={{ fontSize: '12px', color: '#8a8a8a' }}>/ {dashboard.protein.target}g</span>
                )}
              </div>
            </div>
            {dashboard.protein.target && (
              <div style={{ height: '5px', background: '#f0f0f0', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, dashboard.protein.percent ?? 0)}%`,
                  background: (dashboard.protein.percent ?? 0) >= 100 ? '#d4ff00' : '#d4ff00',
                  borderRadius: '99px',
                  transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
            )}
          </div>

          {/* ── Recent Meals ── */}
          {recentMeals.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 2px' }}>
                <p style={{ fontSize: '11px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  Recent ({dashboard.entry_count})
                </p>
                <a href="/log" style={{ fontSize: '11px', fontWeight: 700, color: '#00d9ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  All <ChevronRight size={12} />
                </a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentMeals.map(m => (
                  <div key={m.id} style={{
                    background: 'white', border: '1px solid #f0f0f0', borderRadius: '12px',
                    padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a0e27', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
                      {m.meal_name}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#00d9ff' }}>{Math.round(m.calories)}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#d4ff00' }}>{Math.round(m.protein_g)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI Coach ── */}
          <div style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            padding: '20px', marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', background: '#d4ff00', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color="#0a0e27" fill="#0a0e27" />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#0a0e27' }}>AI Coach</p>
                  <p style={{ fontSize: '10px', color: '#8a8a8a', marginTop: '1px' }}>end-of-day review</p>
                </div>
              </div>
              <button
                onClick={handleReview} disabled={generatingReview}
                style={{
                  background: '#d4ff00', color: '#0a0e27', border: 'none', borderRadius: '8px',
                  padding: '8px 16px', fontSize: '11px', fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  opacity: generatingReview ? 0.6 : 1,
                }}
              >
                {generatingReview ? <Loader2 size={13} /> : 'Analyse ✨'}
              </button>
            </div>
            {review ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#0a0e27', fontStyle: 'italic', opacity: 0.85 }}>
                  "{review.summary}"
                </p>
                {review.anomalies?.length > 0 && (
                  <div style={{ background: 'rgba(255,45,85,0.05)', borderLeft: '3px solid #ff2d55', padding: '10px 12px', borderRadius: '0 8px 8px 0' }}>
                    <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ff2d55', marginBottom: '6px' }}>Alert</p>
                    {review.anomalies.map((a: string, i: number) => (
                      <p key={i} style={{ fontSize: '13px', color: '#0a0e27', opacity: 0.8, marginTop: '3px' }}>· {a}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#8a8a8a', fontStyle: 'italic' }}>
                Complete your log for a personalized review.
              </p>
            )}
          </div>
        </>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.1)', borderRadius: '16px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📡</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#ff2d55' }}>Signal Lost</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => load(token, selectedDate)}
            style={{ 
              background: '#0a0e27', color: 'white', border: 'none', padding: '10px 20px', 
              borderRadius: '10px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' 
            }}
          >
            Reconnect
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🍽️</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#0a0e27' }}>nothing logged yet</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>tap + to start your day</p>
        </div>
      )}

      {/* FAB */}
      <button
        id="quick-add-fab"
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)',
          width: '56px', height: '56px', borderRadius: '16px',
          background: '#d4ff00', color: '#0a0e27', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(212,255,0,0.5)',
          zIndex: 50, fontSize: '24px', fontWeight: 900,
        }}
      >
        <Plus size={24} strokeWidth={3} />
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
