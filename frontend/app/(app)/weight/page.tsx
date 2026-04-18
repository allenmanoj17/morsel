'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { getLocalDateString } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Plus, Trash2, ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function WeightPage() {
  const [weights, setWeights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [wVal, setWVal] = useState('')
  const [wDate, setWDate] = useState(getLocalDateString())
  const [saving, setSaving] = useState(false)
  const [height, setHeight] = useState('')
  const router = useRouter()

  const loadData = useCallback(async (tok: string) => {
    try { 
      const [data, onb] = await Promise.all([
        api.getWeights(tok),
        api.getOnboarding(tok).catch(() => null)
      ])
      setWeights(data) 
      if (onb?.height_cm) setHeight(onb.height_cm.toString())
    }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setToken(session.access_token); loadData(session.access_token) }
    })
  }, [loadData])

  const handleSave = async () => {
    const val = parseFloat(wVal)
    if (!val || val <= 0) return alert('Enter a valid weight')
    setSaving(true)
    try {
      await api.createWeight({ date: wDate, weight_value: val, unit: 'kg' }, token)
      setWVal('')
      loadData(token)
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    await api.deleteWeight(id, token); loadData(token)
  }

  const chartData = [...weights].reverse().map(w => ({ date: w.date.substring(5), weight: w.weight_value }))
  const latest = weights[0]?.weight_value
  const previous = weights[1]?.weight_value
  const delta = (latest && previous) ? (latest - previous) : null
  
  const bmi = (latest && height) ? (latest / ((parseFloat(height)/100) ** 2)) : null
  
  const getBMICategory = (val: number | null) => {
    if (val === null) return { label: null, color: '#8a8a8a' }
    if (val < 18.5) return { label: 'Low', color: '#00d9ff' }
    if (val < 25) return { label: 'Healthy', color: '#d4ff00' }
    if (val < 30) return { label: 'High', color: '#ffa500' }
    return { label: 'Very high', color: '#ff2d55' }
  }
  const bmiCat = getBMICategory(bmi)

  const TOOLTIP_STYLE = { backgroundColor: '#030409', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', fontWeight: 800, color: 'white' }

  const S = {
    container: { width: '100%', maxWidth: '480px', margin: '0 auto', padding: 'clamp(18px, 4vw, 24px) clamp(14px, 3.5vw, 16px) clamp(104px, 22vw, 120px)', minHeight: '100dvh', background: '#030409', color: 'white', display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: 'clamp(16px, 4vw, 24px)', marginBottom: 'clamp(12px, 3vw, 16px)', width: '100%', boxSizing: 'border-box' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '10px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => router.push('/settings')}
          style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={16} color="white" />
        </button>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.04em' }}>Weight</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>Track your weight over time</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
           {[1,2].map(i => <div key={i} style={{ ...S.card, height: 180, opacity: 0.3 }} />)}
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          {weights.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={S.card}>
                <p style={S.label}>Current</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                   <span style={{ fontSize: '32px', fontWeight: 900, color: 'white' }}>{latest}</span>
                   <span style={{ fontSize: '12px', fontWeight: 800, color: '#8a8a8a' }}>KG</span>
                </div>
                {delta !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                    {delta > 0 ? <TrendingUp size={14} color="#ff2d55" /> : delta < 0 ? <TrendingDown size={14} color="#d4ff00" /> : <Minus size={14} color="#8a8a8a" />}
                    <span style={{ fontSize: '12px', fontWeight: 800, color: delta > 0 ? '#ff2d55' : delta < 0 ? '#d4ff00' : '#8a8a8a' }}>
                      {Math.abs(delta).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <div style={S.card}>
                <p style={S.label}>BMI</p>
                {bmi !== null ? (
                  <>
                    <p style={{ fontSize: '32px', fontWeight: 900, color: bmiCat.color }}>{bmi.toFixed(1)}</p>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: bmiCat.color, marginTop: '2px' }}>{bmiCat.label}</p>
                  </>
                ) : (
                  <p style={{ fontSize: '11px', color: '#5a5a5a', fontWeight: 800 }}>Add your height to see BMI</p>
                )}
              </div>
            </div>
          )}

          {/* ── Chart ── */}
          {chartData.length > 0 && (
            <div style={{ ...S.card, height: 260 }}>
              <p style={S.label}>Trend</p>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#d4ff00" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#d4ff00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#8a8a8a', fontSize: 10, fontWeight: 800 }} tickLine={false} axisLine={false} dy={8} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="weight" name={`KG`} stroke="#d4ff00" strokeWidth={3} fill="url(#wGrad)" strokeLinecap="round" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Add Card ── */}
          <div style={{ ...S.card, background: 'rgba(212,255,0,0.03)', border: '1px solid rgba(212,255,0,0.1)' }}>
             <p style={{ ...S.label, color: '#d4ff00' }}>Add Weight</p>
             <div style={{ display: 'flex', gap: '12px', marginTop: '12px', marginBottom: '12px' }}>
                <input
                  type="date"
                  value={wDate}
                  onChange={e => setWDate(e.target.value)}
                  style={{ border: 'none', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '16px', fontSize: '14px', fontWeight: 700, color: 'white', outline: 'none' }}
                />
             </div>
             <div style={{ display: 'flex', gap: '12px' }}>
                <input type="number" step="0.1" value={wVal} onChange={e => setWVal(e.target.value)} placeholder="00.0" 
                  style={{ flex: 1, border: 'none', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '16px', fontSize: '20px', fontWeight: 900, color: 'white', outline: 'none' }} />
                <button onClick={handleSave} disabled={saving}
                  style={{ background: '#d4ff00', color: '#030409', borderRadius: '14px', padding: '0 24px', border: 'none', fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}>
                  {saving ? <Loader2 size={20} className="animate-spin" /> : 'Save'}
                </button>
             </div>
          </div>

          {/* ── History ── */}
          <div style={{ marginTop: '16px' }}>
            <p style={S.label}>History</p>
            {weights.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {weights.map(w => (
                  <div key={w.id} style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', marginBottom: 0 }}>
                    <div>
                      <span style={{ fontSize: '18px', fontWeight: 900 }}>{w.weight_value}</span>
                      <span style={{ fontSize: '10px', color: '#8a8a8a', marginLeft: '6px', fontWeight: 800 }}>KG</span>
                      <p style={{ fontSize: '10px', color: '#5a5a5a', fontWeight: 800, marginTop: '2px' }}>{new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <button onClick={() => handleDelete(w.id)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,45,85,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={16} color="#ff2d55" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...S.card, textAlign: 'center', color: '#8a8a8a' }}>
                No weight entries yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
