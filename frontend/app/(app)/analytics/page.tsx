'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Flame, Dumbbell, CalendarDays, Activity, TrendingUp, Award, Zap } from 'lucide-react'

const S = {
  page: { maxWidth: '540px', margin: '0 auto', padding: '28px 20px 120px' } as React.CSSProperties,
  card: { background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '20px' } as React.CSSProperties,
  label: { fontSize: '11px', fontWeight: 900 as const, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.14em' },
  big: { fontSize: '32px', fontWeight: 800 as const, color: '#0a0e27', letterSpacing: '-0.04em', lineHeight: 1 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } as React.CSSProperties,
  sectionTitle: { fontSize: '11px', fontWeight: 900 as const, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginBottom: '10px' } as React.CSSProperties,
}

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff', borderRadius: '10px',
  border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  fontSize: '12px', fontWeight: 700
}

export default function AnalyticsPage() {
  const [weekly, setWeekly] = useState<any>(null)
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState('')

  const loadData = useCallback(async (tok: string) => {
    try {
      setLoading(true)
      setError(null)
      const [wRes, tRes] = await Promise.all([
        api.getWeeklyAnalytics(tok),
        api.getAnalyticsTrends(30, tok),
      ])
      setWeekly(wRes)
      if (tRes?.dates) {
        setTrends(tRes.dates.map((date: string, i: number) => ({
          date: date.substring(5),
          calories: Math.round(tRes.calories?.[i] ?? 0),
          protein: Math.round(tRes.protein?.[i] ?? 0),
          adherence: Math.round(tRes.adherence?.[i] ?? 0),
        })))
      }
    } catch (e) { 
      console.error(e) 
      setError('Communication with server failed')
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        loadData(session.access_token)
      }
    })
  }, [loadData])

  // Derived stats
  const bestCalDay = trends.reduce((best, d) => d.calories > (best?.calories ?? 0) ? d : best, null as any)
  const bestProtDay = trends.reduce((best, d) => d.protein > (best?.protein ?? 0) ? d : best, null as any)
  const avgCal30 = trends.length ? Math.round(trends.reduce((s, d) => s + d.calories, 0) / trends.length) : 0
  const avgProt30 = trends.length ? Math.round(trends.reduce((s, d) => s + d.protein, 0) / trends.length) : 0

  // Macro split pie
  const macroSplit = weekly ? [
    { name: 'Protein', value: Math.round(weekly.avg_protein_g * 4), color: '#d4ff00' },
    { name: 'Carbs',   value: Math.round((weekly.avg_calories - weekly.avg_protein_g * 4 - weekly.avg_fat_g * 9) || 0), color: '#00d9ff' },
    { name: 'Fat',     value: Math.round(weekly.avg_fat_g * 9), color: '#ff2d55' },
  ].filter(m => m.value > 0) : []

  // Weekday averages from trends
  const byDay: Record<string, number[]> = {}
  trends.forEach(d => {
    const [m, day] = d.date.split('-')
    const wd = new Date(`2024-${m}-${day}`).toLocaleDateString('en-US', { weekday: 'short' })
    if (!byDay[wd]) byDay[wd] = []
    byDay[wd].push(d.calories)
  })
  const weekdayData = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(wd => ({
    day: wd,
    avg: byDay[wd] ? Math.round(byDay[wd].reduce((a,b) => a+b,0) / byDay[wd].length) : 0,
  }))

  if (loading) {
    return (
      <div style={S.page}>
        {[1,2,3].map(i => (
          <div key={i} style={{ ...S.card, height: i === 1 ? 200 : 140, marginBottom: '12px', opacity: 0.5 }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.1)', borderRadius: '16px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📡</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#ff2d55' }}>Signal Lost</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => loadData(token)}
            style={{ 
              background: '#0a0e27', color: 'white', border: 'none', padding: '10px 20px', 
              borderRadius: '10px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' 
            }}
          >
            Reconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em' }}>Performance</h1>
        <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>last 30 days ✨</p>
      </div>

      {/* ── Weekly Stats Grid ── */}
      {weekly && (
        <>
          <p style={S.sectionTitle}>Weekly Averages</p>
          <div style={{ ...S.grid2, marginBottom: '12px' }}>
            {[
              { icon: Flame,       label: 'Avg Energy',    val: `${Math.round(weekly.avg_calories || 0)}`, unit: 'kcal', color: '#00d9ff', background: 'rgba(0,217,255,0.08)' },
              { icon: Dumbbell,    label: 'Avg Protein',   val: `${Math.round(weekly.avg_protein_g || 0)}`, unit: 'g', color: '#d4ff00', background: 'rgba(212,255,0,0.12)' },
              { icon: Activity,    label: 'Adherence',     val: `${weekly.adherence_avg ? Math.round(weekly.adherence_avg) : '--'}`, unit: '%', color: '#ff2d55', background: 'rgba(255,45,85,0.08)' },
              { icon: CalendarDays,label: 'Streak',        val: `${weekly.logging_streak_days}`, unit: 'days', color: '#0a0e27', background: '#fafafa' },
            ].map(({ icon: Icon, label, val, unit, color, background }) => (
              <div key={label} style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 12px', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: background, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={S.big}>{val}</span>
                  <span style={{ fontSize: '12px', color: '#8a8a8a' }}>{unit}</span>
                </div>
                <p style={{ ...S.label, marginTop: '4px' }}>{label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Personal Bests ── */}
      {trends.length > 0 && (
        <>
          <p style={S.sectionTitle}>Personal Records</p>
          <div style={{ ...S.grid2, marginBottom: '12px' }}>
            <div style={{ ...S.card, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Award size={14} color="#d4ff00" fill="#d4ff00" />
                <span style={S.label}>Best Protein Day</span>
              </div>
              <span style={{ ...S.big, fontSize: '26px', color: '#d4ff00' }}>{bestProtDay?.protein ?? '--'}g</span>
              <p style={{ fontSize: '10px', color: '#8a8a8a', marginTop: '4px' }}>{bestProtDay?.date}</p>
            </div>
            <div style={{ ...S.card, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Zap size={14} color="#00d9ff" fill="#00d9ff" />
                <span style={S.label}>Best Energy Day</span>
              </div>
              <span style={{ ...S.big, fontSize: '26px', color: '#00d9ff' }}>{bestCalDay?.calories ?? '--'}</span>
              <p style={{ fontSize: '10px', color: '#8a8a8a', marginTop: '4px' }}>{bestCalDay?.date} kcal</p>
            </div>
            <div style={{ ...S.card, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <TrendingUp size={14} color="#8a8a8a" />
                <span style={S.label}>30-Day Avg Cal</span>
              </div>
              <span style={{ ...S.big, fontSize: '26px' }}>{avgCal30}</span>
              <p style={{ fontSize: '10px', color: '#8a8a8a', marginTop: '4px' }}>kcal / day</p>
            </div>
            <div style={{ ...S.card, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Dumbbell size={14} color="#8a8a8a" />
                <span style={S.label}>30-Day Avg Protein</span>
              </div>
              <span style={{ ...S.big, fontSize: '26px' }}>{avgProt30}</span>
              <p style={{ fontSize: '10px', color: '#8a8a8a', marginTop: '4px' }}>g / day</p>
            </div>
          </div>
        </>
      )}

      {/* ── Consistency Heatmap (28 Days) ── */}
      {trends.length > 0 && (() => {
        const last28 = [...trends].slice(-28)
        return (
          <>
            <p style={S.sectionTitle}>Consistency Heartbeat (28d)</p>
            <div style={{ ...S.card, marginBottom: '24px', padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {last28.map((d, i) => {
                  const score = d.adherence ?? 0
                  const color = score >= 90 ? '#d4ff00' : score >= 70 ? '#00d9ff' : score >= 40 ? '#ff2d55' : '#f0f0f0'
                  return (
                    <div key={i} title={`${d.date}: ${score}%`} style={{ 
                      aspectRatio: '1', borderRadius: '4px', background: color, 
                      transition: 'all 0.3s ease', opacity: score === 0 && d.calories === 0 ? 0.2 : 1 
                    }} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#8a8a8a' }}>28 DAYS AGO</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#8a8a8a' }}>TODAY</span>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Macro Strategy Mix ── */}
      {macroSplit.length > 0 && (
        <>
          <p style={S.sectionTitle}>Macro Strategy Split</p>
          <div style={{ ...S.card, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' as const }}>
            <div style={{ width: '140px', height: '140px', position: 'relative', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie data={macroSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                    paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {macroSplit.map((m, i) => <Cell key={i} fill={m.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v} kcal`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Activity size={20} color="#0a0e27" />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {macroSplit.map(m => {
                const total = macroSplit.reduce((s, x) => s + x.value, 0)
                const pct = total > 0 ? Math.round((m.value / total) * 100) : 0
                return (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: m.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#0a0e27', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#0a0e27' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '3px', background: '#f0f0f0', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: '99px' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── 30-Day Trends (Consolidated) ── */}
      {trends.length > 0 && (
        <>
          <p style={S.sectionTitle}>Adherence & Energy (30D)</p>
          <div style={{ ...S.card, height: 260, marginBottom: '12px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={trends} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#8a8a8a', fontSize: 9, fontWeight: 700 }} tickLine={false} axisLine={false} minTickGap={20} dy={8} />
                <YAxis tick={{ fill: '#8a8a8a', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#fafafa' }} />
                <Bar dataKey="calories" name="Energy" fill="#00d9ff" radius={[4,4,0,0]} maxBarSize={12} />
                <Bar dataKey="adherence" name="Score" fill="#ff2d55" radius={[4,4,0,0]} maxBarSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
