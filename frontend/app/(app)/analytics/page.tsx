'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { getLocalDateString } from '@/lib/utils'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ComposedChart
} from 'recharts'
import { 
  Flame, Award, Zap, Droplets, Scale, Target, 
  TrendingUp, Calendar, ChevronRight, Share2, 
  Download, CheckCircle2, Trophy, Clock, Utensils,
  Dumbbell, PieChart as PieIcon
} from 'lucide-react'

// ── Components ──

function HeroCard({ title, value, subtitle, icon: Icon, color, trend }: any) {
  return (
    <div style={{ 
      background: 'var(--glass)', border: '1px solid var(--glass-border)', 
      borderRadius: '24px', padding: '24px', position: 'relative', overflow: 'hidden',
      boxShadow: `0 10px 40px rgba(0,0,0,0.4)`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        {trend && (
          <div style={{ fontSize: '12px', fontWeight: 800, color: trend > 0 ? '#d4ff00' : '#ff2d55', display: 'flex', alignItems: 'center', gap: '4px' }}>
             {trend > 0 ? '+' : ''}{trend}% <TrendingUp size={12} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
          </div>
        )}
      </div>
      <p style={{ fontSize: '11px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>{title}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h3 style={{ fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-0.04em' }}>{value}</h3>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#5a5a5a' }}>{subtitle}</span>
      </div>
    </div>
  )
}

function WeeklyScoreGauge({ score, metrics }: any) {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #0a1128 0%, #030409 100%)', 
      border: '1px solid rgba(212,255,0,0.2)', borderRadius: '32px', padding: '32px',
      marginBottom: '24px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212,255,0,0.05) 0%, transparent 70%)' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie data={[{ value: score }, { value: 100 - score }]} innerRadius={45} outerRadius={55} startAngle={90} endAngle={450} stroke="none" dataKey="value">
                 <Cell fill="#d4ff00" />
                 <Cell fill="rgba(255,255,255,0.05)" />
               </Pie>
             </PieChart>
           </ResponsiveContainer>
           <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: 'white' }}>{Math.round(score)}%</span>
              <span style={{ fontSize: '8px', fontWeight: 900, color: '#d4ff00', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Adherence</span>
           </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '16px' }}>Weekly Performance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
             {metrics.map((m: any) => (
               <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(212,255,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <CheckCircle2 size={10} color="#d4ff00" />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#8a8a8a' }}>{m.label}: <b style={{ color: 'white' }}>{m.value}</b></span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalyticsContent />
    </Suspense>
  )
}

function AnalyticsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showSocial, setShowSocial] = useState(false)
  const [weekly, setWeekly] = useState<any>(null)
  const [trends, setTrends] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [socialData, setSocialData] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (searchParams.get('share') === 'true') {
      setShowSocial(true)
    }
  }, [searchParams])
  
  // Date State
  const today = getLocalDateString()
  const sevenDaysAgo = transitionDate(today, -6)
  const [rangeType, setRangeType] = useState<'7D' | '30D' | '90D' | 'custom'>('7D')
  const [startDate, setStartDate] = useState(sevenDaysAgo)
  const [endDate, setEndDate] = useState(today)

  function transitionDate(base: string, delta: number) {
    const d = new Date(base + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    return d.toISOString().split('T')[0]
  }

  // Auto-set dates when range changes
  useEffect(() => {
    if (rangeType === '7D') {
      setStartDate(transitionDate(today, -6))
      setEndDate(today)
    } else if (rangeType === '30D') {
      setStartDate(transitionDate(today, -29))
      setEndDate(today)
    } else if (rangeType === '90D') {
      setStartDate(transitionDate(today, -89))
      setEndDate(today)
    }
  }, [rangeType, today])

  const load = useCallback(async (tok: string, s: string, e: string) => {
    setLoading(true)
    
    const safeLoad = async (fn: () => Promise<any>, setter: (d: any) => void) => {
      try {
        const data = await fn()
        setter(data)
      } catch (err) {
        console.error("Partial Load Error:", err)
      }
    }

    await Promise.allSettled([
      safeLoad(() => api.getWeeklyAnalytics(tok), setWeekly),
      safeLoad(() => api.getAnalyticsTrends(90, tok, s, e), setTrends),
      safeLoad(() => api.getMealStats(90, tok, s, e), setStats),
      safeLoad(() => api.getSocialSummary(today, tok), setSocialData),
      safeLoad(() => api.getOnboarding(tok), setProfile)
    ])
    
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) load(session.access_token, startDate, endDate)
    })
  }, [load, startDate, endDate])

  const CHART_THEME = {
    tooltip: { backgroundColor: '#0a1128', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: 700, color: 'white' },
    grid: { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' }
  }

  if (loading && !weekly) return (
    <div style={{ padding: '24px', background: '#030409', minHeight: '100vh' }}>
      <div style={{ height: 100, background: 'rgba(255,255,255,0.03)', borderRadius: '24px', marginBottom: '24px' }} className="animate-pulse" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ height: 160, background: 'rgba(255,255,255,0.03)', borderRadius: '24px' }} className="animate-pulse" />
        <div style={{ height: 160, background: 'rgba(255,255,255,0.03)', borderRadius: '24px' }} className="animate-pulse" />
      </div>
    </div>
  )

  if (!weekly || !trends) return null

  // Process trend data
  const chartData = trends.dates.map((d: string, i: number) => ({
    date: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }),
    fullDate: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calories: trends.calories[i],
    caloriesTarget: trends.calories_target[i],
    protein: trends.protein[i],
    proteinTarget: trends.protein_target[i],
    water: trends.water[i],
    waterTarget: trends.water_target?.[i] || 2000,
    weight: trends.weight[i],
    weightRolling: trends.weight_rolling_avg[i],
    bmi: (trends.weight[i] && profile?.height_cm) 
      ? parseFloat((trends.weight[i] / Math.pow(profile.height_cm / 100, 2)).toFixed(1)) 
      : null
  }))

  const macroData = [
    { name: 'Protein', value: weekly.protein_pct || 0, color: '#d4ff00' },
    { name: 'Carbs', value: weekly.carbs_pct || 0, color: '#ff2d55' },
    { name: 'Fat', value: weekly.fat_pct || 0, color: '#00d9ff' }
  ].filter(m => m.value > 0)

  // BMI Calculation Logic
  const currentWeight = trends?.weight_rolling_avg?.[trends.weight_rolling_avg.length - 1]
  const height = profile?.height_cm
  const bmi = (currentWeight && height) ? (currentWeight / Math.pow(height / 100, 2)).toFixed(1) : null
  
  const getBMIDetails = (val: string | null) => {
    if (!val) return { label: 'Awaiting Height', color: '#5a5a5a', desc: 'Set height in settings to enable BMI' }
    const b = parseFloat(val)
    if (b < 18.5) return { label: 'Underweight', color: '#00d9ff', desc: 'Protocol focus: Surplus required' }
    if (b < 25) return { label: 'Healthy Range', color: '#d4ff00', desc: 'Protocol focus: Maintenance/Integrity' }
    if (b < 30) return { label: 'Overweight', color: '#ffa500', desc: 'Protocol focus: Precision deficit' }
    return { label: 'Obese', color: '#ff2d55', desc: 'Protocol focus: Strategic intervention' }
  }
  const bmiHUD = getBMIDetails(bmi)

  const S = {
    container: { width: '100%', maxWidth: '480px', margin: '0 auto', padding: '120px 16px 120px', minHeight: '100dvh', background: '#030409', color: 'white', display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px', width: '100%', boxSizing: 'border-box', position: 'relative' as const } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px', marginTop: '32px', display: 'block' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ zIndex: 10 }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.05em', color: 'white' }}>Performance</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>Elite biological monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', zIndex: 10 }}>
          <button onClick={() => setShowSocial(true)} 
            style={{ padding: '12px 20px', borderRadius: '16px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(212,255,0,0.3)' }}>
             <Share2 size={16} /> Share
          </button>
        </div>
      </div>

      {/* ── Range HUD ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
         <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {['7D', '30D', '90D', 'custom'].map((r) => (
              <button 
                key={r} 
                onClick={() => setRangeType(r as any)}
                style={{ 
                  flex: 1, padding: '10px 0', borderRadius: '10px', border: 'none', 
                  fontSize: '11px', fontWeight: 900, cursor: 'pointer',
                  background: rangeType === r ? 'rgba(212,255,0,0.15)' : 'transparent',
                  color: rangeType === r ? '#d4ff00' : '#8a8a8a',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  transition: 'all 0.2s ease'
                }}
              >
                {r}
              </button>
            ))}
         </div>

         {rangeType === 'custom' && (
           <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', animation: 'slideDown 0.3s ease' }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: 700, outline: 'none', padding: '8px' }} />
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: 700, outline: 'none', padding: '8px' }} />
           </div>
         )}
      </div>

      {/* ── Level 1: Hero Analytics Hub ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          
          {/* Main Hero: Weekly Adherence & Score Breakdown */}
          <div style={{ ...S.card, background: 'linear-gradient(135deg, rgba(212,255,0,0.08) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(212,255,0,0.2)', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
               className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-0 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                   <p style={{ fontSize: '10px', fontWeight: 900, color: '#d4ff00', letterSpacing: '0.15em', marginBottom: '8px' }}>PROTOCOL INTEGRITY</p>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                     <h2 style={{ fontSize: '56px', fontWeight: 900, color: 'white', letterSpacing: '-0.05em' }}>{Math.round(weekly.adherence_avg || 0)}%</h2>
                     <span style={{ fontSize: '14px', fontWeight: 800, color: '#8a8a8a' }}>SCORE</span>
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(212,255,0,0.1)', padding: '6px 12px', borderRadius: '40px', color: '#d4ff00', fontSize: '11px', fontWeight: 900 }}>
                      <Flame size={14} /> {weekly.logging_streak_days} DAY STREAK
                   </div>
                </div>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { l: 'ENERGY', v: weekly.calories_hit_count, c: '#00d9ff' },
                  { l: 'PROTEIN', v: weekly.protein_hit_count, c: '#d4ff00' },
                  { l: 'WATER', v: weekly.water_hit_count, c: '#00d9ff' }
                ].map(b => (
                  <div key={b.l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                     <p style={{ fontSize: '20px', fontWeight: 900, color: b.c }}>{b.v}</p>
                     <p style={{ fontSize: '8px', fontWeight: 900, color: '#5a5a5a', marginTop: '4px' }}>{b.l} HITS</p>
                  </div>
                ))}
             </div>
          </div>

          {/* Hero 2: Physiological Status (BMI) */}
          <div style={{ ...S.card, margin: 0 }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-50 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', letterSpacing: '0.15em' }}>PHYSIOLOGICAL STATUS</p>
                <span style={{ fontSize: '11px', fontWeight: 800, color: bmiHUD.color }}>{bmiHUD.label}</span>
             </div>
             <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '40px', fontWeight: 900, color: 'white' }}>{bmi || '--'}</h2>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#5a5a5a' }}>BMI</span>
             </div>
             <p style={{ fontSize: '11px', color: '#8a8a8a', fontWeight: 600, marginBottom: '20px' }}>{bmiHUD.desc}</p>
             {bmi && (
               <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', left: `${Math.min(100, (parseFloat(bmi)/40)*100)}%`, 
                    width: '10px', height: '10px', background: bmiHUD.color, borderRadius: '50%', 
                    top: '-3px', marginLeft: '-5px', boxShadow: `0 0 15px ${bmiHUD.color}`,
                    transition: 'left 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s'
                  }} />
               </div>
             )}
          </div>

          {/* Hero 3: Body Weight Path */}
          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', margin: 0 }}
               className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#8a8a8a', letterSpacing: '0.1em' }}>WEIGHT TRAJECTORY</h3>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '18px', fontWeight: 900, color: 'white' }}>{chartData[chartData.length-1]?.weightRolling?.toFixed(1) || '--'}kg</p>
                   <p style={{ fontSize: '9px', color: '#5a5a5a', fontWeight: 800 }}>ROLLING AVG</p>
                </div>
             </div>
             <div style={{ flex: 1, minHeight: '120px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData.filter(d => d.weight)}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4ff00" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#d4ff00" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip contentStyle={CHART_THEME.tooltip} />
                    <Area type="monotone" dataKey="weight" stroke="none" fill="url(#weightGradient)" />
                    <Line type="monotone" dataKey="weightRolling" stroke="#d4ff00" strokeWidth={3} dot={false} animationDuration={2000} />
                  </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Hero 4: Energy Command */}
          <div style={{ ...S.card, margin: 0 }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#00d9ff' }}>ENERGY COMMAND</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>TARGET: {profile?.calories_target || '---'} KCAL</div>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <Tooltip contentStyle={CHART_THEME.tooltip} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 20 }} />
                    <Bar dataKey="calories" fill="#00d9ff" radius={[6, 6, 0, 0]} opacity={0.6} barSize={16} />
                    <Line type="monotone" dataKey="caloriesTarget" stroke="#00d9ff" strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.3} />
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                  </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Hero 5: Protein Hub */}
          <div style={{ ...S.card, margin: 0 }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#d4ff00' }}>PROTEIN HUB</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>TARGET: {profile?.protein_target_g || '---'}G</div>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <Tooltip contentStyle={CHART_THEME.tooltip} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 20 }} />
                    <Bar dataKey="protein" fill="#d4ff00" radius={[6, 6, 0, 0]} opacity={0.6} barSize={16} />
                    <Line type="monotone" dataKey="proteinTarget" stroke="#d4ff00" strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.3} />
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                  </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      {/* ── Secondary Review Layer (Level 2) ── */}
      <p style={S.label} className="animate-in fade-in duration-1000 delay-300">Secondary Analytics Depth</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* BMI Trajectory */}
        <div style={S.card} className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-400">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#00d9ff' }}>BMI PATH</h3>
              <div style={{ fontSize: '9px', color: '#5a5a5a', fontWeight: 800 }}>BIO-METRIC TREND</div>
           </div>
           <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.filter(d => d.bmi)}>
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip contentStyle={CHART_THEME.tooltip} />
                  <Area type="monotone" dataKey="bmi" stroke="#00d9ff" strokeWidth={3} fill="#00d9ff" fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Water Goal Stability */}
        <div style={S.card} className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#00d9ff' }}>HYDRATION STABILITY</h3>
              <div style={{ fontSize: '9px', color: '#5a5a5a', fontWeight: 800 }}>VS {profile?.water_target_ml || 2500}ML</div>
           </div>
           <div style={{ height: 120 }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                  <Tooltip contentStyle={CHART_THEME.tooltip} />
                  <Bar dataKey="water" fill="#00d9ff" radius={[4, 4, 4, 4]} barSize={12} opacity={0.8} />
                  <Line type="monotone" dataKey="waterTarget" stroke="rgba(0,217,255,0.2)" strokeDasharray="4 4" dot={false} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Macro Composition */}
        <div style={S.card}>
           <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ff2d55', marginBottom: '16px' }}>MACRO COMPOSITION</h3>
           <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '80px', height: '80px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={macroData} innerRadius={28} outerRadius={38} paddingAngle={4} dataKey="value" stroke="none">
                        {macroData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                 {macroData.map(m => (
                   <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#8a8a8a' }}>{m.name.toUpperCase()}</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: 'white' }}>{Math.round(m.value)}%</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Fueling Window review */}
        <div style={S.card}>
           <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#00d9ff', marginBottom: '16px' }}>FUELING WINDOW</h3>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '12px' }}>
                 <p style={{ fontSize: '8px', fontWeight: 900, color: '#5a5a5a', textTransform: 'uppercase' }}>Avg First</p>
                 <p style={{ fontSize: '16px', fontWeight: 900 }}>{weekly.avg_first_meal || '---'}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '12px' }}>
                 <p style={{ fontSize: '8px', fontWeight: 900, color: '#5a5a5a', textTransform: 'uppercase' }}>Avg Last</p>
                 <p style={{ fontSize: '16px', fontWeight: 900 }}>{weekly.avg_last_meal || '---'}</p>
              </div>
               <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: '10px', fontWeight: 800, color: '#5a5a5a' }}>FREQUENCY</span>
                 <span style={{ fontSize: '12px', fontWeight: 900 }}>{(weekly.meals_per_day_avg || 0).toFixed(1)} meals / day</span>
              </div>
           </div>
       </div>
    </div>

      {/* ── Social Card Modal (Liquid Obsidian Edition) ── */}
      {showSocial && socialData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(3,4,9,0.95)', backdropFilter: 'blur(40px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
           <div style={{ width: '100%', maxWidth: '400px', animation: 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              
              <div id="social-card" style={{ 
                background: '#030409', 
                border: '1px solid rgba(212,255,0,0.15)', borderRadius: '48px', padding: '48px',
                aspectRatio: '1/1.5', position: 'relative', overflow: 'hidden',
                boxShadow: '0 50px 120px rgba(0,0,0,0.9), inset 0 0 100px rgba(212,255,0,0.02)'
              }}>
                 {/* Background Glow Brushes */}
                 <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '100%', height: '100%', opacity: 0.15, background: 'radial-gradient(circle, #d4ff00 0%, transparent 70%)', filter: 'blur(60px)' }} />
                 <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '80%', height: '80%', opacity: 0.1, background: 'radial-gradient(circle, #00d9ff 0%, transparent 70%)', filter: 'blur(60px)' }} />
                 
                 {/* Header Layer */}
                 <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: 'black', fontWeight: 900, fontSize: '16px' }}>M</span>
                       </div>
                       <span style={{ fontSize: '13px', fontWeight: 900, color: 'white', letterSpacing: '0.2em' }}>MORSEL PROTOCOL</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#5a5a5a' }}>
                       {new Date(socialData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                    </div>
                 </div>

                 {/* Central Efficiency Gauge */}
                 <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: '60px' }}>
                    <div style={{ width: '180px', height: '180px', margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 0 20px rgba(212,255,0,0.02)' }} />
                       <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '8px' }}>Efficiency</p>
                          <h2 style={{ fontSize: '64px', fontWeight: 900, color: '#d4ff00', letterSpacing: '-0.06em', textShadow: '0 0 40px rgba(212,255,0,0.4)' }}>
                             {Math.round(socialData.adherence_score) || 0}%
                          </h2>
                       </div>
                    </div>
                    <div style={{ marginTop: '24px', display: 'inline-block', background: 'rgba(212,255,0,0.1)', border: '1px solid rgba(212,255,0,0.2)', color: '#d4ff00', padding: '8px 20px', borderRadius: '40px', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em' }}>
                       {socialData.adherence_score > 80 ? 'PROTOCOL SECURED' : 'INTEGRITY VERIFIED'}
                    </div>
                 </div>

                 {/* Metric Grid Layers */}
                 <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    {[
                      { l: 'ENERGY', v: `${Math.round(socialData.calories_actual)}`, t: socialData.calories_target, u: 'kcal', color: '#00d9ff' },
                      { l: 'PROTEIN', v: `${Math.round(socialData.protein_actual)}`, t: socialData.protein_target, u: 'g', color: '#d4ff00' },
                      { l: 'HYDRATION', v: `${socialData.water_actual}`, t: socialData.water_target, u: 'ml', color: '#00d9ff' },
                      { l: 'DISCIPLINE', v: `${weekly.logging_streak_days}`, t: 7, u: 'days', color: 'white' }
                    ].map(s => (
                      <div key={s.l}>
                         <p style={{ fontSize: '9px', fontWeight: 900, color: '#5a5a5a', letterSpacing: '0.15em', marginBottom: '8px' }}>{s.l}</p>
                         <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: s.color }}>{s.v}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#5a5a5a' }}>{s.u}</span>
                         </div>
                      </div>
                    ))}
                 </div>

                 {/* Footer AI Insight */}
                 <div style={{ position: 'relative', zIndex: 2, marginTop: '60px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'white', fontStyle: 'italic', lineHeight: 1.5, opacity: 0.8, textAlign: 'center' }}>
                       "{socialData.summary_text || "Elite biological protocol active. integrity confirmed."}"
                    </p>
                 </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px', marginTop: '24px' }}>
                 <button onClick={() => setShowSocial(false)} style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '24px', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>Dismiss</button>
                 <button style={{ padding: '20px', background: '#d4ff00', border: 'none', borderRadius: '24px', color: 'black', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 20px 40px rgba(212,255,0,0.2)', fontSize: '13px' }}>
                    <Download size={20} /> Save Report
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
