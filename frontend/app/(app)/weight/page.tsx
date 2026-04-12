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
    // Load from localStorage client-side only
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

  // Analytics derived
  const latest = weights[0]?.weight_value
  const previous = weights[1]?.weight_value
  const delta = (latest && previous) ? (latest - previous) : null
  const lowest  = weights.length ? Math.min(...weights.map(w => w.weight_value)) : null
  const highest = weights.length ? Math.max(...weights.map(w => w.weight_value)) : null

  // BMI: need height — we'll let user input it or skip
  const bmi = (latest && height) ? (latest / ((parseFloat(height)/100) ** 2)) : null
  const bmiLabel = bmi === null ? null : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese'
  const bmiColor = bmi === null ? '#8a8a8a' : bmi < 18.5 ? '#00d9ff' : bmi < 25 ? '#d4ff00' : bmi < 30 ? '#ff2d55' : '#ff2d55'

  const goal = parseFloat(goalWeight) || null

  const TOOLTIP_STYLE = { backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', fontWeight: 700 }

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', padding: '28px 20px 120px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/settings')}
          style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #f0f0f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#0a0e27" />
        </button>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em' }}>Biometrics</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '2px' }}>body composition tracking ✨</p>
        </div>
      </div>

      {loading ? (
        <div style={{ background: 'white', border: '1px solid #f0f0f0', height: 300, borderRadius: '16px', opacity: 0.5 }} />
      ) : (
        <>
          {/* ── Stats Row ── */}
          {weights.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '6px' }}>Current</p>
                <p style={{ fontSize: '26px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em' }}>{latest}</p>
                <p style={{ fontSize: '10px', color: '#8a8a8a' }}>{unit}</p>
              </div>
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '6px' }}>Change</p>
                {delta !== null ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    {delta > 0 ? <TrendingUp size={16} color="#ff2d55" /> : delta < 0 ? <TrendingDown size={16} color="#d4ff00" /> : <Minus size={16} color="#8a8a8a" />}
                    <p style={{ fontSize: '22px', fontWeight: 800, color: delta > 0 ? '#ff2d55' : delta < 0 ? '#0a0e27' : '#8a8a8a', letterSpacing: '-0.03em' }}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    </p>
                  </div>
                ) : <p style={{ fontSize: '20px', color: '#8a8a8a' }}>—</p>}
                <p style={{ fontSize: '10px', color: '#8a8a8a' }}>since last</p>
              </div>
              {bmi !== null ? (
                <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '6px' }}>BMI</p>
                  <p style={{ fontSize: '26px', fontWeight: 800, color: bmiColor, letterSpacing: '-0.03em' }}>{bmi.toFixed(1)}</p>
                  <p style={{ fontSize: '10px', color: bmiColor, fontWeight: 700 }}>{bmiLabel}</p>
                </div>
              ) : (
                <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '9px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '6px' }}>BMI</p>
                  <input placeholder="height cm" type="number"
                    value={height}
                    onChange={e => { setHeight(e.target.value); localStorage.setItem('morsel_height', e.target.value) }}
                    style={{ width: '100%', textAlign: 'center', border: '2px solid #f0f0f0', borderRadius: '8px', padding: '6px', fontSize: '11px', fontWeight: 700, outline: 'none', color: '#0a0e27' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '20px', height: 260, marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.14em' }}>Weight Trend</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '10px', color: '#8a8a8a' }}>Goal:</label>
                  <input type="number" placeholder={unit} value={goalWeight}
                    onChange={e => { setGoalWeight(e.target.value); localStorage.setItem('morsel_goal_weight', e.target.value) }}
                    style={{ width: '56px', border: '1px solid #f0f0f0', borderRadius: '6px', padding: '3px 6px', fontSize: '11px', fontWeight: 700, outline: 'none', color: '#0a0e27' }}
                  />
                </div>
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#d4ff00" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#d4ff00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#8a8a8a', fontSize: 9, fontWeight: 700 }} tickLine={false} axisLine={false} dy={8} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#8a8a8a', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: '#f0f0f0', strokeWidth: 2 }} />
                  {goal && <ReferenceLine y={goal} stroke="#ff2d55" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `goal ${goal}${unit}`, position: 'right', fill: '#ff2d55', fontSize: 9 }} />}
                  <Area type="monotone" dataKey="weight" name={`Weight (${unit})`} stroke="#d4ff00" strokeWidth={2.5} fill="url(#wGrad)" strokeLinecap="round" dot={{ r: 3, fill: '#d4ff00', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Range row ── */}
          {weights.length >= 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Highest', value: highest, color: '#ff2d55' },
                { label: 'Lowest',  value: lowest,  color: '#d4ff00' },
              ].map(r => (
                <div key={r.label} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '36px', borderRadius: '4px', background: r.color }} />
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{r.label}</p>
                    <p style={{ fontSize: '22px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em' }}>{r.value}{unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Add form ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.15em' }}>
              {weights.length} entries
            </p>
            <button onClick={() => setShowForm(!showForm)}
              style={{ background: '#d4ff00', color: '#0a0e27', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.08em', cursor: 'pointer' }}>
              {showForm ? 'Cancel' : '+ Log Weight'}
            </button>
          </div>

          {showForm && (
            <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '20px', marginBottom: '12px', display: 'flex', flexWrap: 'wrap' as const, gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#8a8a8a', display: 'block', marginBottom: '6px' }}>Date</label>
                <input type="date" value={wDate} onChange={e => setWDate(e.target.value)}
                  style={{ width: '100%', border: '2px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', fontWeight: 700, outline: 'none', color: '#0a0e27', background: 'white' }} />
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#8a8a8a', display: 'block', marginBottom: '6px' }}>Weight ({unit})</label>
                <input type="number" step="0.1" value={wVal} onChange={e => setWVal(e.target.value)} placeholder="75.0"
                  style={{ width: '100%', border: '2px solid #f0f0f0', borderRadius: '10px', padding: '12px 14px', fontSize: '18px', fontWeight: 800, outline: 'none', color: '#0a0e27', background: 'white' }} />
              </div>
              <button onClick={handleSave} disabled={saving}
                style={{ height: '47px', padding: '0 20px', borderRadius: '10px', background: '#d4ff00', color: '#0a0e27', border: 'none', fontWeight: 900, fontSize: '13px', textTransform: 'uppercase' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {saving ? <Loader2 size={14} /> : <><Plus size={14} /> Log</>}
              </button>
            </div>
          )}

          {/* ── List ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weights.map((w, i) => {
              const prev = weights[i + 1]?.weight_value
              const d = prev !== undefined ? w.weight_value - prev : null
              return (
                <div key={w.id} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.02em' }}>{w.weight_value}</span>
                        <span style={{ fontSize: '11px', color: '#8a8a8a' }}>{unit}</span>
                        {d !== null && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: d > 0 ? '#ff2d55' : d < 0 ? '#d4ff00' : '#8a8a8a', marginLeft: '4px' }}>
                            {d > 0 ? `▲${d.toFixed(1)}` : d < 0 ? `▼${Math.abs(d).toFixed(1)}` : '—'}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>{w.date}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(w.id)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,45,85,0.15)', background: 'rgba(255,45,85,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={13} color="#ff2d55" />
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
