'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { Flame, Dumbbell, CalendarDays, Activity, PieChart as PieIcon, Award, Zap } from 'lucide-react'

export default function AnalyticsPage() {
  const [weekly, setWeekly] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (tok: string) => {
    try { const data = await api.getWeeklyAnalytics(tok); setWeekly(data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) load(session.access_token)
    })
  }, [load])

  const S = {
    container: { maxWidth: '480px', margin: '0 auto', padding: '24px 20px 120px', minHeight: '100dvh', background: '#0a0e27', color: 'white' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px' } as React.CSSProperties
  }

  const TOOLTIP_STYLE = { backgroundColor: '#0a0e27', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', fontWeight: 800, color: 'white' }

  if (loading) return (
    <div style={S.container}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '32px' }}>Insights</h1>
      {[1, 2, 3].map(i => <div key={i} style={{ ...S.card, height: 200, opacity: 0.3 }} />)}
    </div>
  )

  if (!weekly) return null

  // Process data for Pie Chart
  const macroData = [
    { name: 'Protein', value: weekly.protein_pct || 0, color: '#d4ff00' },
    { name: 'Carbs', value: weekly.carbs_pct || 0, color: '#ff2d55' },
    { name: 'Fat', value: weekly.fat_pct || 0, color: '#00d9ff' }
  ].filter(m => m.value > 0)

  // Fallback if no data
  if (macroData.length === 0) {
    macroData.push({ name: 'No Data', value: 100, color: 'rgba(255,255,255,0.1)' })
  }

  return (
    <div style={S.container}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em' }}>Weekly Insights</h1>
        <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Your 7-day nutrition summary ✨</p>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {[
          { icon: Flame,    label: 'Avg Calories', val: Math.round(weekly.avg_calories || 0),  unit: 'KCAL', color: '#00d9ff', background: 'rgba(0,217,255,0.08)' },
          { icon: Dumbbell, label: 'Avg Protein',  val: Math.round(weekly.avg_protein_g || 0), unit: 'G',    color: '#d4ff00', background: 'rgba(212,255,0,0.08)' },
        ].map(st => (
          <div key={st.label} style={S.card}>
            <div style={{ width: '40px', height: '40px', background: st.background, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <st.icon size={20} color={st.color} />
            </div>
            <p style={S.label}>{st.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.04em' }}>{st.val}</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#8a8a8a' }}>{st.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Macro Split (Pie) ── */}
      <div style={{ ...S.card, height: 340 }}>
        <p style={S.label}>Weekly Balance</p>
        <div style={{ height: '220px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={macroData} innerRadius={65} outerRadius={90} paddingAngle={8} 
                dataKey="value" stroke="none" strokeWidth={0}
              >
                {macroData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
            <PieIcon size={20} color="#8a8a8a" style={{ marginBottom: '4px' }} />
            <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', letterSpacing: '0.1em' }}>SPLIT</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
           {macroData.map(m => (
             <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: m.color }} />
                <span style={{ fontSize: '10px', fontWeight: 900, color: 'white' }}>{m.name.toUpperCase()}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#8a8a8a' }}>{Math.round(m.value)}%</span>
             </div>
           ))}
        </div>
      </div>

      {/* ── Status ── */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', background: 'rgba(212,255,0,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={24} color="#d4ff00" />
          </div>
          <div>
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>Daily Streak</p>
            <p style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 600 }}>Consistent tracking is key</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           {[
             { icon: Zap, label: 'Logging Frequency', score: 'HIGH', desc: 'You have logged consistently this week.' },
             { icon: Activity, label: 'Goal Adherence', score: weekly.adherence_avg ? `${Math.round(weekly.adherence_avg)}%` : '...', desc: 'Closeness to your daily nutrition targets.' }
           ].map(r => (
             <div key={r.label} style={{ display: 'flex', gap: '16px' }}>
                <r.icon size={18} color="#8a8a8a" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <span style={{ fontSize: '14px', fontWeight: 800 }}>{r.label}</span>
                     <span style={{ fontSize: '9px', fontWeight: 900, background: '#d4ff00', color: '#0a0e27', padding: '2px 6px', borderRadius: '4px' }}>{r.score}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>{r.desc}</p>
                </div>
             </div>
           ))}
        </div>
      </div>

    </div>
  )
}
