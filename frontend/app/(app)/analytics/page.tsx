'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line
} from 'recharts'
import { Flame, Dumbbell, CalendarDays, Activity, PieChart as PieIcon, Award, Zap, Droplets, Scale } from 'lucide-react'

export default function AnalyticsPage() {
  const [weekly, setWeekly] = useState<any>(null)
  const [trends, setTrends] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  const load = useCallback(async (tok: string, currentDays: number) => {
    try { 
      setLoading(true)
      const [wData, tData, sData] = await Promise.all([
        api.getWeeklyAnalytics(tok),
        api.getAnalyticsTrends(currentDays, tok),
        api.getMealStats(currentDays, tok)
      ])
      setWeekly(wData)
      setTrends(tData)
      setStats(sData)
    }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) load(session.access_token, days)
    })
  }, [load, days])

  const S = {
    container: { width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px 20px 140px', minHeight: '100dvh', background: '#030409', color: 'white', boxSizing: 'border-box' } as React.CSSProperties,
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--card-radius)', padding: '24px', marginBottom: '16px', backdropFilter: 'blur(16px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px' } as React.CSSProperties,
    chartTitle: { fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' } as React.CSSProperties
  }

  const CHART_THEME = {
    tooltip: { backgroundColor: '#0a1128', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: 700, color: 'white' },
    grid: { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' }
  }

  if (loading && !weekly) return (
    <div style={S.container}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '32px' }}>Insights</h1>
      {[1, 2, 3].map(i => <div key={i} style={{ ...S.card, height: 200, opacity: 0.3 }} />)}
    </div>
  )

  if (!weekly || !trends) return null

  const macroData = [
    { name: 'Protein', value: weekly.protein_pct || 0, color: '#d4ff00' },
    { name: 'Carbs', value: weekly.carbs_pct || 0, color: '#ff2d55' },
    { name: 'Fat', value: weekly.fat_pct || 0, color: '#00d9ff' }
  ].filter(m => m.value > 0)

  // Format trend data for Recharts
  const chartData = trends.dates.map((d: string, i: number) => ({
    date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calories: trends.calories[i],
    protein: trends.protein[i],
    water: trends.water[i],
    weight: trends.weight[i],
    adherence: trends.adherence[i]
  }))

  return (
    <div style={S.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', color: '#d4ff00' }}>Performance</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Visualizing your physiological trends ✨</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', width: '100%', WebkitOverflowScrolling: 'touch' }}>
           {[
             { l: '7D',  v: 7 },
             { l: '14D', v: 14 },
             { l: '30D', v: 30 },
             { l: '90D', v: 90 },
             { l: '6M',  v: 180 },
             { l: '1Y',  v: 365 }
           ].map(opt => (
             <button key={opt.v} onClick={() => setDays(opt.v)}
               style={{ 
                 padding: '8px 16px', border: 'none', borderRadius: '12px', cursor: 'pointer', 
                 fontSize: '11px', fontWeight: 900, whiteSpace: 'nowrap',
                 background: days === opt.v ? '#d4ff00' : 'rgba(255,255,255,0.03)', 
                 color: days === opt.v ? '#030409' : '#8a8a8a', 
                 transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                 boxShadow: days === opt.v ? '0 4px 12px rgba(212,255,0,0.2)' : 'none'
               }}>
               {opt.l}
             </button>
           ))}
        </div>
      </div>

      {/* ── Primary Trends ── */}
      <div style={{ ...S.card, boxShadow: 'var(--glow-blue)' }}>
        <div style={S.chartTitle}><Flame size={18} color="#00d9ff" /> Calorie Trend (kcal)</div>
        <div style={{ height: 240 }}>
           <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                 <defs>
                   <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#00d9ff" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid vertical={false} stroke={CHART_THEME.grid.stroke} />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5a5a5a' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5a5a5a' }} />
                 <Tooltip contentStyle={CHART_THEME.tooltip} />
                 <Area type="monotone" dataKey="calories" stroke="#00d9ff" strokeWidth={3} fillOpacity={1} fill="url(#colorCal)" animationDuration={1000} />
              </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sub Trends Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        
        {/* Hydration */}
        <div style={S.card}>
          <div style={S.chartTitle}><Droplets size={18} color="#00d9ff" /> Hydration (ml)</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke={CHART_THEME.grid.stroke} />
                <XAxis dataKey="date" hide />
                <Tooltip contentStyle={CHART_THEME.tooltip} cursor={{fill: 'rgba(0,217,255,0.05)'}} />
                <Bar dataKey="water" fill="#00d9ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Meal Composition */}
        {stats && (
          <div style={{ ...S.card, boxShadow: 'var(--glow-lime)' }}>
            <div style={S.chartTitle}><PieIcon size={18} color="#d4ff00" /> Meal Composition</div>
            <p style={{ fontSize: '10px', color: '#8a8a8a', marginBottom: '20px' }}>Frequency & Avg Caloric Density</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.type_distribution} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid horizontal={false} stroke={CHART_THEME.grid.stroke} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="type" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8a8a' }} width={80} />
                  <Tooltip contentStyle={CHART_THEME.tooltip} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="count" name="Frequency" fill="#d4ff00" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Fueling Schedule */}
        {stats && (
          <div style={{ ...S.card, boxShadow: 'var(--glow-blue)' }}>
            <div style={S.chartTitle}><Zap size={18} color="#00d9ff" /> Fueling Schedule</div>
            <p style={{ fontSize: '10px', color: '#8a8a8a', marginBottom: '20px' }}>Log frequency across 24h cycle</p>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.time_distribution}>
                  <CartesianGrid vertical={false} stroke={CHART_THEME.grid.stroke} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#5a5a5a' }} 
                    tickFormatter={(h) => `${h}h`} />
                  <Tooltip contentStyle={CHART_THEME.tooltip} cursor={{ fill: 'rgba(0,217,255,0.05)' }} />
                  <Bar dataKey="count" name="Logs" fill="#00d9ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Weight */}
        <div style={{ ...S.card, boxShadow: 'var(--glow-lime)' }}>
          <div style={S.chartTitle}><Scale size={18} color="#d4ff00" /> Weight Trend (kg)</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.filter((d: any) => d.weight !== null)}>
                <CartesianGrid vertical={false} stroke={CHART_THEME.grid.stroke} />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={CHART_THEME.tooltip} />
                <Line type="monotone" dataKey="weight" stroke="#d4ff00" strokeWidth={3} dot={{ r: 3, fill: '#d4ff00' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Macro Split (Existing Pie) ── */}
      <div style={{ ...S.card, marginTop: '16px' }}>
        <p style={S.label}>Weekly Balance</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
           <div style={{ width: '150px', height: '150px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={macroData} innerRadius={45} outerRadius={60} paddingAngle={8} dataKey="value" stroke="none">
                    {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
           </div>
           <div style={{ flex: 1, paddingLeft: '24px' }}>
              {macroData.map(m => (
                 <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: m.color }} />
                       <span style={{ fontSize: '11px', fontWeight: 800 }}>{m.name.toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#8a8a8a' }}>{Math.round(m.value)}%</span>
                 </div>
              ))}
           </div>
        </div>
      </div>

    </div>
  )
}
