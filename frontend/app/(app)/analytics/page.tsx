'use client'
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { getLocalDateString } from '@/lib/utils'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ComposedChart
} from 'recharts'
import { 
  Flame, Zap, Droplets, Scale, Target, 
  TrendingUp, Calendar, ChevronRight, Share2, 
  Download, CheckCircle2, Trophy, Clock, Utensils,
  Dumbbell, PieChart as PieIcon, Plus
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

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', background: '#030409', minHeight: '100vh' }}><div style={{ height: 100, background: 'rgba(255,255,255,0.03)', borderRadius: '24px' }} className="animate-pulse" /></div>}>
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
  const [degraded, setDegraded] = useState(false)

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

  const load = useCallback(async (tok: string) => {
    try {
      setDegraded(false)
      const cacheKey = `morsel_analytics_cache_${startDate}_${endDate}`
      const composite = await api.getCompositeAnalytics(rangeType === '7D' ? 7 : rangeType === '30D' ? 30 : 90, tok, startDate, endDate)
      setWeekly(composite.weekly)
      setTrends(composite.trends)
      setStats(composite.stats)
      setSocialData(composite.social)
      localStorage.setItem(cacheKey, JSON.stringify(composite))
      
      const prof = await api.getOnboarding(tok)
      setProfile(prof)
    } catch (err) {
      console.error("Analytics Load Error:", err)
      setDegraded(true)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, rangeType])

  useEffect(() => {
    const cacheKey = `morsel_analytics_cache_${startDate}_${endDate}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const d = JSON.parse(cached)
        setWeekly(d.weekly)
        setTrends(d.trends)
        setStats(d.stats)
        setSocialData(d.social)
      } catch (e: any) {
        console.error('Failed to parse analytics cache:', e)
      }
    }
  }, [startDate, endDate])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) load(session.access_token)
    })
  }, [load])

  const CHART_THEME = {
    tooltip: { backgroundColor: '#0a1128', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', backdropFilter: 'blur(20px)' },
    grid: { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' }
  }

  const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '', targetKey = null }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value
      const target = targetKey ? payload[0].payload[targetKey] : null
      const delta = target !== null ? val - target : null

      return (
        <div style={{ ...CHART_THEME.tooltip, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
             <h4 style={{ fontSize: '20px', fontWeight: 900, color: 'white' }}>{prefix}{val.toLocaleString()}{suffix}</h4>
             {delta !== null && (
               <span style={{ fontSize: '11px', fontWeight: 800, color: delta >= 0 ? '#d4ff00' : '#ff2d55' }}>
                  {delta > 0 ? '+' : ''}{delta.toLocaleString()}{suffix} to target
               </span>
             )}
          </div>
          {payload.length > 1 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               {payload.slice(1).map((p: any, i: number) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>{p.name.toUpperCase()}</span>
                    <span style={{ fontSize: '10px', color: p.color || 'white', fontWeight: 900 }}>{p.value}{suffix}</span>
                 </div>
               ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // ── BMI & Trend Processing Logic ──
  const currentWeight = trends?.weight_rolling_avg?.[trends.weight_rolling_avg.length - 1]
  const height = profile?.height_cm
  const bmiValue = (currentWeight && height) ? (currentWeight / Math.pow(height / 100, 2)).toFixed(1) : null
  
  const bmiHUD = useMemo(() => {
    if (!bmiValue) return { label: 'WAITING', color: '#5a5a5a', desc: 'Log weight to see BMI.' }
    const b = parseFloat(bmiValue)
    const res = b < 18.5 ? { label: 'LOW', color: '#ff2d55', desc: 'BMI is low. A small calorie increase may help.' }
              : b < 25 ? { label: 'HEALTHY', color: '#d4ff00', desc: 'BMI is in a healthy range.' }
              : b < 30 ? { label: 'HIGH', color: '#ff2d55', desc: 'BMI is above the healthy range.' }
              : { label: 'VERY HIGH', color: '#ff2d55', desc: 'BMI is well above the healthy range.' }
    return res
  }, [bmiValue])

  const chartData: any[] = useMemo(() => {
    if (!trends) return []
    return trends.dates.map((d: string, i: number) => ({
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
      volume: trends.workout_volume ? trends.workout_volume[i] : 0,
      intensity: trends.workout_intensity ? trends.workout_intensity[i] : 0,
      suppAdherence: trends.supplement_adherence ? trends.supplement_adherence[i] : 0,
      bmi: (trends.weight[i] && profile?.height_cm) 
        ? parseFloat((trends.weight[i] / Math.pow(profile.height_cm / 100, 2)).toFixed(1)) 
        : null
    }))
  }, [trends, profile])

  const macroData = useMemo(() => {
    if (!weekly) return []
    return [
      { name: 'Protein', value: weekly.protein_pct || 0, color: '#d4ff00' },
      { name: 'Carbs', value: weekly.carbs_pct || 0, color: '#ff2d55' },
      { name: 'Fat', value: weekly.fat_pct || 0, color: '#00d9ff' }
    ].filter((m: any) => m.value > 0)
  }, [weekly])

  const overviewCards = useMemo(() => {
    if (!weekly) return []
    return [
      { title: 'Avg Calories', value: Math.round(weekly.avg_calories || 0), subtitle: 'per day', icon: Flame, color: '#00d9ff' },
      { title: 'Avg Protein', value: Math.round(weekly.avg_protein_g || 0), subtitle: 'g per day', icon: Target, color: '#d4ff00' },
      { title: 'Avg Water', value: Math.round((weekly.avg_water_ml || 0) / 100) / 10, subtitle: 'L per day', icon: Droplets, color: '#00d9ff' },
      { title: 'Meals Per Day', value: weekly.meals_per_day_avg?.toFixed(1) || '0.0', subtitle: 'average', icon: Utensils, color: '#ffffff' }
    ]
  }, [weekly])

  const weekdayData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const bucket = days.map(day => ({ day, calories: 0, protein: 0, count: 0 }))
    chartData.forEach((item: any, idx: number) => {
      const rawDate = trends?.dates?.[idx]
      if (!rawDate) return
      const dayIndex = new Date(rawDate).getDay()
      bucket[dayIndex].calories += item.calories || 0
      bucket[dayIndex].protein += item.protein || 0
      bucket[dayIndex].count += 1
    })
    return bucket.map(item => ({
      day: item.day,
      calories: item.count ? Math.round(item.calories / item.count) : 0,
      protein: item.count ? Math.round(item.protein / item.count) : 0
    }))
  }, [chartData, trends])

  const supplementChart = useMemo(() => chartData.map((item: any) => ({
    date: item.date,
    supplement: Math.round(item.suppAdherence || 0)
  })), [chartData])

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

  const S = {
    container: { 
      width: '100%', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px 20px 140px', 
      minHeight: '100dvh', 
      background: '#030409', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column' as const, 
      boxSizing: 'border-box' 
    } as React.CSSProperties,
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
      gap: '16px',
      marginBottom: '32px'
    } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px', width: '100%', boxSizing: 'border-box', position: 'relative' as const } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px', marginTop: '32px', display: 'block' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ zIndex: 10 }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.05em', color: 'white' }}>Insights</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>Food, water, weight, and workouts</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', zIndex: 10 }}>
          <button onClick={() => setShowSocial(true)} 
            style={{ padding: '12px 20px', borderRadius: '16px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(212,255,0,0.3)' }}>
             <Share2 size={16} /> Export
          </button>
        </div>
      </div>

      {degraded && (
        <div style={{ background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.2)', padding: '12px 20px', borderRadius: '16px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }} className="animate-in fade-in slide-in-from-top-4">
           <Zap size={16} color="#ff2d55" />
           <p style={{ fontSize: '12px', color: '#ff2d55', fontWeight: 700 }}>Some live data could not load. Showing saved data instead.</p>
        </div>
      )}

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
           <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', animation: 'slideDown 0.3s ease' }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: 700, outline: 'none', padding: '8px' }} />
              <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '12px', fontWeight: 700, outline: 'none', padding: '8px' }} />
           </div>
         )}
      </div>

      <div style={S.grid}>
        {overviewCards.map(card => (
          <HeroCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      {/* ── Top Summary ── */}
      <div style={S.grid}>
          
          {/* Main Hero: Weekly Score & Adherence */}
          <div style={{ ...S.card, background: 'linear-gradient(135deg, rgba(212,255,0,0.08) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(212,255,0,0.2)', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                   <p style={{ fontSize: '10px', fontWeight: 900, color: '#d4ff00', letterSpacing: '0.15em', marginBottom: '8px' }}>DAILY SCORE</p>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                     <h2 style={{ fontSize: '56px', fontWeight: 900, color: 'white', letterSpacing: '-0.05em' }}>{Math.round(weekly.adherence_avg || 0)}%</h2>
                     <span style={{ fontSize: '14px', fontWeight: 800, color: '#8a8a8a' }}>AVG</span>
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(212,255,0,0.1)', padding: '6px 12px', borderRadius: '40px', color: '#d4ff00', fontSize: '11px', fontWeight: 900 }}>
                      <TrendingUp size={14} /> {weekly.logging_streak_days} DAY STREAK
                   </div>
                </div>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { l: 'CALS', v: weekly.calories_hit_count, c: '#00d9ff' },
                  { l: 'PROTEIN', v: weekly.protein_hit_count, c: '#d4ff00' },
                  { l: 'WATER', v: weekly.water_hit_count, c: '#00d9ff' },
                  { l: 'VOLUME', v: Math.round(weekly.total_workout_volume / 1000) + 'k', c: '#d4ff00' }
                ].map(b => (
                  <div key={b.l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '16px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                     <p style={{ fontSize: '18px', fontWeight: 900, color: b.c }}>{b.v}</p>
                     <p style={{ fontSize: '8px', fontWeight: 900, color: '#5a5a5a', marginTop: '4px' }}>{b.l}</p>
                  </div>
                ))}
             </div>
          </div>

          {/* Hero 2: Body Stats */}
          <div style={{ ...S.card, margin: 0 }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-50 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', letterSpacing: '0.15em' }}>BODY</p>
                <span style={{ fontSize: '11px', fontWeight: 800, color: bmiHUD.color }}>{bmiHUD.label}</span>
             </div>
             <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '40px', fontWeight: 900, color: 'white' }}>{bmiValue || '--'}</h2>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#5a5a5a' }}>BMI</span>
             </div>
             <p style={{ fontSize: '11px', color: '#8a8a8a', fontWeight: 600, marginBottom: '20px' }}>{bmiHUD.desc}</p>
             {bmiValue && (
               <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', left: `${Math.min(100, (parseFloat(bmiValue)/40)*100)}%`, 
                    width: '10px', height: '10px', background: bmiHUD.color, borderRadius: '50%', 
                    top: '-3px', marginLeft: '-5px', boxShadow: `0 0 15px ${bmiHUD.color}`,
                    transition: 'left 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s'
                  }} />
               </div>
             )}
          </div>

          {/* Hero 3: Muscle Group Distribution */}
          <div style={{ ...S.card, margin: 0 }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#d4ff00' }}>WORKOUT SPLIT</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>BY TYPE</div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '120px' }}>
                <div style={{ width: '100px', height: '100%' }}>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie 
                           data={weekly.volume_by_category || []} 
                           innerRadius={30} outerRadius={45} 
                           paddingAngle={4} dataKey="volume" stroke="none"
                         >
                            {weekly.volume_by_category?.map((_: any, i: number) => (
                              <Cell key={i} fill={['#d4ff00', '#00d9ff', '#ff2d55', '#ffffff', '#8a8a8a'][i % 5]} />
                            ))}
                         </Pie>
                         <Tooltip contentStyle={CHART_THEME.tooltip} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, maxHeight: '100%', overflowY: 'auto' }}>
                   {weekly.volume_by_category?.slice(0, 4).map((c: any, i: number) => (
                     <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#8a8a8a' }}>{c.category.toUpperCase()}</span>
                        <span style={{ fontSize: '10px', fontWeight: 900 }}>{Math.round(c.volume / 1000)}k</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Hero 4: Calories */}
          <div style={{ ...S.card, margin: 0 }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#00d9ff' }}>CALORIE TREND</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>TARGET: {profile?.calories_target || '---'} KCAL</div>
             </div>
             <div style={{ height: 160 }}>
                   <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={3}>
                      <ComposedChart data={chartData} syncId="workout_sync">
                         <Tooltip content={<CustomTooltip targetKey="caloriesTarget" suffix=" kcal" />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} trigger="hover" />
                         <Bar dataKey="calories" name="Actual" fill="#00d9ff" radius={[4, 4, 0, 0]} opacity={0.6} barSize={12} />
                         <Line type="monotone" dataKey="caloriesTarget" name="Target" stroke="#00d9ff" strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.3} />
                         <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                      </ComposedChart>
                   </ResponsiveContainer>
             </div>
          </div>

          {/* Hero 5: Protein */}
          <div style={{ ...S.card, margin: 0 }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#d4ff00' }}>PROTEIN TREND</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>TARGET: {profile?.protein_target_g || '---'}G</div>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={3}>
                   <ComposedChart data={chartData}>
                      <Tooltip content={<CustomTooltip targetKey="proteinTarget" suffix="g" />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Bar dataKey="protein" name="Actual" fill="#d4ff00" radius={[4, 4, 0, 0]} opacity={0.6} barSize={12} />
                      <Line type="monotone" dataKey="proteinTarget" name="Target" stroke="#d4ff00" strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.3} />
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                   </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Hero 6: Weight */}
          <div style={{ ...S.card, margin: 0 }} className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-250 fill-mode-both">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: 'white' }}>WEIGHT TREND</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>ROLLING AVG</div>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={3}>
                   <ComposedChart data={chartData.filter((d: any) => d.weight)}>
                      <Tooltip contentStyle={CHART_THEME.tooltip} />
                      <Area type="monotone" dataKey="weight" stroke="none" fill="rgba(255,255,255,0.05)" />
                      <Line type="monotone" dataKey="weightRolling" stroke="#d4ff00" strokeWidth={3} dot={false} />
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                   </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

       {/* ── Recovery ── */}
       <h3 style={S.label}>Recovery</h3>
       <div style={S.grid}>
          {trends.recovery_status?.map((m: any, i: number) => (
            <div key={i} style={{ ...S.card, margin: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', letterSpacing: '0.15em' }}>{m.muscle_group.toUpperCase()}</p>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: m.status === 'Ready' ? '#d4ff00' : m.status === 'Recovering' ? '#00d9ff' : '#ff2d55' }}>{m.status.toUpperCase()}</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: 'white' }}>{Math.round(m.recovery_pct)}<span style={{ fontSize: '14px', color: '#5a5a5a' }}>%</span></h2>
               </div>
               <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ 
                    position: 'absolute', top: 0, left: 0, bottom: 0,
                    width: `${m.recovery_pct}%`, background: m.status === 'Ready' ? '#d4ff00' : m.status === 'Recovering' ? '#00d9ff' : '#ff2d55',
                    borderRadius: '3px', filter: m.status === 'Ready' ? 'drop-shadow(0 0 5px #d4ff0066)' : 'none',
                    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                  }} />
               </div>
            </div>
          ))}
          {!trends.recovery_status?.length && (
            <div style={{ ...S.card, margin: 0, padding: '40px', textAlign: 'center', color: '#5a5a5a', fontSize: '12px', fontWeight: 600 }}>
               Log workouts to see recovery.
            </div>
          )}
       </div>

       {/* ── Level 3: Strength Evolution (Submaximal 1RM) ── */}
       <h3 style={S.label}>Strength Evolution (Estimated 1RM)</h3>
       <div style={S.grid}>
          {trends.strength_evolution?.map((s: any, i: number) => (
            <div key={i} style={S.card}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <Trophy size={16} color="#d4ff00" />
                     <h3 style={{ fontSize: '13px', fontWeight: 900 }}>{s.exercise_name.toUpperCase()}</h3>
                  </div>
                  <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>E1RM EVOLUTION</div>
               </div>
               <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={s.dates.map((d: string, idx: number) => ({ date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), e1rm: s.e1rm_values[idx] }))}>
                        <defs>
                          <linearGradient id={`strengthGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d4ff00" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#d4ff00" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip contentStyle={CHART_THEME.tooltip} />
                        <Area type="monotone" dataKey="e1rm" stroke="#d4ff00" strokeWidth={3} fill={`url(#strengthGrad-${i})`} dot={{ r: 4, fill: '#030409', stroke: '#d4ff00', strokeWidth: 2 }} />
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
          ))}
          {!trends.strength_evolution?.length && (
            <div style={{ ...S.card, margin: 0, padding: '40px', textAlign: 'center', color: '#5a5a5a', fontSize: '12px', fontWeight: 600 }}>
               Log the same exercise more than once to see progress.
            </div>
          )}
       </div>

       {/* ── More Details ── */}
       <h3 style={S.label}>More Details</h3>
       <div style={S.grid}>
          
          {/* Workout Intensity */}
          <div style={S.card}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Zap size={16} color="#00d9ff" />
                   <h3 style={{ fontSize: '13px', fontWeight: 900 }}>WEIGHT PER REP</h3>
                </div>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>AVG KG / REP</div>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#00d9ff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip content={<CustomTooltip suffix=" kg/rep" />} />
                      <Area type="monotone" dataKey="intensity" stroke="#00d9ff" strokeWidth={2} fill="url(#intensityGradient)" />
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Hydration Stability */}
          <div style={S.card}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#00d9ff' }}>HYDRATION STABILITY</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>VS {profile?.water_target_ml || 2500}ML</div>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <ComposedChart data={chartData}>
                      <Tooltip content={<CustomTooltip targetKey="waterTarget" suffix=" ml" />} />
                      <Bar dataKey="water" fill="#00d9ff" radius={[4, 4, 0, 0]} opacity={0.6} barSize={12} />
                      <Line type="monotone" dataKey="waterTarget" stroke="#00d9ff" strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.3} />
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                   </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Meal Times */}
          <div style={S.card}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#d4ff00' }}>MEAL TIMES</h3>
                <Clock size={16} color="#5a5a5a" />
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={stats?.time_distribution || []}>
                      <Tooltip cursor={{ fill: 'rgba(212,255,0,0.05)' }} contentStyle={CHART_THEME.tooltip} />
                      <Bar dataKey="count" fill="#d4ff00" radius={[4, 4, 0, 0]} opacity={0.6} barSize={12} />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#5a5a5a' }} interval={3} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div style={S.card}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#d4ff00' }}>SUPPLEMENT TREND</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>% DONE</div>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={supplementChart}>
                      <Tooltip content={<CustomTooltip suffix="%" />} />
                      <Line type="monotone" dataKey="supplement" stroke="#d4ff00" strokeWidth={3} dot={false} />
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#5a5a5a' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#5a5a5a' }} domain={[0, 100]} />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div style={S.card}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#00d9ff' }}>WEEKDAY PATTERN</h3>
                <div style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800 }}>AVG CALORIES</div>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={weekdayData}>
                      <Tooltip content={<CustomTooltip suffix=" kcal" />} />
                      <Bar dataKey="calories" fill="#00d9ff" radius={[4, 4, 0, 0]} opacity={0.7} barSize={18} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#5a5a5a' }} />
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      {/* ── Common Meals ── */}
      <h3 style={S.label}>Common Meals</h3>
      <div style={S.grid}>
         {stats?.frequent_items?.slice(0, 4).map((item: any, i: number) => (
           <div key={i} style={{ ...S.card, marginBottom: 0, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                 <p style={{ fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.meal_name}</p>
                 <p style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 700 }}>{item.count} Logs</p>
              </div>
              <button 
                onClick={async () => {
                  try {
                    const supabase = createClient();
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;
                    await api.createMeal({ meal_name: item.meal_name, entry_text_raw: `Quick Repeat: ${item.meal_name}`, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, logged_at: new Date().toISOString(), source_type: 'repeat' }, session.access_token);
                    alert(`Logged ${item.meal_name}!`);
                  } catch (e: any) {
                    console.error('Failed to repeat meal:', e)
                    alert('Failed to log meal')
                  }
                }}
                style={{ background: 'rgba(212,255,0,0.1)', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}
              >
                 <Plus size={14} color="#d4ff00" />
              </button>
           </div>
         ))}
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
                       <span style={{ fontSize: '13px', fontWeight: 900, color: 'white', letterSpacing: '0.2em' }}>MORSEL</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#5a5a5a' }}>
                       {new Date(socialData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                    </div>
                 </div>

                 {/* Central Score */}
                 <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: '60px' }}>
                    <div style={{ width: '180px', height: '180px', margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 0 20px rgba(212,255,0,0.02)' }} />
                       <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '8px' }}>Daily score</p>
                          <h2 style={{ fontSize: '64px', fontWeight: 900, color: '#d4ff00', letterSpacing: '-0.06em', textShadow: '0 0 40px rgba(212,255,0,0.4)' }}>
                             {Math.round(socialData.adherence_score) || 0}%
                          </h2>
                       </div>
                    </div>
                    <div style={{ marginTop: '24px', display: 'inline-block', background: 'rgba(212,255,0,0.1)', border: '1px solid rgba(212,255,0,0.2)', color: '#d4ff00', padding: '8px 20px', borderRadius: '40px', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em' }}>
                       Day summary
                    </div>
                 </div>

                 {/* Metric Grid Layers */}
                 <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    {[
                      { l: 'CALS', v: `${Math.round(socialData.calories_actual)}`, t: socialData.calories_target, u: 'kcal', color: '#00d9ff' },
                      { l: 'PROTEIN', v: `${Math.round(socialData.protein_actual)}`, t: socialData.protein_target, u: 'g', color: '#d4ff00' },
                      { l: 'WATER', v: `${socialData.water_actual}`, t: socialData.water_target, u: 'ml', color: '#00d9ff' },
                      { l: 'STREAK', v: `${weekly.logging_streak_days}`, t: 7, u: 'days', color: 'white' }
                    ].map((s, i) => (
                      <div key={i}>
                         <p style={{ fontSize: '9px', fontWeight: 900, color: '#5a5a5a', letterSpacing: '0.15em', marginBottom: '8px' }}>{s.l}</p>
                         <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: s.color }}>{s.v}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#5a5a5a' }}>{s.u}</span>
                         </div>
                      </div>
                    ))}
                 </div>

                 {/* Footer Note */}
                 <div style={{ position: 'relative', zIndex: 2, marginTop: '60px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'white', fontStyle: 'italic', lineHeight: 1.5, opacity: 0.8, textAlign: 'center' }}>
                       "{socialData.summary_text || "Good work today."}"
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
