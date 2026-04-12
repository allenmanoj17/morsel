'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { X, Loader2, Sparkles, CheckCircle2, Edit3, Save } from 'lucide-react'

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
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Editable values
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
      setError(e.message || 'Parse failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!parsed) return
    setSaving(true)
    try {
      // Combine date and time
      const datePart = initialDate || new Date().toISOString().split('T')[0]
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
      }, token)
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const macroColor: Record<string, string> = {
    calories: '#00d9ff',
    protein_g: '#d4ff00',
    carbs_g: '#8a8a8a',
    fat_g: '#8a8a8a',
  }

  const sourceLabel: Record<string, string> = {
    ai: 'AI COACH',
    db: 'DATABASE',
    template: 'TEMPLATE',
    manual: 'MANUAL',
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0a0e27]/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full md:max-w-xl bg-white rounded-[10px] border border-[#f0f0f0] shadow-2xl p-8 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-[#0a0e27]">Log Record</h2>
            <p className="text-xs text-[#8a8a8a] font-bold uppercase tracking-widest mt-0.5">Quick Analysis Engine</p>
          </div>
          <button id="quick-add-close" onClick={onClose}
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#fafafa] border border-[#f0f0f0] hover:bg-[#f0f0f0] transition-all cursor-pointer">
            <X size={20} className="text-[#0a0e27]" />
          </button>
        </div>

        {/* Input area */}
        <div className="relative mb-6">
          <textarea
            ref={textRef}
            id="meal-text-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What are we fueling with? ✨"
            rows={3}
            className="w-full rounded-[10px] p-5 text-base font-bold resize-none outline-none border-2 border-[#f0f0f0] bg-white text-[#0a0e27] placeholder:text-[#8a8a8a]/50 transition-all focus:border-[#f0f0f0]"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse()
            }}
          />
        </div>

        {/* Time selection (Always visible) */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '9px', fontWeight: '900', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'block', marginBottom: '8px', marginLeft: '2px' }}>Log Time</label>
          <div className="relative">
            <input
              type="time"
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
              style={{
                width: '100%', padding: '14px 18px', borderRadius: '10px',
                border: '2px solid #f0f0f0', background: 'white',
                fontSize: '14px', fontWeight: 800, color: '#0a0e27', outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Suggestions list */}
        {!parsed && suggestions.length > 0 && (
          <div className="mb-6 rounded-[10px] overflow-hidden border border-[#f0f0f0] bg-[#fafafa] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] border-b border-[#f0f0f0] text-[#8a8a8a]">
              Previous Logs
            </div>
            {suggestions.slice(0, 3).map(food => (
              <button
                key={food.id}
                onClick={() => { setText(food.canonical_name); setSuggestions([]); }}
                className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-white border-b border-[#f0f0f0] last:border-0 transition-colors cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-black text-[#0a0e27]">{food.canonical_name}</span>
                  <span className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wider">{food.serving_description}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-[#00d9ff]">{Math.round(food.calories)} KCAL</span>
                  <span className="text-[10px] font-black text-[#d4ff00]">{Math.round(food.protein_g)}G PRO</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="rounded-[10px] p-4 text-sm font-bold text-[#ff2d55] mb-6 bg-[#ff2d55]/[0.05] border border-[#ff2d55]/20 shadow-sm animate-in shake-1 duration-300">
            {error}
          </div>
        )}

        {/* Improved Parse result cards */}
        {parsed && (
          <div className="relative rounded-[10px] p-6 mb-8 border border-[#f0f0f0] bg-[#fafafa] overflow-hidden group animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                {editing ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-[#8a8a8a] uppercase tracking-[0.2em]">Label</span>
                    <input
                      id="meal-name-edit"
                      value={editVals.meal_name}
                      onChange={e => setEditVals(v => ({ ...v, meal_name: e.target.value }))}
                      className="font-black text-xl bg-transparent outline-none border-b-2 border-[#f0f0f0] text-[#0a0e27] w-full py-1"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#d4ff00] text-[#0a0e27] tracking-widest uppercase">
                         {sourceLabel[parsed.source_type] || 'ANALYZED'}
                       </span>
                    </div>
                    <h4 className="text-2xl font-black tracking-tight text-[#0a0e27] leading-tight">{parsed.meal_name}</h4>
                  </div>
                )}
              </div>
              <button
                id="toggle-edit"
                onClick={() => setEditing(e => !e)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${editing ? 'bg-[#d4ff00]/20 border-[#d4ff00]' : 'bg-white border-[#f0f0f0] hover:bg-[#fafafa]'}`}>
                {editing ? <CheckCircle2 size={20} color="#0a0e27" />
                  : <Edit3 size={20} className="text-[#8a8a8a]" />}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(['calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map(key => (
                <div key={key} className="flex flex-col items-center justify-center py-3 rounded-[10px] bg-white border border-[#f0f0f0] shadow-sm">
                  {editing ? (
                    <input
                      id={`edit-${key}`}
                      type="number"
                      value={editVals[key]}
                      onChange={e => setEditVals(v => ({ ...v, [key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full text-center text-lg font-black bg-transparent outline-none p-0 appearance-none text-[#0a0e27]"
                    />
                  ) : (
                    <span className="text-xl font-black tracking-tighter" style={{ color: macroColor[key] === '#8a8a8a' ? '#0a0e27' : macroColor[key] }}>
                      {Math.round(key === 'calories' ? parsed.total_calories :
                        key === 'protein_g' ? parsed.total_protein_g :
                          key === 'carbs_g' ? parsed.total_carbs_g : parsed.total_fat_g)}
                    </span>
                  )}
                  <span className="text-[9px] font-black tracking-widest text-[#8a8a8a] uppercase">
                    {key === 'calories' ? 'KCAL' : key.replace('_g', '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Action Button */}
        <div className="relative group">
          <button
            id={!parsed ? "parse-meal-btn" : "save-meal-btn"}
            onClick={!parsed ? handleParse : handleSave}
            disabled={!parsed ? (loading || !text.trim()) : saving}
            className="w-full py-5 rounded-[10px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all enabled:bg-[#d4ff00] enabled:text-[#0a0e27] disabled:bg-[#f0f0f0] disabled:text-[#8a8a8a] cursor-pointer shadow-md"
          >
            {!parsed ? (
              loading ? <Loader2 size={10} className="animate-spin" /> : <><Sparkles size={18} /> Analysis ✨</>
            ) : (
              saving ? <Loader2 size={10} className="animate-spin" /> : <><CheckCircle2 size={18} /> Confirm Fuel</>
            )}
          </button>
        </div>

        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#8a8a8a] mt-6 md:block hidden">
          stay on top of it
        </p>
      </div>
    </div>
  )
}
