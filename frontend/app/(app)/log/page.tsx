'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { addDaysToDateString, getLocalDateString, localDateTimeToUtcIso } from '@/lib/utils'
import { useCurrentDateString } from '@/lib/useCurrentDateString'
import { Plus, Clock, Pencil, Trash2, Copy, Loader2, X, Save, ChevronLeft, ChevronRight, Utensils, Bookmark, ChevronDown } from 'lucide-react'
import QuickAddModal from '@/components/QuickAddModal'

interface MealEntry {
  id: string; meal_name: string; entry_text_raw: string; logged_at: string
  meal_date?: string
  calories: number; protein_g: number; carbs_g: number; fat_g: number
  source_type: string; meal_type: string; notes?: string; items?: any[]
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
  const [error, setError] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState(entry.meal_name)
  const [templateDescription, setTemplateDescription] = useState(entry.notes || '')

  const fields = [
    { id: 'edit-name', label: 'Meal Name',   key: 'meal_name',  type: 'text',   suffix: '', min: 1, max: 100 },
    { id: 'edit-time', label: 'Log Time',    key: 'time',       type: 'time',   suffix: '' },
    { id: 'edit-cal',  label: 'Calories',    key: 'calories',   type: 'number', suffix: 'kcal', min: 0, max: 10000 },
    { id: 'edit-prot', label: 'Protein',     key: 'protein_g',  type: 'number', suffix: 'g', min: 0, max: 500 },
    { id: 'edit-carbs',label: 'Carbs',       key: 'carbs_g',    type: 'number', suffix: 'g', min: 0, max: 500 },
    { id: 'edit-fat',  label: 'Fat',         key: 'fat_g',      type: 'number', suffix: 'g', min: 0, max: 200 },
  ]
  
  const isValid = () => {
    if (!vals.meal_name.trim()) return false
    if (vals.calories < 0 || vals.protein_g < 0 || vals.carbs_g < 0 || vals.fat_g < 0) return false
    return true
  }

  const macroSummary = [
    { label: 'Calories', value: vals.calories, suffix: 'kcal', color: '#00d9ff' },
    { label: 'Protein', value: vals.protein_g, suffix: 'g', color: '#d4ff00' },
    { label: 'Carbs', value: vals.carbs_g, suffix: 'g', color: '#ff2d55' },
    { label: 'Fat', value: vals.fat_g, suffix: 'g', color: '#8a8a8a' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3, 4, 9, 0.8)', backdropFilter: 'blur(24px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '440px', maxHeight: '85dvh', overflowY: 'auto', background: 'var(--background)', borderRadius: 'var(--card-radius)', padding: '32px', border: '1px solid var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '-0.04em' }}>Edit Entry</h2>
          <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="white" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginBottom: '24px' }}>
          {macroSummary.map(item => (
            <div key={item.label} style={{ borderRadius: '16px', padding: '14px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <p style={{ fontSize: '17px', fontWeight: 900, color: item.color }}>{Math.round(item.value || 0)}</p>
              <p style={{ fontSize: '9px', color: '#8a8a8a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '4px' }}>{item.label}</p>
              <p style={{ fontSize: '9px', color: '#5a5a5a', marginTop: '2px' }}>{item.suffix}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          {fields.map(({ id, label, key, type, suffix }) => (
            <div key={id} style={{ gridColumn: (key === 'meal_name') ? 'span 2' : 'span 1' }}>
              <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a8a8a', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input id={id} type={type}
                  value={String((vals as any)[key])}
                  onChange={e => {
                    let newVal: any = e.target.value
                    if (type === 'number') {
                      newVal = parseFloat(newVal) || 0
                      // Validate min/max
                      if ('min' in (fields.find(f => f.key === key) || {})) {
                        const field = fields.find(f => f.key === key)!
                        newVal = Math.max(field.min || 0, Math.min(field.max || 999999, newVal))
                      }
                    }
                    setVals(v => ({ ...v, [key]: newVal }))
                    setError('')
                  }}
                  min={"min" in (fields.find(f => f.key === key) || {}) ? (fields.find(f => f.key === key) || {}).min : undefined}
                  max={"max" in (fields.find(f => f.key === key) || {}) ? (fields.find(f => f.key === key) || {}).max : undefined}
                  style={{ width: '100%', borderRadius: '14px', padding: '14px 16px', paddingRight: suffix ? '52px' : '16px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
                />
                {suffix && <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' }}>{suffix}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a8a8a', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>Notes</label>
          <textarea
            value={vals.notes}
            onChange={e => {
              setVals(v => ({ ...v, notes: e.target.value }))
              setError('')
            }}
            placeholder="Add a short note"
            rows={3}
            style={{ width: '100%', borderRadius: '14px', padding: '14px 16px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', resize: 'vertical' }}
          />
        </div>
        <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => {
              const next = !saveAsTemplate
              setSaveAsTemplate(next)
              if (next && !templateName.trim()) setTemplateName(vals.meal_name.trim())
            }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: saveAsTemplate ? 'rgba(212,255,0,0.14)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bookmark size={16} color={saveAsTemplate ? '#d4ff00' : '#8a8a8a'} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13px', fontWeight: 800 }}>Add to templates</p>
                <p style={{ fontSize: '11px', color: '#8a8a8a' }}>Save this meal and choose a name or note</p>
              </div>
            </div>
            <ChevronDown size={16} color={saveAsTemplate ? '#d4ff00' : '#8a8a8a'} style={{ transform: saveAsTemplate ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </button>
          {saveAsTemplate && (
            <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
              <input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Choose a template name"
                style={{ width: '100%', borderRadius: '14px', padding: '14px 16px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
              />
              <input
                value={templateDescription}
                onChange={e => setTemplateDescription(e.target.value)}
                placeholder="Add a short note if you want"
                style={{ width: '100%', borderRadius: '14px', padding: '14px 16px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
              />
            </div>
          )}
        </div>
        {error && (
          <div style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.16)' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: '#ff2d55' }}>{error}</p>
          </div>
        )}
        <button id="save-edit-btn"
          onClick={async () => {
            if (!isValid()) {
              setError('Add a meal name and valid numbers.')
              return
            }
            setSaving(true);
            try {
              const mealDate = entry.meal_date || entry.logged_at.split('T')[0]
              const loggedAt = localDateTimeToUtcIso(mealDate, vals.time)
              await api.updateMeal(entry.id, { ...vals, logged_at: loggedAt, meal_date: mealDate }, token);
              if (saveAsTemplate) {
                await api.createTemplate({
                  template_name: (templateName || vals.meal_name).trim(),
                  description: templateDescription.trim() || undefined,
                  total_calories: vals.calories,
                  total_protein_g: vals.protein_g,
                  total_carbs_g: vals.carbs_g,
                  total_fat_g: vals.fat_g,
                  ingredient_snapshot: entry.items?.length ? entry.items : [{ name: vals.meal_name, raw_text: entry.entry_text_raw }],
                }, token)
                localStorage.removeItem('morsel_templates_cache')
              }
              onSaved()
            } catch (e: any) {
              setError(e.message || 'Could not save this entry.')
            } finally { setSaving(false) }
          }}
          disabled={saving || !isValid()}
          style={{ width: '100%', padding: '18px', borderRadius: '16px', background: '#d4ff00', color: '#030409', border: 'none', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: saving || !isValid() ? 'not-allowed' : 'pointer', opacity: saving || !isValid() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={20} /> {saveAsTemplate ? 'Save + Template' : 'Save Changes'}</>}
        </button>
      </div>
    </div>
  )
}

function offsetDate(base: string, delta: number) {
  return addDaysToDateString(base, delta)
}

function friendlyDate(iso: string) {
  const today = getLocalDateString()
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
  const [searchQuery, setSearchQuery] = useState('')
  const [mealTypeFilter, setMealTypeFilter] = useState('all')
  const liveToday = useCurrentDateString()
  const [date, setDate] = useState(liveToday)
  const [today, setToday] = useState(liveToday)

  const load = useCallback(async (tok: string, d: string) => {
    if (!tok || !d) return 

    setLoading(true)
    try { 
      const data = await api.getMeals(d, tok); 
      setEntries(data) 
      localStorage.setItem(`morsel_log_cache_${d}`, JSON.stringify(data))
    }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!date) return
    const cached = localStorage.getItem(`morsel_log_cache_${date}`)
    if (cached) {
      try {
        setEntries(JSON.parse(cached))
      } catch (e: any) {
        console.error('Failed to parse log cache:', e)
      }
    }
  }, [date])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setToken(session.access_token); load(session.access_token, date) }
    })
  }, [load, date])

  useEffect(() => {
    setDate((prev) => (prev === today ? liveToday : prev))
    setToday(liveToday)
  }, [liveToday, today])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    await api.deleteMeal(id, token); load(token, date)
  }

  const handleDuplicate = async (entry: MealEntry) => {
    await api.createMeal({
      meal_name: entry.meal_name, entry_text_raw: entry.entry_text_raw,
      logged_at: new Date().toISOString(),
      meal_date: date,
      calories: entry.calories, protein_g: entry.protein_g,
      carbs_g: entry.carbs_g, fat_g: entry.fat_g, source_type: 'manual',
    }, token)
    load(token, date)
  }

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const isToday = date === today
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery.trim() || entry.meal_name.toLowerCase().includes(searchQuery.toLowerCase()) || entry.entry_text_raw?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = mealTypeFilter === 'all' || entry.meal_type === mealTypeFilter
    return matchesSearch && matchesType
  })
  const totals = filteredEntries.reduce((acc, entry) => {
    acc.calories += entry.calories || 0
    acc.protein += entry.protein_g || 0
    acc.carbs += entry.carbs_g || 0
    acc.fat += entry.fat_g || 0
    return acc
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const mealTypes = ['all', ...Array.from(new Set(entries.map(entry => entry.meal_type).filter(Boolean)))]

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
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--card-radius)', padding: '24px', marginBottom: '16px', backdropFilter: 'blur(16px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', color: '#d4ff00' }}>Meal Log</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Your daily food log.</p>
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

      {/* Search Bar */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search meals by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 700,
            outline: 'none',
            transition: 'all 0.2s ease'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Meals', value: filteredEntries.length, suffix: 'items', color: 'white' },
          { label: 'Calories', value: Math.round(totals.calories), suffix: 'kcal', color: '#00d9ff' },
          { label: 'Protein', value: Math.round(totals.protein), suffix: 'g', color: '#d4ff00' },
          { label: 'Carbs', value: Math.round(totals.carbs), suffix: 'g', color: '#ff2d55' }
        ].map(card => (
          <div key={card.label} style={{ ...S.card, marginBottom: 0, padding: '18px' }}>
            <p style={{ fontSize: '22px', fontWeight: 900, color: card.color }}>{card.value}</p>
            <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 800, marginTop: '8px' }}>{card.label}</p>
            <p style={{ fontSize: '10px', color: '#5a5a5a', marginTop: '2px' }}>{card.suffix}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', scrollbarWidth: 'none' }}>
        {mealTypes.map(type => (
          <button
            key={type}
            onClick={() => setMealTypeFilter(type)}
            style={{
              flexShrink: 0,
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: mealTypeFilter === type ? 'rgba(212,255,0,0.15)' : 'rgba(255,255,255,0.03)',
              color: mealTypeFilter === type ? '#d4ff00' : '#8a8a8a',
              fontSize: '11px',
              fontWeight: 900,
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            {type.replace('-', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => <div key={i} style={{ ...S.card, height: 110, opacity: 0.3 }} />)}
        </div>
      ) : (() => {
        return filteredEntries.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
             <Utensils size={24} color="#5a5a5a" />
          </div>
          <p style={{ fontSize: '16px', fontWeight: 800 }}>No logs found</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Tap the + button to add a meal.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredEntries.map((entry: any) => (
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
                    {entry.items && entry.items.length > 0 ? (
                      <div style={{ marginTop: '12px' }}>
                         <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)', marginBottom: '10px' }} />
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                           {entry.items.map((item: any, idx: number) => (
                             <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'white' }}>{item.name}</span>
                                <span style={{ fontSize: '9px', fontWeight: 600, color: '#5a5a5a' }}>{Math.round(item.calories)}<span style={{ fontSize: '7px' }}>kcal</span></span>
                             </div>
                           ))}
                         </div>
                      </div>
                    ) : entry.meal_name.toLowerCase().includes('composite') && entry.entry_text_raw && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)', marginBottom: '10px' }} />
                        <p style={{ fontSize: '11px', color: '#5a5a5a', fontStyle: 'italic', fontWeight: 600 }}>{entry.entry_text_raw}</p>
                      </div>
                    )}
                 </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                   <button onClick={() => handleDuplicate(entry)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,255,0,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Copy size={14} color="#d4ff00" />
                   </button>
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
        )
      })()}

      {/* FAB */}
      {isToday && (
        <button onClick={() => setShowAdd(true)} style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', width: '64px', height: '64px', borderRadius: '22px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px rgba(212,255,0,0.4)', zIndex: 50 }}>
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {showAdd && <QuickAddModal token={token} initialDate={date} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(token, date) }} />}
      {editEntry && <EditModal entry={editEntry} token={token} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); load(token, date) }} />}
    </div>
  )
}
