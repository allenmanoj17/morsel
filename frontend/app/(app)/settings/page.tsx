'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { getLocalDateString } from '@/lib/utils'
import { Loader2, Save, Scale, ChevronRight, LogOut, User, Target as TargetIcon } from 'lucide-react'

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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      
      const metaName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name
      setDisplayName(metaName || session.user.email?.split('@')[0] || '')

      try {
        const [data, onb, weights] = await Promise.all([
          api.getTargets(session.access_token),
          api.getOnboarding(session.access_token).catch(() => null),
          api.getWeights(session.access_token).catch(() => []),
        ])
        setTargets(data)
        if (onb?.display_name) setDisplayName(onb.display_name)
        if (onb?.goal_weight) setGoalWeight(onb.goal_weight.toString())
        if (onb?.height_cm) setHeightCm(onb.height_cm.toString())
        
        // Latest Weight
        if (weights && weights.length > 0) {
          const latest = weights.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
          setActualWeight(latest.weight_value)
        }

        const def = data.find((t: Target) => t.target_type === 'default')
        if (def) setForm({
          calories_target: def.calories_target?.toString() || '',
          protein_target_g: def.protein_target_g?.toString() || '',
          carbs_target_g: def.carbs_target_g?.toString() || '',
          fat_target_g: def.fat_target_g?.toString() || '',
          water_target_ml: def.water_target_ml?.toString() || '2500',
        })
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const def = targets.find(t => t.target_type === 'default')
      const body = {
        target_type: 'default',
        calories_target: form.calories_target ? parseFloat(form.calories_target) : null,
        protein_target_g: form.protein_target_g ? parseFloat(form.protein_target_g) : null,
        carbs_target_g: form.carbs_target_g ? parseFloat(form.carbs_target_g) : null,
        fat_target_g: form.fat_target_g ? parseFloat(form.fat_target_g) : null,
        water_target_ml: form.water_target_ml ? parseFloat(form.water_target_ml) : 2500,
        effective_from: getLocalDateString(),
      }
      if (def) await api.updateTarget(def.id, body, token)
      else await api.createTarget(body, token)
      setSuccess(true); setTimeout(() => setSuccess(false), 2500)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleSaveName = async () => {
    if (!displayName) return
    setSavingName(true)
    try { 
       const supabase = createClient()
       // 1. Update Core Profile Shard
       await api.updateOnboarding({ 
         display_name: displayName,
         goal_weight: goalWeight ? parseFloat(goalWeight) : null,
         height_cm: heightCm ? parseFloat(heightCm) : null
       }, token) 

       // 2. Log Weight to Engine if changed
       if (actualWeight !== null) {
         await api.createWeight({
            date: getLocalDateString(),
            weight_value: actualWeight,
            unit: 'kg'
         }, token)
       }
       
       // 3. Sync Auth Metadata
       await supabase.auth.updateUser({ data: { display_name: displayName } })
       
       // 3. Force Re-fetch
       const p = await api.getOnboarding(token)
       setDisplayName(p.display_name)
       setGoalWeight(p.goal_weight?.toString() || '')
       setHeightCm(p.height_cm?.toString() || '')
       
       setSuccess(true); setTimeout(() => setSuccess(false), 2500)
    }
    catch (e) {
      console.error("SAVE_ERROR:", e)
      alert("Verification failed. Please try again.")
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
        <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Customise your physiological targets ✨</p>
      </div>

      {/* ── Biological Status ── */}
      <p style={S.label}>Physiological Status</p>
      <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
               id="actual-weight" type="number" value={actualWeight || ''}
               onChange={e => setActualWeight(parseFloat(e.target.value))}
               placeholder="Current"
               style={{ width: '100%', borderRadius: '16px', padding: '14px 16px 14px 44px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '1px solid rgba(0,217,255,0.2)', background: 'rgba(0,217,255,0.03)', color: 'white', boxSizing: 'border-box' }}
             />
             <span style={{ position: 'absolute', right: '16px', bottom: '16px', fontSize: '10px', fontWeight: 900, color: '#00d9ff' }}>KG</span>
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
          <div style={{ background: 'rgba(212,255,0,0.02)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(212,255,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: '9px', fontWeight: 900, color: '#5a5a5a', letterSpacing: '0.1em' }}>BIO-METRIC BMI</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: bmiCat.color }}>{bmiValue}</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: bmiCat.color, textTransform: 'uppercase' }}>{bmiCat.label}</span>
            </div>
          </div>
        </div>
        
        <button onClick={handleSaveName} disabled={savingName}
          style={{ width: '100%', height: '52px', borderRadius: '16px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(212,255,0,0.3)', marginTop: '8px' }}>
          {savingName ? <Loader2 size={16} className="animate-spin" /> : <><Save size={18} /> Update Bio-Status</>}
        </button>
      </div>

      {/* ── Ambitious Goals ── */}
      <p style={S.label}>Goal Calibration</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '8px' }}>
           <div style={{ ...S.card, position: 'relative', margin: 0 }}>
              <label style={{ fontSize: '10px', fontWeight: 900, color: '#5a5a5a', marginBottom: '8px', display: 'block' }}>TARGET WEIGHT</label>
              <TargetIcon size={16} color="#d4ff00" style={{ position: 'absolute', left: '16px', bottom: '16px' }} />
              <input
                id="goal-weight" type="number" value={goalWeight}
                onChange={e => setGoalWeight(e.target.value)}
                placeholder="Target"
                style={{ width: '100%', borderRadius: '16px', padding: '14px 16px 14px 44px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '1px solid rgba(212,255,0,0.2)', background: 'rgba(212,255,0,0.03)', color: 'white', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: '16px', bottom: '16px', fontSize: '10px', fontWeight: 900, color: '#d4ff00' }}>KG</span>
           </div>
           
           <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212,255,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Scale size={20} color="#d4ff00" />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 900, color: 'white' }}>{goalWeight || '--'} kg</p>
                <p style={{ fontSize: '10px', color: '#8a8a8a', fontWeight: 800 }}>Aspiration</p>
              </div>
           </div>
      </div>

      {/* ── Measurements ── */}
      <p style={S.label}>Analytics Depth</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <button onClick={() => router.push('/weight')}
          style={{ ...S.card, margin: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(212,255,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={24} color="#d4ff00" />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Body Weight Engine</h4>
            <p style={{ fontSize: '12px', color: '#8a8a8a', marginTop: '2px' }}>Manage daily weigh-ins and physiological trends</p>
          </div>
        </button>
      </div>

      {/* ── Nutrition Goals ── */}
      <p style={{ ...S.label, marginTop: '32px' }}>Nutrition targets (Daily)</p>
      {loading ? (
        <div style={{ ...S.card, height: 200, opacity: 0.3 }} />
      ) : (
        <div style={S.card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <Field id="set-cal"   label="Calories" value={form.calories_target}  onChange={v => setForm(f => ({ ...f, calories_target: v }))}  suffix="kcal" />
            <Field id="set-prot"  label="Protein"  value={form.protein_target_g} onChange={v => setForm(f => ({ ...f, protein_target_g: v }))} suffix="g" />
            <Field id="set-carbs" label="Carbs"    value={form.carbs_target_g}   onChange={v => setForm(f => ({ ...f, carbs_target_g: v }))}   suffix="g" />
            <Field id="set-fat"   label="Fat"      value={form.fat_target_g}     onChange={v => setForm(f => ({ ...f, fat_target_g: v }))}     suffix="g" />
            <Field id="set-water" label="Hydration" value={form.water_target_ml} onChange={v => setForm(f => ({ ...f, water_target_ml: v }))} suffix="ml" />
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
            {saving ? <Loader2 size={16} className="animate-spin" /> : success ? 'Successfully Saved' : 'Save Goals'}
          </button>
        </div>
      )}



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
