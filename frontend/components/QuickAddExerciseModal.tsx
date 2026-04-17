'use client'

import { useState } from 'react'
import { X, Plus, Loader2, Dumbbell, Info, PlayCircle } from 'lucide-react'
import { api } from '@/lib/api'

export default function QuickAddExerciseModal({ token, onClose, onSaved }: {
  token: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [equipment, setEquipment] = useState('None')
  const [category, setCategory] = useState('Strength')
  const [recoveryHours, setRecoveryHours] = useState('48')
  const [primaryMG, setPrimaryMG] = useState('Chest')
  const [secondaryMG, setSecondaryMG] = useState('None')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Quads', 'Hamstrings', 'Glutes', 
    'Shoulders', 'Triceps', 'Biceps', 'Core', 'Calves', 'None'
  ]
  const EQUIPMENT = ['None', 'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Smith machine', 'Bodyweight', 'Kettlebell', 'Band']
  const CATEGORIES = ['Strength', 'Accessory', 'Warm-up', 'Cardio', 'Core', 'Mobility']

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Add an exercise name.')
      return
    }
    if (youtubeUrl.trim() && !/^https?:\/\//i.test(youtubeUrl.trim())) {
      setError('Video link must start with http:// or https://')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.createExercise({ 
        name: name.trim(),
        category,
        equipment,
        base_recovery_hours: parseInt(recoveryHours) || 48,
        detail: detail.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        muscle_group_primary: primaryMG,
        muscle_group_secondary: secondaryMG === 'None' ? null : secondaryMG
      }, token)
      onSaved()
    } catch (e) {
      console.error(e)
      setError('Could not save this exercise.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3, 4, 9, 0.8)', backdropFilter: 'blur(20px)' }} />
      
      <div 
        className="animate-in fade-in zoom-in-95 duration-300"
        style={{ 
          position: 'relative', width: '100%', maxWidth: '440px', background: '#030409', 
          borderRadius: '32px', padding: '32px', border: '1px solid rgba(212,255,0,0.15)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.8), 0 0 40px rgba(212,255,0,0.05)',
          maxHeight: '90vh', overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(212,255,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Dumbbell size={20} color="#d4ff00" />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>Add Exercise</h2>
                <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '4px' }}>Save it once and use it anywhere in train.</p>
              </div>
           </div>
           <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="white" />
           </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
           <div>
              <label style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>Exercise Name</label>
              <input 
                autoFocus
                value={name} onChange={e => { setName(e.target.value); setError('') }}
                placeholder="e.g. Incline DB Press"
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '15px', fontWeight: 700, outline: 'none' }}
              />
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                 <label style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>Type</label>
                 <select 
                    value={category} onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                 >
                    {CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
                 </select>
              </div>
              <div>
                 <label style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>Equipment</label>
                 <select 
                    value={equipment} onChange={e => setEquipment(e.target.value)}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                 >
                    {EQUIPMENT.map(item => <option key={item} value={item}>{item}</option>)}
                 </select>
              </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                 <label style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>Main Area</label>
                 <select 
                    value={primaryMG} onChange={e => setPrimaryMG(e.target.value)}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                 >
                    {MUSCLE_GROUPS.filter(mg => mg !== 'None').map(mg => <option key={mg} value={mg}>{mg}</option>)}
                 </select>
              </div>
              <div>
                 <label style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>Second Area</label>
                 <select 
                    value={secondaryMG} onChange={e => setSecondaryMG(e.target.value)}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                 >
                    {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                 </select>
              </div>
           </div>

           <div>
              <label style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>Recovery Hours</label>
              <input 
                type="number"
                min={12}
                max={168}
                value={recoveryHours} onChange={e => setRecoveryHours(e.target.value)}
                placeholder="48"
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', fontWeight: 700, outline: 'none' }}
              />
           </div>

           <div>
              <label style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={12} /> Tips</div>
              </label>
              <textarea 
                value={detail} onChange={e => setDetail(e.target.value)}
                placeholder="Short tip or setup note..."
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', fontWeight: 600, outline: 'none', minHeight: '80px', resize: 'none', fontFamily: 'inherit' }}
              />
           </div>

           <div>
              <label style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PlayCircle size={12} /> Video Link</div>
              </label>
              <input 
                value={youtubeUrl} onChange={e => { setYoutubeUrl(e.target.value); setError('') }}
                placeholder="https://..."
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', fontWeight: 600, outline: 'none' }}
              />
           </div>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.16)' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: '#ff2d55' }}>{error}</p>
          </div>
        )}

        <button 
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{ width: '100%', padding: '18px', borderRadius: '18px', background: '#d4ff00', color: '#030409', border: 'none', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s ease', boxShadow: name ? '0 8px 25px rgba(212,255,0,0.3)' : 'none', opacity: name ? 1 : 0.5 }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={20} strokeWidth={3} /> Save Exercise</>}
        </button>
      </div>
    </div>
  )
}
