/**
 * QuickAddModal Component
 * =======================
 * This is the core data-entry gateway for the application.
 * It provides a fluid, mobile-first sheet interface for users to type natural language meals.
 * It manages the asynchronous communication with the AI parsing backend and 
 * handles state parsing for immediate review/editing before database finalization.
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { getLocalDateString } from '@/lib/utils'
import { X, Loader2, Sparkles, CheckCircle2, Edit3, Save, Clock } from 'lucide-react'

interface ParsedResult {
  meal_name: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  overall_confidence: number
  source_type: string
}

interface Props {
  token: string
  initialDate?: string // ISO date string (YYYY-MM-DD)
  onClose: () => void
  onSaved: () => void
}

export default function QuickAddModal({ token, initialDate, onClose, onSaved }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  
  const [mealType, setMealType] = useState(() => {
    const hr = new Date().getHours()
    if (hr >= 5 && hr < 11) return 'breakfast'
    if (hr >= 11 && hr < 15) return 'lunch'
    if (hr >= 15 && hr < 18) return 'snacks'
    if (hr >= 18 && hr < 22) return 'dinner'
    return 'snacks'
  })
  const textRef = useRef<HTMLTextAreaElement>(null)

  const [editVals, setEditVals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, meal_name: '' })
  const [suggestions, setSuggestions] = useState<any[]>([])

  useEffect(() => {
    if (!text.trim() || parsed) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchFoods(text.trim(), token)
        setSuggestions(res)
      } catch (e) {}
    }, 400)
    return () => clearTimeout(timer)
  }, [text, token, parsed])

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setParsed(null)
    try {
      const result = await api.parseMeal({ meal_text: text }, token)
      setParsed(result)
      setEditVals({
        calories: result.total_calories,
        protein_g: result.total_protein_g,
        carbs_g: result.total_carbs_g,
        fat_g: result.total_fat_g,
        meal_name: result.meal_name,
      })
    } catch (e: any) {
      setError(e.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!parsed) return
    setSaving(true)
    try {
      const datePart = initialDate || getLocalDateString()
      const [h, m] = selectedTime.split(':')
      const loggedAt = new Date(`${datePart}T${h}:${m}:00`).toISOString()

      await api.createMeal({
        meal_name: editing ? editVals.meal_name : parsed.meal_name,
        entry_text_raw: text,
        logged_at: loggedAt,
        calories: editing ? editVals.calories : parsed.total_calories,
        protein_g: editing ? editVals.protein_g : parsed.total_protein_g,
        carbs_g: editing ? editVals.carbs_g : parsed.total_carbs_g,
        fat_g: editing ? editVals.fat_g : parsed.total_fat_g,
        source_type: parsed.source_type,
        confidence: parsed.overall_confidence,
        meal_type: mealType,
      }, token)
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const S = {
    overlay: { 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(3, 4, 9, 0.85)', 
      backdropFilter: 'blur(24px)', 
      zIndex: 100, 
      display: 'flex', 
      alignItems: 'flex-end', 
      justifyContent: 'center', 
      padding: '16px' 
    } as React.CSSProperties,
    sheet: { 
      width: '100%', 
      maxWidth: 'min(440px, calc(100vw - 32px))', 
      maxHeight: 'min(720px, 90dvh)',
      overflowY: 'auto' as const,
      background: 'var(--background)', 
      borderRadius: 'var(--card-radius)', 
      border: '1px solid var(--glass-border)', 
      padding: '32px', 
      position: 'relative', 
      boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
      scrollbarWidth: 'none' as const
    } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '8px', display: 'block' } as React.CSSProperties,
    input: { width: '100%', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--input-radius)', padding: '18px', fontSize: '16px', fontWeight: 700, color: 'white', outline: 'none' } as React.CSSProperties,
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    btnMain: { width: '100%', background: 'var(--accent)', color: '#030409', borderRadius: '16px', padding: '18px', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' } as React.CSSProperties,
  }

  return (
    <div style={S.overlay}>
      <div style={S.sheet} className="animate-in slide-in-from-bottom-5 duration-300">
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em' }}>
              Fueling your <span style={{ color: 'var(--accent)' }}>{mealType.replace('-', ' ')}</span>
            </h2>
            <p style={{ fontSize: '11px', color: '#8a8a8a', fontWeight: 800 }}>Morsel Meal Logger ✨</p>
          </div>
          <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="white" />
          </button>
        </div>

        {/* Meal Type Selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={S.label}>Category</label>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
            {['breakfast', 'lunch', 'dinner', 'snacks', 'pre-workout', 'post-workout'].map(t => (
              <button key={t} onClick={() => setMealType(t)}
                style={{
                  flexShrink: 0, padding: '10px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                  background: mealType === t ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                  color: mealType === t ? '#030409' : '#8a8a8a',
                  border: mealType === t ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.2s ease',
                  boxShadow: mealType === t ? '0 4px 15px rgba(212,255,0,0.3)' : 'none'
                }}>
                {t.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ marginBottom: '16px' }}>
          <textarea
            ref={textRef}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="e.g. Scrambled eggs on sourdough"
            rows={2}
            style={{ ...S.input, resize: 'none' }}
          />
        </div>

        {/* Time */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div style={{ flex: 1 }}>
              <label style={S.label}>Log Time</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                 <Clock size={16} color="#8a8a8a" style={{ position: 'absolute', left: '14px' }} />
                 <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)}
                   style={{ ...S.input, paddingLeft: '40px', padding: '12px 14px 12px 40px', fontSize: '14px' }} />
              </div>
           </div>
        </div>

        {/* Suggestions */}
        {!parsed && suggestions.length > 0 && (
          <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
             {suggestions.slice(0, 2).map(food => (
               <button key={food.id} onClick={() => { setText(food.canonical_name); setSuggestions([]); }}
                 style={{ width: '100%', padding: '14px 20px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}>
                  <p style={{ fontSize: '14px', fontWeight: 800 }}>{food.canonical_name}</p>
                  <p style={{ fontSize: '10px', color: '#8a8a8a' }}>{Math.round(food.calories)} kcal</p>
               </button>
             ))}
          </div>
        )}

        {/* Result */}
        {parsed && (
          <div style={{ ...S.card, borderColor: '#d4ff00', background: 'rgba(212,255,0,0.02)', marginBottom: '24px' }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                   {editing ? (
                     <input value={editVals.meal_name} onChange={e => setEditVals(v => ({ ...v, meal_name: e.target.value }))}
                        style={{ ...S.input, padding: '8px', background: 'transparent', borderBottom: '2px solid #d4ff00', borderRadius: 0, fontSize: '18px' }} />
                   ) : (
                     <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{parsed.meal_name}</h4>
                   )}
                </div>
                <button onClick={() => setEditing(!editing)} style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer' }}>
                   {editing ? <CheckCircle2 size={18} color="#d4ff00" /> : <Edit3 size={18} color="white" />}
                </button>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { key: 'calories', label: 'KCAL', color: '#00d9ff' },
                  { key: 'protein_g', label: 'PRO', color: '#d4ff00' },
                  { key: 'carbs_g', label: 'CHO', color: '#ff2d55' },
                  { key: 'fat_g', label: 'FAT', color: '#8a8a8a' }
                ].map(m => (
                  <div key={m.key} style={{ textAlign: 'center' }}>
                     {editing ? (
                       <input type="number" value={editVals[m.key as keyof typeof editVals]} onChange={e => setEditVals(v => ({ ...v, [m.key]: parseFloat(e.target.value) || 0 }))}
                         style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', textAlign: 'center', fontWeight: 900, fontSize: '14px', outline: 'none' }} />
                     ) : (
                       <p style={{ fontSize: '16px', fontWeight: 900, color: m.color }}>{Math.round(parsed[m.key === 'calories' ? 'total_calories' : m.key as keyof ParsedResult] as number)}</p>
                     )}
                     <p style={{ fontSize: '9px', fontWeight: 900, color: '#8a8a8a' }}>{m.label}</p>
                  </div>
                ))}
             </div>
          </div>
        )}

        {error && <p style={{ color: '#ff2d55', fontSize: '12px', fontWeight: 800, marginBottom: '16px', textAlign: 'center' }}>{error}</p>}

        <button onClick={!parsed ? handleParse : handleSave} disabled={!parsed ? (loading || !text.trim()) : saving} style={S.btnMain}>
           {!parsed ? (
             loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Analyze Meal</>
           ) : (
             saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Add to Log</>
           )}
        </button>

      </div>
    </div>
  )
}
