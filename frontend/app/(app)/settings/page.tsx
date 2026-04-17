'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { getLocalDateString } from '@/lib/utils'
import { Loader2, Save, Scale, ChevronRight, LogOut, User, Target as TargetIcon, BookOpen, Zap as ZapIcon, Dumbbell, BarChart3 } from 'lucide-react'

interface Target {
  id: string; target_type: string; calories_target: number | null
  protein_target_g: number | null; carbs_target_g: number | null; fat_target_g: number | null
  water_target_ml: number | null;
  effective_from: string
}

function Field({ label, id, value, onChange, suffix, type = 'number' }: {
  label: string; id: string; value: string; onChange: (v: string) => void; suffix: string; type?: string
}) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a8a8a', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder="0"
          style={{ width: '100%', borderRadius: '16px', padding: '16px 20px', paddingRight: suffix ? '56px' : '20px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
        />
        {suffix && <span style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{suffix}</span>}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [displayName, setDisplayName] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [actualWeight, setActualWeight] = useState<number | null>(null)
  const [heightCm, setHeightCm] = useState('')
  const [savingName, setSavingName] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    calories_target: '', protein_target_g: '', carbs_target_g: '', fat_target_g: '', water_target_ml: '2500'
  })

  // BMI Calculation: Use ACTUAL weight, not goal weight
  const bmiValue = (actualWeight && heightCm) 
    ? (actualWeight / Math.pow(parseFloat(heightCm) / 100, 2)).toFixed(1) 
    : '--'
  
  const getBMICategory = (val: string) => {
    const b = parseFloat(val)
    if (isNaN(b)) return { label: 'Incomplete Data', color: '#5a5a5a' }
    if (b < 18.5) return { label: 'Underweight', color: '#00d9ff' }
    if (b < 25) return { label: 'Healthy Range', color: '#d4ff00' }
    if (b < 30) return { label: 'Overweight', color: '#ffa500' }
    return { label: 'Obese', color: '#ff2d55' }
  }
  const bmiCat = getBMICategory(bmiValue)
  const activeTarget = useMemo(() => targets.find(t => t.target_type === 'default') || null, [targets])
  const goalDelta = useMemo(() => {
    if (actualWeight === null || !goalWeight) return null
    return Number((actualWeight - parseFloat(goalWeight)).toFixed(1))
  }, [actualWeight, goalWeight])

  const applyPreset = (preset: 'fat_loss' | 'maintain' | 'muscle_gain') => {
    if (preset === 'fat_loss') {
      setForm({
        calories_target: '2000',
        protein_target_g: '180',
        carbs_target_g: '180',
        fat_target_g: '60',
        water_target_ml: form.water_target_ml || '2500'
      })
      return
    }
    if (preset === 'maintain') {
      setForm({
        calories_target: '2400',
        protein_target_g: '170',
        carbs_target_g: '250',
        fat_target_g: '70',
        water_target_ml: form.water_target_ml || '2500'
      })
      return
    }
    setForm({
      calories_target: '2800',
      protein_target_g: '180',
      carbs_target_g: '320',
      fat_target_g: '80',
      water_target_ml: form.water_target_ml || '3000'
    })
  }

  useEffect(() => {
    const cached = localStorage.getItem('morsel_settings_cache')
    if (cached) {
      try {
        const d = JSON.parse(cached)
        setDisplayName(d.displayName || '')
        setActualWeight(d.actualWeight || null)
        setHeightCm(d.heightCm || '')
        setGoalWeight(d.goalWeight || '')
        if (d.form) setForm(d.form)
      } catch (e: any) {
        console.error('Failed to parse settings cache:', e)
      }
    }

    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      
      const metaName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name
      if (!displayName) setDisplayName(metaName || session.user.email?.split('@')[0] || '')

      try {
        const composite = await api.getProfileComposite(session.access_token)
        const { profile: onb, targets: data, weights } = composite
        
        setTargets(data)
        let freshDisplayName = displayName
        let freshGoalWeight = goalWeight
        let freshHeightCm = heightCm
        let freshActualWeight = actualWeight

        if (onb?.display_name) { setDisplayName(onb.display_name); freshDisplayName = onb.display_name; }
        if (onb?.goal_weight) { setGoalWeight(onb.goal_weight.toString()); freshGoalWeight = onb.goal_weight.toString(); }
        if (onb?.height_cm) { setHeightCm(onb.height_cm.toString()); freshHeightCm = onb.height_cm.toString(); }
        
        if (weights && weights.length > 0) {
          const latest = weights[0] // Already sorted by backend
          setActualWeight(latest.weight_value)
          freshActualWeight = latest.weight_value
        }

        const def = data.find((t: Target) => t.target_type === 'default')
        let freshForm = form
        if (def) {
          freshForm = {
            calories_target: def.calories_target?.toString() || '',
            protein_target_g: def.protein_target_g?.toString() || '',
            carbs_target_g: def.carbs_target_g?.toString() || '',
            fat_target_g: def.fat_target_g?.toString() || '',
            water_target_ml: def.water_target_ml?.toString() || '2500',
          }
          setForm(freshForm)
        }

        localStorage.setItem('morsel_settings_cache', JSON.stringify({
          displayName: freshDisplayName,
          actualWeight: freshActualWeight,
          heightCm: freshHeightCm,
          goalWeight: freshGoalWeight,
          form: freshForm
        }))

      } catch (e) { console.error("COMPOSITE_LOAD_FAILED:", e) }
      finally { setLoading(false) }
    })
  }, [])

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const caloriesVal = form.calories_target ? parseFloat(form.calories_target) : null
      const proteinVal = form.protein_target_g ? parseFloat(form.protein_target_g) : null
      const carbsVal = form.carbs_target_g ? parseFloat(form.carbs_target_g) : null
      const fatVal = form.fat_target_g ? parseFloat(form.fat_target_g) : null
      const waterVal = form.water_target_ml ? parseFloat(form.water_target_ml) : 2500

      if ((caloriesVal !== null && caloriesVal < 0) || (caloriesVal !== null && caloriesVal > 10000)) {
        setError('Calories must be between 0-10000')
        setSaving(false)
        return
      }
      if ((proteinVal !== null && proteinVal < 0) || (proteinVal !== null && proteinVal > 500)) {
        setError('Protein must be between 0-500g')
        setSaving(false)
        return
      }
      if ((waterVal !== null && waterVal < 0) || (waterVal > 10000)) {
        setError('Water must be between 0-10000ml')
        setSaving(false)
        return
      }

      const def = targets.find(t => t.target_type === 'default')
      const body = {
        target_type: 'default',
        calories_target: caloriesVal,
        protein_target_g: proteinVal,
        carbs_target_g: carbsVal,
        fat_target_g: fatVal,
        water_target_ml: waterVal,
        effective_from: getLocalDateString(),
      }
      if (def) await api.updateTarget(def.id, body, token)
      else await api.createTarget(body, token)
      localStorage.removeItem('morsel_settings_cache')
      setSuccess(true); setTimeout(() => setSuccess(false), 2500)
    } catch (e: any) { 
      console.error(e)
      setError(e.message || 'Failed to save targets. Please try again.')
    }
    finally { setSaving(false) }
  }

  const handleSaveName = async () => {
    if (!displayName) return
    setError('')
    setSavingName(true)
    try {
      const heightVal = heightCm ? parseFloat(heightCm) : null
      const weightVal = goalWeight ? parseFloat(goalWeight) : null
      const actualVal = actualWeight

      if ((heightVal !== null && heightVal < 100) || (heightVal !== null && heightVal > 250)) {
        setError('Height must be between 100-250cm')
        setSavingName(false)
        return
      }
      if ((weightVal !== null && weightVal < 30) || (weightVal !== null && weightVal > 300)) {
        setError('Goal weight must be between 30-300kg')
        setSavingName(false)
        return
      }
      if ((actualVal !== null && actualVal < 30) || (actualVal !== null && actualVal > 300)) {
        setError('Actual weight must be between 30-300kg')
        setSavingName(false)
        return
      }

       const supabase = createClient()
       await api.updateOnboarding({ 
         display_name: displayName,
         goal_weight: weightVal,
         height_cm: heightVal
       }, token) 

       if (actualVal !== null) {
         await api.createWeight({
            date: getLocalDateString(),
            weight_value: actualVal,
            unit: 'kg'
         }, token)
       }
       
       await supabase.auth.updateUser({ data: { display_name: displayName } })
       
       const p = await api.getOnboarding(token)
       setDisplayName(p.display_name)
       setGoalWeight(p.goal_weight?.toString() || '')
       setHeightCm(p.height_cm?.toString() || '')
       
       localStorage.removeItem('morsel_settings_cache')
       setSuccess(true); setTimeout(() => setSuccess(false), 2500)
    }
    catch (e: any) {
      console.error("SAVE_ERROR:", e)
      setError(e.message || "Failed to save profile. Please try again.")
    } finally { setSavingName(false) }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const S = {
    container: { 
      width: '100%',
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px 16px 140px', 
      minHeight: '100dvh', 
      background: '#030409', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column' as const
    } as React.CSSProperties,
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--card-radius)', padding: '24px', marginBottom: '16px', backdropFilter: 'blur(16px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: '100%', boxSizing: 'border-box' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', color: '#d4ff00' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Update your profile, weight, and goals.</p>
      </div>

      {(error || success) && (
        <div style={{ ...S.card, marginBottom: '20px', padding: '16px 18px', border: success ? '1px solid rgba(212,255,0,0.25)' : '1px solid rgba(255,45,85,0.2)', background: success ? 'rgba(212,255,0,0.06)' : 'rgba(255,45,85,0.06)' }}>
          <p style={{ fontSize: '13px', fontWeight: 800, color: success ? '#d4ff00' : '#ff2d55' }}>
            {success ? 'Saved.' : error}
          </p>
        </div>
      )}

      <p style={S.label}>Profile</p>
      <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div style={{ borderRadius: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Current Weight</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: 'white', marginTop: '8px' }}>{actualWeight !== null ? actualWeight : '--'} <span style={{ fontSize: '12px', color: '#8a8a8a' }}>kg</span></p>
          </div>
          <div style={{ borderRadius: '16px', padding: '16px', background: 'rgba(212,255,0,0.03)', border: '1px solid rgba(212,255,0,0.12)' }}>
            <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Goal Weight</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: 'white', marginTop: '8px' }}>{goalWeight || '--'} <span style={{ fontSize: '12px', color: '#8a8a8a' }}>kg</span></p>
          </div>
          <div style={{ borderRadius: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}>BMI</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: bmiCat.color, marginTop: '8px' }}>{bmiValue}</p>
            <p style={{ fontSize: '10px', color: bmiCat.color, fontWeight: 800, marginTop: '4px', textTransform: 'uppercase' }}>{bmiCat.label}</p>
          </div>
          <div style={{ borderRadius: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Weight Gap</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: goalDelta === null ? 'white' : goalDelta > 0 ? '#d4ff00' : '#00d9ff', marginTop: '8px' }}>
              {goalDelta === null ? '--' : `${goalDelta > 0 ? '-' : '+'}${Math.abs(goalDelta)}`}
              <span style={{ fontSize: '12px', color: '#8a8a8a', marginLeft: '4px' }}>kg</span>
            </p>
            <p style={{ fontSize: '10px', color: '#8a8a8a', marginTop: '4px' }}>From current to goal</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '10px', fontWeight: 900, color: '#5a5a5a', marginBottom: '8px', display: 'block' }}>DISPLAY NAME</label>
            <User size={16} color="#8a8a8a" style={{ position: 'absolute', left: '16px', bottom: '16px' }} />
            <input
              id="display-name" type="text" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Name"
              style={{ width: '100%', borderRadius: '16px', padding: '14px 16px 14px 44px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
             <label style={{ fontSize: '10px', fontWeight: 900, color: '#5a5a5a', marginBottom: '8px', display: 'block' }}>ACTUAL WEIGHT</label>
             <Scale size={16} color="#00d9ff" style={{ position: 'absolute', left: '16px', bottom: '16px' }} />
             <input
               id="actual-weight" type="number" value={actualWeight ?? ''}
               onChange={e => setActualWeight(e.target.value ? parseFloat(e.target.value) : null)}
               placeholder="Current"
               style={{ width: '100%', borderRadius: '16px', padding: '14px 16px 14px 44px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '1px solid rgba(0,217,255,0.2)', background: 'rgba(0,217,255,0.03)', color: 'white', boxSizing: 'border-box' }}
             />
             <span style={{ position: 'absolute', right: '16px', bottom: '16px', fontSize: '10px', fontWeight: 900, color: '#00d9ff' }}>KG</span>
          </div>
          <div style={{ position: 'relative' }}>
             <label style={{ fontSize: '10px', fontWeight: 900, color: '#5a5a5a', marginBottom: '8px', display: 'block' }}>GOAL WEIGHT</label>
             <TargetIcon size={16} color="#d4ff00" style={{ position: 'absolute', left: '16px', bottom: '16px' }} />
             <input
               id="goal-weight" type="number" value={goalWeight}
               onChange={e => setGoalWeight(e.target.value)}
               placeholder="Goal"
               style={{ width: '100%', borderRadius: '16px', padding: '14px 16px 14px 44px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '1px solid rgba(212,255,0,0.2)', background: 'rgba(212,255,0,0.03)', color: 'white', boxSizing: 'border-box' }}
             />
             <span style={{ position: 'absolute', right: '16px', bottom: '16px', fontSize: '10px', fontWeight: 900, color: '#d4ff00' }}>KG</span>
          </div>
          <div style={{ position: 'relative' }}>
             <label style={{ fontSize: '10px', fontWeight: 900, color: '#5a5a5a', marginBottom: '8px', display: 'block' }}>HEIGHT</label>
             <ChevronRight size={16} color="#8a8a8a" style={{ position: 'absolute', left: '16px', bottom: '16px', transform: 'rotate(90deg)' }} />
             <input
               id="height-cm" type="number" value={heightCm}
               onChange={e => setHeightCm(e.target.value)}
               placeholder="Height"
               style={{ width: '100%', borderRadius: '16px', padding: '14px 16px 14px 44px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', boxSizing: 'border-box' }}
             />
             <span style={{ position: 'absolute', right: '16px', bottom: '16px', fontSize: '10px', fontWeight: 900, color: '#5a5a5a' }}>CM</span>
          </div>
        </div>
        
        <button onClick={handleSaveName} disabled={savingName}
          style={{ width: '100%', height: '52px', borderRadius: '16px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(212,255,0,0.3)', marginTop: '8px' }}>
          {savingName ? <Loader2 size={16} className="animate-spin" /> : <><Save size={18} /> Save Profile</>}
        </button>
      </div>

      <p style={{ ...S.label, marginTop: '32px' }}>Daily Goals</p>
      {loading ? (
        <div style={{ ...S.card, height: 200, opacity: 0.3 }} />
      ) : (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>Daily goals</p>
              <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '4px' }}>
                {activeTarget?.effective_from ? `Active since ${new Date(activeTarget.effective_from).toLocaleDateString()}` : 'No saved target yet'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              <button onClick={() => applyPreset('fat_loss')} style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>Fat loss</button>
              <button onClick={() => applyPreset('maintain')} style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>Maintain</button>
              <button onClick={() => applyPreset('muscle_gain')} style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>Muscle gain</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <Field id="set-cal"   label="Calories" value={form.calories_target}  onChange={v => setForm(f => ({ ...f, calories_target: v }))}  suffix="kcal" />
            <Field id="set-prot"  label="Protein"  value={form.protein_target_g} onChange={v => setForm(f => ({ ...f, protein_target_g: v }))} suffix="g" />
            <Field id="set-carbs" label="Carbs"    value={form.carbs_target_g}   onChange={v => setForm(f => ({ ...f, carbs_target_g: v }))}   suffix="g" />
            <Field id="set-fat"   label="Fat"      value={form.fat_target_g}     onChange={v => setForm(f => ({ ...f, fat_target_g: v }))}     suffix="g" />
            <Field id="set-water" label="Water" value={form.water_target_ml} onChange={v => setForm(f => ({ ...f, water_target_ml: v }))} suffix="ml" />
          </div>
          <button id="save-settings-btn" onClick={handleSave} disabled={saving}
            style={{
              width: '100%', padding: '18px', borderRadius: '16px', cursor: 'pointer',
              background: success ? '#d4ff00' : 'rgba(212,255,0,0.15)', color: success ? '#030409' : '#d4ff00',
              fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: success ? '0 8px 30px rgba(212,255,0,0.4)' : 'none',
              border: success ? 'none' : '1px solid rgba(212,255,0,0.2)'
            }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : success ? 'Saved' : 'Save Goals'}
          </button>
        </div>
      )}

      <p style={{ ...S.label, marginTop: '32px' }}>More</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <button onClick={() => router.push('/templates')}
          style={{ ...S.card, margin: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0,217,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="#00d9ff" />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Personal Library</h4>
            <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>Manage your meal templates and staples</p>
          </div>
        </button>

        <button onClick={() => router.push('/supplements')}
          style={{ ...S.card, margin: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', background: 'rgba(212,255,0,0.02)', border: '1px solid rgba(212,255,0,0.05)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(212,255,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ZapIcon size={24} color="#d4ff00" />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Supplement Stack</h4>
            <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>Set up your daily supplements</p>
          </div>
        </button>

        <button onClick={() => router.push('/weight')}
          style={{ ...S.card, margin: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={24} color="white" />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Weight</h4>
            <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>Track your weight and trend</p>
          </div>
        </button>

        <button onClick={() => router.push('/workouts')}
          style={{ ...S.card, margin: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', background: 'rgba(0,217,255,0.02)', border: '1px solid rgba(0,217,255,0.05)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0,217,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Dumbbell size={24} color="#00d9ff" />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Workouts</h4>
            <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>Open your session and recovery page</p>
          </div>
        </button>

        <button onClick={() => router.push('/analytics')}
          style={{ ...S.card, margin: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={24} color="white" />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Insights</h4>
            <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>See your food, water, weight, and workout trends</p>
          </div>
        </button>
      </div>

      {/* ── Sign Out ── */}
      <div style={{ marginTop: '32px' }}>
        <button id="sign-out-btn" onClick={handleSignOut}
          style={{
            width: '100%', padding: '16px', borderRadius: '16px',
            background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.1)',
            color: '#ff2d55', fontWeight: 900, fontSize: '12px',
            textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
          }}>
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  )
}
