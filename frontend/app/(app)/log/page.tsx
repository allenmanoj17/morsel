'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Plus, Clock, Pencil, Trash2, Copy, Loader2, X, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import QuickAddModal from '@/components/QuickAddModal'

interface MealEntry {
  id: string; meal_name: string; entry_text_raw: string; logged_at: string
  calories: number; protein_g: number; carbs_g: number; fat_g: number
  source_type: string; notes?: string
}

const SRC_COLOR: Record<string, string> = { ai: '#ff2d55', db: '#00d9ff', template: '#d4ff00', manual: '#8a8a8a' }
const SRC_LABEL: Record<string, string> = { ai: 'AI_INTEL', db: 'CORE_DB', template: 'PROTOCOL', manual: 'MANUAL' }

function EditModal({ entry, token, onClose, onSaved }: {
  entry: MealEntry; token: string; onClose: () => void; onSaved: () => void
}) {
  const [vals, setVals] = useState({
    meal_name: entry.meal_name, calories: entry.calories,
    protein_g: entry.protein_g, carbs_g: entry.carbs_g, fat_g: entry.fat_g, notes: entry.notes || '',
    time: new Date(entry.logged_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
  })
  const [saving, setSaving] = useState(false)

  const fields = [
    { id: 'edit-name', label: 'Fuel Label',  key: 'meal_name',  type: 'text',   suffix: '' },
    { id: 'edit-time', label: 'Log Time',    key: 'time',       type: 'time',   suffix: '' },
    { id: 'edit-cal',  label: 'Energy',      key: 'calories',   type: 'number', suffix: 'kcal' },
    { id: 'edit-prot', label: 'Protein',     key: 'protein_g',  type: 'number', suffix: 'g' },
    { id: 'edit-carbs',label: 'Carbs',       key: 'carbs_g',    type: 'number', suffix: 'g' },
    { id: 'edit-fat',  label: 'Fat',         key: 'fat_g',      type: 'number', suffix: 'g' },
    { id: 'edit-notes',label: 'Intel Notes', key: 'notes',      type: 'text',   suffix: '' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,39,0.7)', backdropFilter: 'blur(12px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '540px', background: '#0a0e27', borderRadius: '32px 32px 0 0', padding: '32px 24px 48px', borderTop: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 -10px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ width: '40px', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', margin: '0 auto 24px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '-0.04em' }}>Calibrate Entry</h2>
          <button onClick={onClose} style={{ width: '44px', height: '44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color="#8a8a8a" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          {fields.map(({ id, label, key, type, suffix }) => (
            <div key={id} style={{ gridColumn: (key === 'meal_name' || key === 'notes') ? 'span 2' : 'span 1' }}>
              <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a8a8a', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input id={id} type={type}
                  value={String((vals as any)[key])}
                  onChange={e => setVals(v => ({ ...v, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                  style={{ width: '100%', borderRadius: '14px', padding: '14px 18px', paddingRight: suffix ? '52px' : '18px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
                />
                {suffix && <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' }}>{suffix}</span>}
              </div>
            </div>
          ))}
        </div>
        <button id="save-edit-btn"
          onClick={async () => {
            setSaving(true);
            try {
              const datePart = entry.logged_at.split('T')[0]
              const loggedAt = new Date(`${datePart}T${vals.time}:00`).toISOString()
              await api.updateMeal(entry.id, { ...vals, logged_at: loggedAt }, token);
              onSaved()
            } catch {} finally { setSaving(false) }
          }}
          disabled={saving}
          style={{ width: '100%', padding: '20px', borderRadius: '16px', background: '#d4ff00', color: '#0a0e27', border: 'none', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 12px 32px rgba(212,255,0,0.3)' }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={20} /> Update Intel</>}
        </button>
      </div>
    </div>
  )
}

function offsetDate(base: string, delta: number) {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

function friendlyDate(iso: string) {
  const today = new Date().toISOString().split('T')[0]
  const yest  = offsetDate(today, -1)
  if (iso === today) return 'Today'
  if (iso === yest)  return 'Yesterday'
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function LogPage() {
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editEntry, setEditEntry] = useState<MealEntry | null>(null)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async (tok: string, d: string) => {
    setLoading(true)
    try { const data = await api.getMeals(d, tok); setEntries(data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setToken(session.access_token); load(session.access_token, date) }
    })
  }, [load, date])

  const handleDelete = async (id: string) => {
    if (!confirm('Decommission this entry?')) return
    await api.deleteMeal(id, token); load(token, date)
  }

  const handleDuplicate = async (entry: MealEntry) => {
    await api.createMeal({
      meal_name: entry.meal_name, entry_text_raw: entry.entry_text_raw,
      logged_at: new Date().toISOString(),
      calories: entry.calories, protein_g: entry.protein_g,
      carbs_g: entry.carbs_g, fat_g: entry.fat_g, source_type: 'manual',
    }, token)
    load(token, date)
  }

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const totalCals = entries.reduce((s, e) => s + e.calories, 0)
  const totalProt = entries.reduce((s, e) => s + e.protein_g, 0)
  const isToday = date === today

  const changeDate = (delta: number) => {
    setDate(prev => offsetDate(prev, delta))
  }

  const S = {
    container: { maxWidth: '540px', margin: '0 auto', padding: '40px 20px 120px', minHeight: '100dvh', background: '#0a0e27', color: 'white' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px', marginLeft: '4px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>

      {/* ── Date Navigator ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em' }}>Meal Log</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>tracking your trajectory ✨</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '8px 12px' }}>
          <button onClick={() => changeDate(-1)} style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#8a8a8a" />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'white', minWidth: '85px', textAlign: 'center', letterSpacing: '-0.01em' }}>
            {friendlyDate(date)}
          </span>
          <button onClick={() => changeDate(1)} disabled={isToday} style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: isToday ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isToday ? 0.2 : 1 }}>
            <ChevronRight size={18} color="#8a8a8a" />
          </button>
        </div>
      </div>

      {/* ── Day Summary ── */}
      {entries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'Energy', value: Math.round(totalCals), color: '#00d9ff', unit: '' },
            { label: 'Protein',  value: Math.round(totalProt), color: '#d4ff00', unit: 'g' },
            { label: 'Carbs',    value: Math.round(entries.reduce((s,e) => s+e.carbs_g,0)), color: 'white', unit: 'g' },
            { label: 'Fat',      value: Math.round(entries.reduce((s,e) => s+e.fat_g,0)),   color: 'white', unit: 'g' },
          ].map(m => (
            <div key={m.label} style={{ ...S.card, padding: '16px 8px', textAlign: 'center', marginBottom: 0 }}>
              <p style={{ fontSize: '20px', fontWeight: 900, color: m.color, letterSpacing: '-0.03em' }}>{m.value}{m.unit}</p>
              <p style={{ fontSize: '9px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '4px' }}>{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── List Control ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
        <p style={S.label}>
          {entries.length} meals recognized
        </p>
        {!isToday && (
          <button onClick={() => setDate(today)} style={{ fontSize: '11px', fontWeight: 900, color: '#d4ff00', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            → Jump to Current
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => <div key={i} style={{ ...S.card, height: '110px', opacity: 0.3 }} />)}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '80px 24px' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🍽</p>
          <p style={{ fontSize: '18px', fontWeight: 800 }}>System Idle</p>
          <p style={{ fontSize: '14px', color: '#8a8a8a', marginTop: '6px', lineHeight: 1.5 }}>
            {isToday ? 'Initialize tracking for the current cycle.' : 'No data recorded for this biological period.'}
          </p>
          {isToday && (
            <button
              onClick={async () => {
                const yest = offsetDate(today, -1)
                const yestMeals = await api.getMeals(yest, token)
                if (yestMeals.length === 0) return alert('No cycle data found from previous period.')
                for (const m of yestMeals) {
                  await api.createMeal({
                    meal_name: m.meal_name, entry_text_raw: m.entry_text_raw,
                    logged_at: new Date().toISOString(),
                    calories: m.calories, protein_g: m.protein_g,
                    carbs_g: m.carbs_g, fat_g: m.fat_g, source_type: 'manual'
                  }, token)
                }
                load(token, date)
              }}
              style={{
                marginTop: '32px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', padding: '14px 24px', fontSize: '12px',
                fontWeight: 900, color: 'white', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.2s ease'
              }}
            >
              Sync from Previous Cycle
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {entries.map(entry => (
            <div key={entry.id} style={{ ...S.card, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '4px 8px' }}>
                      <Clock size={10} color="#8a8a8a" />
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#8a8a8a' }}>{formatTime(entry.logged_at)}</span>
                    </span>
                    <span style={{
                      background: SRC_COLOR[entry.source_type] || '#8a8a8a',
                      color: '#0a0e27',
                      borderRadius: '5px', padding: '3px 8px',
                      fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em'
                    }}>{SRC_LABEL[entry.source_type] || entry.source_type}</span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.meal_name}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {isToday && (
                    <button title="Replicate" onClick={() => handleDuplicate(entry)}
                      style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Copy size={14} color="#8a8a8a" />
                    </button>
                  )}
                  <button id={`edit-${entry.id}`} onClick={() => setEditEntry(entry)}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={14} color="#8a8a8a" />
                  </button>
                  <button id={`del-${entry.id}`} onClick={() => handleDelete(entry.id)}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,45,85,0.1)', background: 'rgba(255,45,85,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} color="#ff2d55" />
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                {[
                  { label: 'Energy', value: entry.calories,  color: '#00d9ff' },
                  { label: 'Prot',   value: entry.protein_g,  color: '#d4ff00' },
                  { label: 'Carb',   value: entry.carbs_g,    color: 'white' },
                  { label: 'Fat',    value: entry.fat_g,      color: 'white' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '10px 4px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: m.color, letterSpacing: '-0.04em' }}>{Math.round(m.value)}</p>
                    <p style={{ fontSize: '8px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '2px' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      {isToday && (
        <button id="log-add-fab" onClick={() => setShowAdd(true)}
          style={{
            position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)',
            width: '64px', height: '64px', borderRadius: '20px',
            background: '#d4ff00', color: '#0a0e27', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(212,255,0,0.4)', zIndex: 50, transition: 'all 0.2s ease',
          }}
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {showAdd && <QuickAddModal token={token} initialDate={date} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(token, date) }} />}
      {editEntry && <EditModal entry={editEntry} token={token} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); load(token, date) }} />}
    </div>
  )
}
