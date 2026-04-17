'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getLocalDateString } from '@/lib/utils'
import { X, Loader2, Sparkles, CheckCircle2, Edit3, Clock, Calendar, Plus, Dumbbell, Utensils, Trash2, Bookmark, ChevronRight } from 'lucide-react'

interface ParsedResult {
  meal_name: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  overall_confidence: number
  source_type: string
  items?: any[]
}

interface Props {
  token: string
  initialDate?: string
  onClose: () => void
  onSaved: () => void
}

export default function QuickAddModal({ token, initialDate, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<'meal' | 'exercise'>('meal')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [selectedDate, setSelectedDate] = useState(() => initialDate || getLocalDateString())
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

  // -- Meal Specifics --
  const [editVals, setEditVals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, meal_name: '' })
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [mealNote, setMealNote] = useState('')

  // -- Exercise Specifics --
  const [exSuggestions, setExSuggestions] = useState<any[]>([])
  const [selectedExercise, setSelectedExercise] = useState<any>(null)
  const [sets, setSets] = useState([{ reps: 10, weight: 0, set_index: 1 }])
  const [notes, setNotes] = useState('')
  const [exHistory, setExHistory] = useState<any[]>([])

  useEffect(() => {
    if (selectedExercise && token) {
      api.getExerciseHistory(selectedExercise.name, token)
        .then(res => setExHistory(res))
        .catch(() => setExHistory([]))
    } else {
      setExHistory([])
    }
  }, [selectedExercise, token])

  useEffect(() => {
    if (mode === 'meal') {
      if (!text.trim() || parsed) { setSuggestions([]); return }
      const timer = setTimeout(async () => {
        try {
          const res = await api.searchFoods(text.trim(), token)
          setSuggestions(res)
        } catch (e: any) {
          console.error('Food search failed:', e)
          setSuggestions([])
        }
      }, 400)
      return () => clearTimeout(timer)
    } else {
      if (!text.trim() || selectedExercise) { setExSuggestions([]); return }
      const timer = setTimeout(async () => {
        try {
          const res = await api.getExercises(token)
          const filtered = res.filter((ex: any) => ex.name.toLowerCase().includes(text.toLowerCase()))
          setExSuggestions(filtered)
        } catch (e: any) {
          console.error('Exercise search failed:', e)
          setExSuggestions([])
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [text, token, parsed, mode, selectedExercise])

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
      setTemplateName(result.meal_name)
      setTemplateDescription('')
      setMealNote('')
    } catch (e: any) {
      setError(e.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMeal = async () => {
    if (!parsed) return
    setSaving(true)
    try {
      const [h, m] = selectedTime.split(':')
      const loggedAt = `${selectedDate}T${h}:${m}:00`

      const mealBody = {
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
        notes: mealNote.trim() || undefined,
        items: parsed.items,
      }
      await api.createMeal(mealBody, token)

      if (saveAsTemplate) {
        await api.createTemplate({
          template_name: (templateName || mealBody.meal_name).trim(),
          description: templateDescription.trim() || undefined,
          total_calories: mealBody.calories,
          total_protein_g: mealBody.protein_g,
          total_carbs_g: mealBody.carbs_g,
          total_fat_g: mealBody.fat_g,
          ingredient_snapshot: parsed.items?.length ? parsed.items : [{ name: mealBody.meal_name, raw_text: text }]
        }, token)
        localStorage.removeItem('morsel_templates_cache')
      }

      // Invalidate dashboard cache for this date
      localStorage.removeItem(`morsel_dash_cache_${selectedDate}`)
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExercise = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const workoutBody = {
        session_date: selectedDate,
        notes: notes || `Quick Add: ${text}`,
        sets: sets.map((s, idx) => ({
          exercise_name: selectedExercise?.name || text,
          set_index: idx + 1,
          reps: s.reps,
          weight: s.weight
        }))
      }
      await api.createWorkoutSession(workoutBody, token)
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Could not save workout')
    } finally {
      setSaving(false)
    }
  }

  const addSet = () => setSets(prev => [...prev, { reps: prev[prev.length - 1].reps, weight: prev[prev.length - 1].weight, set_index: prev.length + 1 }])
  const removeSet = (idx: number) => setSets(prev => prev.filter((_, i) => i !== idx))
  const updateSet = (idx: number, key: string, val: number) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s))
  }

  const S = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(3, 4, 9, 0.85)', backdropFilter: 'blur(24px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' } as React.CSSProperties,
    sheet: { width: '100%', maxWidth: 'min(440px, calc(100vw - 32px))', maxHeight: '85dvh', overflowY: 'auto' as const, background: 'var(--background)', borderRadius: '32px 32px 0 0', border: '1px solid var(--glass-border)', padding: '32px 24px 44px', boxShadow: '0 -20px 60px rgba(0,0,0,0.8)', scrollbarWidth: 'none' as const } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '8px', display: 'block' } as React.CSSProperties,
    input: { width: '100%', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--input-radius)', padding: '18px', fontSize: '16px', fontWeight: 700, color: 'white', outline: 'none' } as React.CSSProperties,
    btnMain: { width: '100%', background: mode === 'meal' ? 'var(--accent)' : '#00d9ff', color: '#030409', borderRadius: '16px', padding: '20px', fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: `0 8px 32px ${mode === 'meal' ? 'rgba(212,255,0,0.3)' : 'rgba(0,217,255,0.3)'}`, marginTop: '8px' } as React.CSSProperties,
    modeBtn: (active: boolean) => ({ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.2s ease', background: active ? 'rgba(255,255,255,0.1)' : 'transparent', color: active ? 'white' : '#5a5a5a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }) as React.CSSProperties,
  }

  return (
    <div style={S.overlay}>
      <div style={S.sheet} className="animate-in slide-in-from-bottom-5 duration-300">
        
        {/* Header & Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '18px', flex: 1, marginRight: '16px' }}>
             <button onClick={() => { setMode('meal'); setText(''); setParsed(null); setSelectedExercise(null); }} style={S.modeBtn(mode === 'meal')}>
                <Utensils size={14} /> Nutrition
             </button>
             <button onClick={() => { setMode('exercise'); setText(''); setParsed(null); setSelectedExercise(null); }} style={S.modeBtn(mode === 'exercise')}>
                <Dumbbell size={14} /> Workout
             </button>
          </div>
          <button onClick={() => {
            if ((text.trim() || editing) && !confirm('Discard changes?')) return
            onClose()
          }} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="white" />
          </button>
        </div>

        {/* Global Date & Time */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
           <div style={{ flex: 1.5 }}>
              <label style={S.label}>Date</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                 <Calendar size={16} color="#8a8a8a" style={{ position: 'absolute', left: '14px' }} />
                 <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                   style={{ ...S.input, padding: '12px 14px 12px 40px', fontSize: '13px' }} />
              </div>
           </div>
           {mode === 'meal' && (
             <div style={{ flex: 1 }}>
                <label style={S.label}>Time</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                   <Clock size={16} color="#8a8a8a" style={{ position: 'absolute', left: '14px' }} />
                   <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)}
                     style={{ ...S.input, padding: '12px 14px 12px 40px', fontSize: '14px' }} />
                </div>
             </div>
           )}
        </div>

        {mode === 'meal' ? (
          /* ── Nutrition Mode ── */
          <>
            <div style={{ marginBottom: '24px' }}>
              <label style={S.label}>Meal Type</label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                {['breakfast', 'lunch', 'dinner', 'snacks', 'pre-workout', 'post-workout'].map(t => (
                  <button key={t} onClick={() => setMealType(t)}
                    style={{ flexShrink: 0, padding: '10px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', background: mealType === t ? 'var(--accent)' : 'rgba(255,255,255,0.03)', color: mealType === t ? '#030409' : '#8a8a8a', border: 'none', transition: 'all 0.2s ease' }}>
                    {t.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {!parsed && suggestions.length > 0 && (
              <div style={{ marginBottom: '16px', background: '#0a0b10', border: '1px solid var(--glass-border)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
                 {suggestions.slice(0, 5).map((food, index) => (
                   <button key={food.id} onClick={() => { setText(food.canonical_name); setSuggestions([]); }}
                    style={{ width: '100%', padding: '16px 20px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: index === Math.min(suggestions.length, 5) - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                      <div><p style={{ fontSize: '14px', fontWeight: 800 }}>{food.canonical_name}</p><p style={{ fontSize: '10px', color: '#8a8a8a' }}>{Math.round(food.calories)} kcal • {Math.round(food.protein_g)}g protein</p></div>
                      <Plus size={16} color="var(--accent)" />
                   </button>
                 ))}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={S.label}>What Did You Eat?</label>
              <textarea autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Example: 2 scrambled eggs, toast, and coffee" rows={3} style={{ ...S.input, resize: 'none', lineHeight: 1.5 }} />
              <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '8px', lineHeight: 1.5 }}>
                Use `;` to split foods on separate parts, like `eggs; toast; coffee`.
              </p>
            </div>

            {parsed && (
              <div style={{ background: 'rgba(212,255,0,0.04)', border: '1px solid rgba(212,255,0,0.2)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>Ready To Save</p>
                      <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{editing ? editVals.meal_name : parsed.meal_name}</h4>
                    </div>
                    <button onClick={() => setEditing(!editing)} style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer' }}>
                       {editing ? <CheckCircle2 size={18} color="#d4ff00" /> : <Edit3 size={18} color="white" />}
                    </button>
                 </div>
                 {editing && (
                  <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
                    <input
                      value={editVals.meal_name}
                      onChange={e => setEditVals(prev => ({ ...prev, meal_name: e.target.value }))}
                      placeholder="Meal name"
                      style={{ ...S.input, padding: '14px 16px', fontSize: '14px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input value={editVals.calories || ''} onChange={e => setEditVals(prev => ({ ...prev, calories: parseFloat(e.target.value) || 0 }))} type="number" placeholder="Calories" style={{ ...S.input, padding: '14px 16px', fontSize: '14px' }} />
                      <input value={editVals.protein_g || ''} onChange={e => setEditVals(prev => ({ ...prev, protein_g: parseFloat(e.target.value) || 0 }))} type="number" placeholder="Protein" style={{ ...S.input, padding: '14px 16px', fontSize: '14px' }} />
                      <input value={editVals.carbs_g || ''} onChange={e => setEditVals(prev => ({ ...prev, carbs_g: parseFloat(e.target.value) || 0 }))} type="number" placeholder="Carbs" style={{ ...S.input, padding: '14px 16px', fontSize: '14px' }} />
                      <input value={editVals.fat_g || ''} onChange={e => setEditVals(prev => ({ ...prev, fat_g: parseFloat(e.target.value) || 0 }))} type="number" placeholder="Fat" style={{ ...S.input, padding: '14px 16px', fontSize: '14px' }} />
                    </div>
                  </div>
                 )}
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { k: 'calories', l: 'KCAL', c: '#00d9ff' }, { k: 'protein_g', l: 'PRO', c: '#d4ff00' }, { k: 'carbs_g', l: 'CARB', c: '#ff2d55' }, { k: 'fat_g', l: 'FAT', c: '#8a8a8a' }
                    ].map(m => (
                      <div key={m.k} style={{ textAlign: 'center' }}>
                         <p style={{ fontSize: '18px', fontWeight: 900, color: m.c }}>{Math.round(editing ? Number(editVals[m.k as keyof typeof editVals]) : Number(parsed[m.k === 'calories' ? 'total_calories' : `total_${m.k}` as keyof ParsedResult]))}</p>
                         <p style={{ fontSize: '9px', fontWeight: 900, color: '#8a8a8a' }}>{m.l}</p>
                      </div>
                    ))}
                 </div>
                 {parsed.items && parsed.items.length > 0 && (
                  <div style={{ marginTop: '18px' }}>
                    <p style={{ ...S.label, marginBottom: '10px' }}>Items</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {parsed.items.slice(0, 8).map((item: any, idx: number) => (
                        <div key={idx} style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: '11px', fontWeight: 800 }}>{item.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                 )}
                 <div style={{ marginTop: '18px' }}>
                   <label style={{ ...S.label, marginBottom: '10px' }}>Note</label>
                   <textarea
                     value={mealNote}
                     onChange={e => setMealNote(e.target.value)}
                     placeholder="Optional note"
                     rows={2}
                     style={{ ...S.input, padding: '14px 16px', fontSize: '14px', resize: 'vertical' }}
                   />
                 </div>
                 <div style={{ marginTop: '18px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => {
                        const next = !saveAsTemplate
                        setSaveAsTemplate(next)
                        if (next && !templateName.trim()) {
                          setTemplateName(editing ? editVals.meal_name : parsed.meal_name)
                        }
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: saveAsTemplate ? 'rgba(212,255,0,0.14)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bookmark size={16} color={saveAsTemplate ? '#d4ff00' : '#8a8a8a'} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: '13px', fontWeight: 800 }}>Make this a template</p>
                          <p style={{ fontSize: '11px', color: '#8a8a8a' }}>Save it for quick logging later</p>
                        </div>
                      </div>
                      <ChevronRight size={16} color={saveAsTemplate ? '#d4ff00' : '#8a8a8a'} style={{ transform: saveAsTemplate ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }} />
                    </button>
                    {saveAsTemplate && (
                      <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                        <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name" style={{ ...S.input, padding: '14px 16px', fontSize: '14px' }} />
                        <input value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} placeholder="Short note (optional)" style={{ ...S.input, padding: '14px 16px', fontSize: '14px' }} />
                      </div>
                    )}
                 </div>
              </div>
            )}

            <button onClick={!parsed ? handleParse : handleSaveMeal} disabled={!parsed ? (loading || !text.trim()) : (saving || loading)} style={S.btnMain}>
               {!parsed ? (loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Analyze Meal</>) : (saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> {saveAsTemplate ? 'Save Meal + Template' : 'Add to Log'}</>)}
            </button>
          </>
        ) : (
          /* ── Kinetic Mode (Exercise) ── */
          <>
            <div style={{ marginBottom: '24px' }}>
              <label style={S.label}>Exercise Name</label>
              <input value={text} onChange={e => { setText(e.target.value); setSelectedExercise(null); }} placeholder="e.g. Bench Press" style={S.input} />
              
              {!selectedExercise && exSuggestions.length > 0 && (
                <div style={{ position: 'relative', height: 0, zIndex: 10 }}>
                  <div style={{ position: 'absolute', top: 4, left: 0, right: 0, background: '#0a0b10', border: '1px solid var(--glass-border)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                     {exSuggestions.slice(0, 5).map(ex => (
                       <button key={ex.id} onClick={() => { setText(ex.name); setSelectedExercise(ex); setExSuggestions([]); }}
                         style={{ width: '100%', padding: '16px 20px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}>
                          <p style={{ fontSize: '14px', fontWeight: 800 }}>{ex.name}</p>
                          <p style={{ fontSize: '10px', color: '#8a8a8a' }}>{ex.category} • {ex.equipment}</p>
                       </button>
                     ))}
                  </div>
                </div>
              )}

              {exHistory.length > 0 && (
                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,217,255,0.05)', borderRadius: '20px', border: '1px solid rgba(0,217,255,0.1)' }}>
                   <p style={{ ...S.label, color: '#00d9ff', fontSize: '9px', marginBottom: '10px' }}>Progression Guide (Last Session)</p>
                   <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                      {exHistory.map((h, i) => (
                        <div key={i} style={{ flexShrink: 0, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                           <p style={{ fontSize: '13px', fontWeight: 900, color: 'white' }}>{h.weight}kg</p>
                           <p style={{ fontSize: '10px', fontWeight: 700, color: '#8a8a8a' }}>{h.reps} reps</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={S.label}>Sets Deployment</label>
                  <button onClick={addSet} style={{ background: 'rgba(0,217,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#00d9ff', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>+ ADD SET</button>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sets.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                       <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#5a5a5a' }}>{i + 1}</div>
                       <div style={{ flex: 1, position: 'relative' }}>
                          <input type="number" value={s.weight} onChange={e => updateSet(i, 'weight', parseFloat(e.target.value) || 0)} style={{ ...S.input, padding: '12px 14px', textAlign: 'center' }} />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 900, color: '#5a5a5a' }}>KG</span>
                       </div>
                       <div style={{ flex: 1, position: 'relative' }}>
                          <input type="number" value={s.reps} onChange={e => updateSet(i, 'reps', parseInt(e.target.value) || 0)} style={{ ...S.input, padding: '12px 14px', textAlign: 'center' }} />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 900, color: '#5a5a5a' }}>REPS</span>
                       </div>
                       <button onClick={() => removeSet(i)} disabled={sets.length === 1} style={{ background: 'transparent', border: 'none', opacity: sets.length === 1 ? 0 : 0.5, cursor: 'pointer' }}><Trash2 size={16} color="#ff2d55" /></button>
                    </div>
                  ))}
               </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
               <label style={S.label}>Notes (Optional)</label>
               <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Felt strong today" style={{ ...S.input, padding: '14px' }} />
            </div>

            <button onClick={handleSaveExercise} disabled={saving || !text.trim()} style={S.btnMain}>
               {saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Save Workout</>}
            </button>
          </>
        )}

        {error && <p style={{ color: '#ff2d55', fontSize: '11px', fontWeight: 800, marginTop: '20px', textAlign: 'center' }}>{error}</p>}
      </div>
    </div>
  )
}
