'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Flame, Dumbbell, CalendarDays, Activity, TrendingUp, Award, Zap } from 'lucide-react'

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
    container: { maxWidth: '540px', margin: '0 auto', padding: '40px 20px 120px', minHeight: '100dvh', background: '#0a0e27', color: 'white' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px', marginLeft: '4px' } as React.CSSProperties
  }

  const TOOLTIP_STYLE = { backgroundColor: '#0a0e27', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', fontWeight: 800, color: 'white' }

  if (loading) return (
    <div style={S.container}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '32px' }}>Analytics</h1>
      {[1, 2, 3].map(i => <div key={i} style={{ ...S.card, height: 200, opacity: 0.3 }} />)}
    </div>
  )

  if (!weekly) return null

  // Process data for charts
  const macroData = [
    { name: 'Protein', value: weekly.avg_protein_g * 4, color: '#d4ff00' },
    { name: 'Carbs', value: weekly.avg_carbs_g * 4, color: '#00d9ff' },
    { name: 'Fat', value: weekly.avg_fat_g * 9, color: '#ffffff' }
  ]

  const dayData = Object.entries(weekly.daily_total_calories || {}).map(([date, val]) => ({
    date: date.substring(5),
    calories: val
  })).reverse()

  return (
    <div style={S.container}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em' }}>Market Intel</h1>
        <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>weekly bio-performance audit ✨</p>
      </div>

      {/* ── Core High-Level Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {[
          { icon: Flame,       label: 'Avg Energy',    val: `${Math.round(weekly.avg_calories || 0)}`,  unit: 'KCAL', color: '#00d9ff', background: 'rgba(0,217,255,0.08)' },
          { icon: Dumbbell,    label: 'Avg Protein',   val: `${Math.round(weekly.avg_protein_g || 0)}`, unit: 'G',    color: '#d4ff00', background: 'rgba(212,255,0,0.08)' },
          { icon: CalendarDays, label: 'Cycle Days',    val: `${weekly.total_days || 0}`,              unit: 'DAYS', color: 'white',   background: 'rgba(255,255,255,0.05)' },
          { icon: Activity,    label: 'Entry Velocity',val: `${weekly.total_meal_entries || 0}`,       unit: 'LOGS', color: 'white',   background: 'rgba(255,255,255,0.05)' },
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

      {/* ── Daily Trajectory (Bar Chart) ── */}
      <p style={S.label}>Energy Deployment Trajectory</p>
      <div style={{ ...S.card, height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dayData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#8a8a8a', fontSize: 10, fontWeight: 800 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8a8a8a', fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="calories" fill="#00d9ff" radius={[6, 6, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        
        {/* ── Nutrient Matrix (Pie Chart) ── */}
        <div style={{ ...S.card, height: 320 }}>
          <p style={S.label}>Macronutrient Matrix</p>
          <div style={{ height: '220px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={macroData} innerRadius={60} outerRadius={85} paddingAngle={8} 
                  dataKey="value" stroke="none" strokeWidth={0}
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Stat */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', letterSpacing: '0.1em' }}>AVG</p>
              <p style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{Math.round(weekly.avg_calories)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
             {macroData.map(m => (
               <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: m.color }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#8a8a8a' }}>{m.name.toUpperCase()}</span>
               </div>
             ))}
          </div>
        </div>

        {/* ── System Consistency ── */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(212,255,0,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={24} color="#d4ff00" />
            </div>
            <div>
              <p style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>System Reliability</p>
              <p style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 600 }}>Operational consistency audit</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             {[
               { icon: Zap, label: 'Tracking Frequency', score: 'HIGH', desc: 'Consistent data intake detected' },
               { icon: TrendingUp, label: 'Growth Vector', score: 'STABLE', desc: 'Maintained fueling protocol' }
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
    </div>
  )
}
