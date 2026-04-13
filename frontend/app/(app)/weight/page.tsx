'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { Plus, Trash2, ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function WeightPage() {
  const [weights, setWeights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [wVal, setWVal] = useState('')
  const [wDate, setWDate] = useState(new Date().toISOString().substring(0, 10))
  const [saving, setSaving] = useState(false)
  const [goalWeight, setGoalWeight] = useState('')
  const [height, setHeight] = useState('')
  const [unit, setUnit] = useState('kg')
  const router = useRouter()

  const loadData = useCallback(async (tok: string) => {
    try { const data = await api.getWeights(tok); setWeights(data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('morsel_goal_weight')
    if (stored) setGoalWeight(stored)
    const storedH = localStorage.getItem('morsel_height')
    if (storedH) setHeight(storedH)
    const storedU = localStorage.getItem('morsel_unit')
    if (storedU) setUnit(storedU)

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
      setShowForm(false); setWVal(''); loadData(token)
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
  const lowest  = weights.length ? Math.min(...weights.map(w => w.weight_value)) : null
  const highest = weights.length ? Math.max(...weights.map(w => w.weight_value)) : null
  const bmi = (latest && height) ? (latest / ((parseFloat(height)/100) ** 2)) : null
  const bmiLabel = bmi === null ? null : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese'
  const bmiColor = bmi === null ? '#8a8a8a' : bmi < 18.5 ? '#00d9ff' : bmi < 25 ? '#d4ff00' : bmi < 30 ? '#ff2d55' : '#ff2d55'
  const goal = parseFloat(goalWeight) || null

  const TOOLTIP_STYLE = { backgroundColor: '#0a0e27', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', fontWeight: 800, color: 'white' }

  const S = {
    container: { maxWidth: '540px', margin: '0 auto', padding: '40px 20px 120px', minHeight: '100dvh', background: '#0a0e27', color: 'white' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '10px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => router.push('/settings')}
          style={{ width: '44px', height: '44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#8a8a8a" />
        </button>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em' }}>Biometrics</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>body composition analysis ✨</p>
        </div>
      </div>

      {loading ? (
        <div style={{ ...S.card, height: 300, opacity: 0.3 }} />
      ) : (
        <>
          {/* ── Stats Row ── */}
          {weights.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={S.card}>
                <p style={S.label}>Current</p>
                <p style={{ fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-0.04em' }}>{latest}</p>
                <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 700, marginTop: '2px' }}>{unit}</p>
              </div>
              <div style={S.card}>
                <p style={S.label}>Shift</p>
                {delta !== null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {delta > 0 ? <TrendingUp size={18} color="#ff2d55" /> : delta < 0 ? <TrendingDown size={18} color="#d4ff00" /> : <Minus size={18} color="#8a8a8a" />}
                    <p style={{ fontSize: '24px', fontWeight: 900, color: delta > 0 ? '#ff2d55' : delta < 0 ? 'white' : '#8a8a8a', letterSpacing: '-0.04em' }}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    </p>
                  </div>
                ) : <p style={{ fontSize: '22px', fontWeight: 800, color: '#8a8a8a' }}>—</p>}
                <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 700, marginTop: '2px' }}>prev: {previous || '—'}</p>
              </div>
              {bmi !== null ? (
                <div style={S.card}>
                  <p style={S.label}>BMI</p>
                  <p style={{ fontSize: '28px', fontWeight: 900, color: bmiColor, letterSpacing: '-0.04em' }}>{bmi.toFixed(1)}</p>
                  <p style={{ fontSize: '10px', color: bmiColor, fontWeight: 800 }}>{bmiLabel}</p>
                </div>
              ) : (
                <div style={{ ...S.card, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={S.label}>BMI</p>
                  <input placeholder="H (cm)" type="number"
                    value={height}
                    onChange={e => { setHeight(e.target.value); localStorage.setItem('morsel_height', e.target.value) }}
                    style={{ width: '100%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px', fontSize: '12px', fontWeight: 800, outline: 'none', color: 'white', background: 'rgba(255,255,255,0.03)' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Chart Card */}
          {chartData.length > 0 && (
            <div style={{ ...S.card, height: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <p style={S.label}>Weight Pipeline</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 800 }}>GOAL</label>
                  <input type="number" placeholder={unit} value={goalWeight}
                    onChange={e => { setGoalWeight(e.target.value); localStorage.setItem('morsel_goal_weight', e.target.value) }}
                    style={{ width: '60px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', fontWeight: 800, outline: 'none', color: 'white', background: 'rgba(255,255,255,0.03)' }}
                  />
                </div>
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#d4ff00" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#d4ff00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#8a8a8a', fontSize: 10, fontWeight: 800 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                  {goal && <ReferenceLine y={goal} stroke="#ff2d55" strokeDasharray="6 6" strokeWidth={1.5} label={{ value: `TARGET`, position: 'right', fill: '#ff2d55', fontSize: 10, fontWeight: 900 }} />}
                  <Area type="monotone" dataKey="weight" name={`Mass`} stroke="#d4ff00" strokeWidth={3} fill="url(#wGrad)" strokeLinecap="round" dot={{ r: 4, fill: '#d4ff00', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Range Cards ── */}
          {weights.length >= 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'System High', value: highest, color: '#ff2d55' },
                { label: 'System Low',  value: lowest,  color: '#d4ff00' },
              ].map(r => (
                <div key={r.label} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '14px', marginBottom: 0 }}>
                  <div style={{ width: '4px', height: '40px', borderRadius: '4px', background: r.color }} />
                  <div>
                    <p style={S.label}>{r.label}</p>
                    <p style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>{r.value}{unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Action Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
            <p style={S.label}>{weights.length} entries detected</p>
            <button onClick={() => setShowForm(!showForm)}
              style={{ background: '#d4ff00', color: '#0a0e27', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              {showForm ? 'Cancel Operation' : '+ Initialize Log'}
            </button>
          </div>

          {showForm && (
            <div style={{ ...S.card, display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', border: '1px solid #d4ff00', background: 'rgba(212,255,0,0.02)' }}>
              <div style={{ flex: '1 1 140px' }}>
                <label style={S.label}>Deployment Date</label>
                <input type="date" value={wDate} onChange={e => setWDate(e.target.value)}
                  style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 700, outline: 'none', color: 'white', background: 'rgba(255,255,255,0.03)' }} />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={S.label}>Mass Value</label>
                <input type="number" step="0.1" value={wVal} onChange={e => setWVal(e.target.value)} placeholder="00.0" autoFocus
                  style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', fontSize: '20px', fontWeight: 900, outline: 'none', color: 'white', background: 'rgba(255,255,255,0.03)' }} />
              </div>
              <button onClick={handleSave} disabled={saving}
                style={{ height: '54px', padding: '0 24px', borderRadius: '14px', background: '#d4ff00', color: '#0a0e27', border: 'none', fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
              </button>
            </div>
          )}

          {/* ── Bio History ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {weights.map((w, i) => {
              const prev = weights[i + 1]?.weight_value
              const d = prev !== undefined ? w.weight_value - prev : null
              return (
                <div key={w.id} style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', marginBottom: 0 }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-0.04em' }}>{w.weight_value}</span>
                        <span style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 700 }}>{unit.toUpperCase()}</span>
                        {d !== null && (
                          <div style={{ fontSize: '11px', fontWeight: 900, color: d > 0 ? '#ff2d55' : d < 0 ? '#d4ff00' : '#8a8a8a', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {d > 0 ? <TrendingUp size={10}/> : d < 0 ? <TrendingDown size={10}/> : null}
                            {Math.abs(d).toFixed(1)}
                          </div>
                        )}
                     </div>
                     <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '4px' }}>{new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <button onClick={() => handleDelete(w.id)}
                    style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid rgba(255,45,85,0.1)', background: 'rgba(255,45,85,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={16} color="#ff2d55" />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
