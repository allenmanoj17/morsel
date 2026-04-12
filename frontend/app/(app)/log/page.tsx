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
const SRC_LABEL: Record<string, string> = { ai: 'AI', db: 'DB', template: 'TPL', manual: 'MAN' }

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
    { id: 'edit-name', label: 'Meal Label',  key: 'meal_name',  type: 'text',   suffix: '' },
    { id: 'edit-time', label: 'Logged Time', key: 'time',       type: 'time',   suffix: '' },
    { id: 'edit-cal',  label: 'Calories',    key: 'calories',   type: 'number', suffix: 'kcal' },
    { id: 'edit-prot', label: 'Protein',     key: 'protein_g',  type: 'number', suffix: 'g' },
    { id: 'edit-carbs',label: 'Carbs',       key: 'carbs_g',    type: 'number', suffix: 'g' },
    { id: 'edit-fat',  label: 'Fat',         key: 'fat_g',      type: 'number', suffix: 'g' },
    { id: 'edit-notes',label: 'Notes',       key: 'notes',      type: 'text',   suffix: '' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,39,0.5)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '540px', background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ width: '36px', height: '3px', background: '#f0f0f0', borderRadius: '99px', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0a0e27' }}>Edit Entry</h2>
          <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #f0f0f0', background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#0a0e27" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {fields.map(({ id, label, key, type, suffix }) => (
            <div key={id} style={{ gridColumn: (key === 'meal_name' || key === 'notes') ? 'span 2' : 'span 1' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#8a8a8a', display: 'block', marginBottom: '5px' }}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input id={id} type={type}
                  value={String((vals as any)[key])}
                  onChange={e => setVals(v => ({ ...v, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                  style={{ width: '100%', borderRadius: '10px', padding: '12px 16px', paddingRight: suffix ? '44px' : '16px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '2px solid #f0f0f0', background: 'white', color: '#0a0e27' }}
                />
                {suffix && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase' as const }}>{suffix}</span>}
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
          style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#d4ff00', color: '#0a0e27', border: 'none', fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {saving ? <Loader2 size={14} /> : <><Save size={16} /> Save Changes</>}
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
    if (!confirm('Delete this entry?')) return
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

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', padding: '28px 20px 120px' }}>

      {/* ── Date Navigator ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em' }}>Meal Log</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '2px' }}>tracking your intake ✨</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '6px 8px' }}>
          <button onClick={() => changeDate(-1)} style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} color="#0a0e27" />
          </button>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0a0e27', minWidth: '70px', textAlign: 'center' }}>
            {friendlyDate(date)}
          </span>
          <button onClick={() => changeDate(1)} disabled={isToday} style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: isToday ? 'not-allowed' : 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isToday ? 0.3 : 1 }}>
            <ChevronRight size={16} color="#0a0e27" />
          </button>
        </div>
      </div>

      {/* ── Day Summary ── */}
      {entries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Calories', value: Math.round(totalCals), color: '#00d9ff', unit: '' },
            { label: 'Protein',  value: Math.round(totalProt), color: '#d4ff00', unit: 'g' },
            { label: 'Carbs',    value: Math.round(entries.reduce((s,e) => s+e.carbs_g,0)), color: '#0a0e27', unit: 'g' },
            { label: 'Fat',      value: Math.round(entries.reduce((s,e) => s+e.fat_g,0)),   color: '#0a0e27', unit: 'g' },
          ].map(m => (
            <div key={m.label} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{m.value}{m.unit}</p>
              <p style={{ fontSize: '9px', fontWeight: 700, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '3px' }}>{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Meal Count badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 2px' }}>
        <p style={{ fontSize: '11px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          {entries.length} meal{entries.length !== 1 ? 's' : ''}
        </p>
        {!isToday && (
          <button onClick={() => setDate(today)} style={{ fontSize: '11px', fontWeight: 800, color: '#00d9ff', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            → Back to Today
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3].map(i => <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0', height: '96px', borderRadius: '14px', opacity: 0.5 }} />)}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🍽</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#0a0e27' }}>nothing logged</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>
            {isToday ? 'tap + to start your day' : 'no meals logged this day'}
          </p>
          {isToday && (
            <button
              onClick={async () => {
                const yest = offsetDate(today, -1)
                const yestMeals = await api.getMeals(yest, token)
                if (yestMeals.length === 0) return alert('No meals found from yesterday')
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
                marginTop: '20px', background: 'none', border: '2px solid #f0f0f0',
                borderRadius: '10px', padding: '10px 16px', fontSize: '12px',
                fontWeight: 800, color: '#0a0e27', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}
            >
              Copy from Yesterday
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {entries.map(entry => (
            <div key={entry.id} className="task-enter" style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' as const }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '5px', padding: '2px 7px' }}>
                      <Clock size={9} color="#8a8a8a" />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#8a8a8a' }}>{formatTime(entry.logged_at)}</span>
                    </span>
                    <span style={{
                      background: SRC_COLOR[entry.source_type] || '#8a8a8a',
                      color: entry.source_type === 'manual' ? '#fff' : '#0a0e27',
                      borderRadius: '4px', padding: '2px 6px',
                      fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em'
                    }}>{SRC_LABEL[entry.source_type] || entry.source_type}</span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0a0e27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.meal_name}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  {isToday && (
                    <button title="Duplicate" onClick={() => handleDuplicate(entry)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #f0f0f0', background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Copy size={12} color="#8a8a8a" />
                    </button>
                  )}
                  <button id={`edit-${entry.id}`} onClick={() => setEditEntry(entry)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #f0f0f0', background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={12} color="#0a0e27" />
                  </button>
                  <button id={`del-${entry.id}`} onClick={() => handleDelete(entry.id)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,45,85,0.2)', background: 'rgba(255,45,85,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} color="#ff2d55" />
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '5px' }}>
                {[
                  { label: 'CAL', value: entry.calories, color: '#00d9ff' },
                  { label: 'PRO', value: entry.protein_g, color: '#d4ff00' },
                  { label: 'CHO', value: entry.carbs_g,  color: '#0a0e27' },
                  { label: 'FAT', value: entry.fat_g,    color: '#0a0e27' },
                ].map(m => (
                  <div key={m.label} style={{ background: '#fafafa', borderRadius: '8px', padding: '7px 4px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{Math.round(m.value)}</p>
                    <p style={{ fontSize: '8px', fontWeight: 700, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB — only show on today */}
      {isToday && (
        <button id="log-add-fab" onClick={() => setShowAdd(true)}
          style={{
            position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)',
            width: '56px', height: '56px', borderRadius: '16px',
            background: '#d4ff00', color: '#0a0e27', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(212,255,0,0.5)', zIndex: 50,
          }}
        >
          <Plus size={22} strokeWidth={3} />
        </button>
      )}

      {showAdd && <QuickAddModal token={token} initialDate={date} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(token, date) }} />}
      {editEntry && <EditModal entry={editEntry} token={token} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); load(token, date) }} />}
    </div>
  )
}
