'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Plus, Clock, Pencil, Trash2, Copy, Loader2, X, Save, ChevronLeft, ChevronRight, Utensils } from 'lucide-react'
import QuickAddModal from '@/components/QuickAddModal'

interface MealEntry {
  id: string; meal_name: string; entry_text_raw: string; logged_at: string
  calories: number; protein_g: number; carbs_g: number; fat_g: number
  source_type: string; meal_type: string; notes?: string
}

const SRC_COLOR: Record<string, string> = { ai: '#d4ff00', db: '#00d9ff', template: 'white', manual: '#8a8a8a' }
const SRC_LABEL: Record<string, string> = { ai: 'COACH', db: 'DATABASE', template: 'TEMPLATE', manual: 'MANUAL' }

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
    { id: 'edit-name', label: 'Meal Name',   key: 'meal_name',  type: 'text',   suffix: '' },
    { id: 'edit-time', label: 'Log Time',    key: 'time',       type: 'time',   suffix: '' },
    { id: 'edit-cal',  label: 'Calories',    key: 'calories',   type: 'number', suffix: 'kcal' },
    { id: 'edit-prot', label: 'Protein',     key: 'protein_g',  type: 'number', suffix: 'g' },
    { id: 'edit-carbs',label: 'Carbs',       key: 'carbs_g',    type: 'number', suffix: 'g' },
    { id: 'edit-fat',  label: 'Fat',         key: 'fat_g',      type: 'number', suffix: 'g' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3, 4, 9, 0.8)', backdropFilter: 'blur(24px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '440px', background: 'var(--background)', borderRadius: 'var(--card-radius)', padding: '32px', border: '1px solid var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '-0.04em' }}>Edit Entry</h2>
          <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="white" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          {fields.map(({ id, label, key, type, suffix }) => (
            <div key={id} style={{ gridColumn: (key === 'meal_name') ? 'span 2' : 'span 1' }}>
              <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a8a8a', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input id={id} type={type}
                  value={String((vals as any)[key])}
                  onChange={e => setVals(v => ({ ...v, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                  style={{ width: '100%', borderRadius: '14px', padding: '14px 16px', paddingRight: suffix ? '52px' : '16px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
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
          style={{ width: '100%', padding: '18px', borderRadius: '16px', background: '#d4ff00', color: '#030409', border: 'none', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={20} /> Save Changes</>}
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
  const [date, setDate] = useState('')
  const [today, setToday] = useState('')

  useEffect(() => {
    const t = new Date().toISOString().split('T')[0]
    setToday(t)
    setDate(t)
  }, [])

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
  const isToday = date === today

  const S = {
    container: { 
      width: '100%',
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px 20px 140px', 
      minHeight: '100dvh', 
      background: '#030409', 
      color: 'white',
      boxSizing: 'border-box'
    } as React.CSSProperties,
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--card-radius)', padding: '24px', marginBottom: '16px', backdropFilter: 'blur(16px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', color: '#d4ff00' }}>Meal Log</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Your daily food history ✨</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '8px' }}>
          <button onClick={() => setDate(offsetDate(date, -1))} style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
             <ChevronLeft size={18} color="white" />
          </button>
          <span style={{ fontSize: '12px', fontWeight: 900, minWidth: '70px', textAlign: 'center' }}>{friendlyDate(date)}</span>
          <button onClick={() => setDate(offsetDate(date, 1))} disabled={isToday} style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: isToday ? 0.2 : 1 }}>
             <ChevronRight size={18} color="white" />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => <div key={i} style={{ ...S.card, height: 110, opacity: 0.3 }} />)}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
             <Utensils size={24} color="#5a5a5a" />
          </div>
          <p style={{ fontSize: '16px', fontWeight: 800 }}>No logs found</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Tap the + button to start loggin'.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {entries.map(entry => (
            <div key={entry.id} style={{ ...S.card, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: SRC_COLOR[entry.source_type] || 'white' }}>{SRC_LABEL[entry.source_type] || 'MANUAL'}</span>
                      <span style={{ width: '4px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
                      <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase' }}>{entry.meal_type?.replace('-', ' ')}</span>
                      <span style={{ width: '4px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#8a8a8a' }}>{formatTime(entry.logged_at)}</span>
                   </div>
                   <h3 style={{ fontSize: '18px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.meal_name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                   <button onClick={() => setEditEntry(entry)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={14} color="white" />
                   </button>
                   <button onClick={() => handleDelete(entry.id)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,45,85,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={14} color="#ff2d55" />
                   </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                 {[
                   { val: Math.round(entry.calories), color: '#00d9ff', label: 'Cals' },
                   { val: Math.round(entry.protein_g), color: '#d4ff00', label: 'Prot' },
                   { val: Math.round(entry.carbs_g), color: '#ff2d55', label: 'Carb' },
                   { val: Math.round(entry.fat_g), color: '#8a8a8a', label: 'Fat' }
                 ].map(m => (
                   <div key={m.label} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '15px', fontWeight: 900, color: m.color }}>{m.val}</p>
                      <p style={{ fontSize: '8px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' }}>{m.label}</p>
                   </div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      {isToday && (
        <button onClick={() => setShowAdd(true)} style={{ position: 'fixed', bottom: '92px', left: '50%', transform: 'translateX(-50%)', width: '64px', height: '64px', borderRadius: '22px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px rgba(212,255,0,0.4)', zIndex: 50 }}>
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {showAdd && <QuickAddModal token={token} initialDate={date} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(token, date) }} />}
      {editEntry && <EditModal entry={editEntry} token={token} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); load(token, date) }} />}
    </div>
  )
}
