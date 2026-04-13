'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { 
  ChevronRight, 
  ChevronLeft, 
  Zap, 
  TrendingUp, 
  Activity, 
  Dumbbell, 
  Sparkles,
  Loader2
} from 'lucide-react'

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'identity', title: 'Start' },
  { id: 'metrics', title: 'Body' },
  { id: 'goal', title: 'Goal' },
  { id: 'strategy', title: 'Plan' },
  { id: 'ignition', title: 'Ready' }
]

export default function OnboardingPage() {
  const router = useRouter()
  const [stepIdx, setStepIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    display_name: '',
    weight: '',
    height: '',
    age: '',
    gender: 'male',
    activity: '1.2',
    goal: 'burn',
    calories_target: '',
    protein_target_g: '',
    carbs_target_g: '',
    fat_target_g: ''
  })

  // Australian Metric Calculations
  const strategy = useMemo(() => {
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    const a = parseFloat(form.age)
    if (!w || !h || !a) return null

    let bmr = (10 * w) + (6.25 * h) - (5 * a)
    bmr = form.gender === 'male' ? bmr + 5 : bmr - 161
    
    const tdee = bmr * parseFloat(form.activity)
    let targetCals = tdee
    let protPerKg = 1.8

    if (form.goal === 'burn') { targetCals -= 500; protPerKg = 2.2 }
    if (form.goal === 'build') { targetCals += 300; protPerKg = 2.0 }
    
    const targetProt = w * protPerKg

    return {
      calories: Math.round(targetCals),
      protein: Math.round(targetProt),
      carbs: Math.round((targetCals * 0.45) / 4),
      fat: Math.round((targetCals * 0.25) / 9)
    }
  }, [form.weight, form.height, form.age, form.gender, form.activity, form.goal])

  useEffect(() => {
    if (strategy && stepIdx === 4) {
      setForm(f => ({
        ...f,
        calories_target: String(strategy.calories),
        protein_target_g: String(strategy.protein),
        carbs_target_g: String(strategy.carbs),
        fat_target_g: String(strategy.fat)
      }))
    }
  }, [strategy, stepIdx])

  const next = () => setStepIdx(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStepIdx(s => Math.max(s - 1, 0))

  const finish = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      await api.completeOnboarding({
        display_name: form.display_name,
        calories_target: parseFloat(form.calories_target),
        protein_target_g: parseFloat(form.protein_target_g),
        carbs_target_g: parseFloat(form.carbs_target_g),
        fat_target_g: parseFloat(form.fat_target_g),
      }, session.access_token)

      await supabase.auth.updateUser({
        data: { display_name: form.display_name }
      })

      router.push('/')
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const S = {
    container: { background: '#0a0e27', minHeight: '100dvh', color: 'white', padding: '32px 24px', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#8a8a8a', marginBottom: '8px', display: 'block' } as React.CSSProperties,
    h1: { fontSize: '36px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '24px' } as any,
    input: { width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px 20px', fontSize: '16px', fontWeight: 700, color: 'white', outline: 'none' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', marginBottom: '16px' } as React.CSSProperties,
    btnNext: { background: '#d4ff00', color: '#0a0e27', borderRadius: '16px', padding: '18px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' } as React.CSSProperties,
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
         <div style={{ width: '32px', height: '32px', background: '#d4ff00', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0e27', fontWeight: 900 }}>M</div>
         <span style={{ fontSize: '14px', fontWeight: 800 }}>Morsel Nutrition</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        
        {stepIdx === 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div style={{ width: '54px', height: '54px', background: 'rgba(212,255,0,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Sparkles size={28} color="#d4ff00" />
             </div>
             <h1 style={S.h1}>Fuel your best.<br />Simply.</h1>
             <p style={{ fontSize: '15px', color: '#8a8a8a', lineHeight: 1.6, marginBottom: '40px' }}>Welcome to Morsel. A minimalist nutrition tracker designed for consistency and results.</p>
             <button onClick={next} style={S.btnNext}>Get Started <ChevronRight size={18} /></button>
          </div>
        )}

        {stepIdx === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <h1 style={S.h1}>What should we<br />call you?</h1>
             <div style={{ marginBottom: '40px' }}>
                <label style={S.label}>Display Name</label>
                <input autoFocus style={S.input} placeholder="e.g. Sam" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
             </div>
             <button onClick={next} disabled={!form.display_name} style={{ ...S.btnNext, opacity: form.display_name ? 1 : 0.4 }}>Next <ChevronRight size={18} /></button>
          </div>
        )}

        {stepIdx === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <h1 style={S.h1}>What is your<br />main goal?</h1>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '40px' }}>
                {[
                  { id: 'burn', label: 'Lose Weight', desc: 'Focus on a calorie deficit', icon: <TrendingUp size={18} /> },
                  { id: 'balance', label: 'Maintain', desc: 'Keep your current weight', icon: <Activity size={18} /> },
                  { id: 'build', label: 'Build Muscle', desc: 'Focus on a small surplus', icon: <Dumbbell size={18} /> }
                ].map(g => (
                  <button key={g.id} onClick={() => setForm(f => ({ ...f, goal: g.id }))}
                    style={{ ...S.card, textAlign: 'left', border: form.goal === g.id ? '2px solid #d4ff00' : '1px solid rgba(255,255,255,0.05)', background: form.goal === g.id ? 'rgba(212,255,0,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                       <div style={{ color: form.goal === g.id ? '#d4ff00' : '#8a8a8a' }}>{g.icon}</div>
                       <div>
                          <p style={{ fontSize: '15px', fontWeight: 800, color: form.goal === g.id ? '#d4ff00' : 'white' }}>{g.label}</p>
                          <p style={{ fontSize: '11px', color: '#8a8a8a' }}>{g.desc}</p>
                       </div>
                    </div>
                  </button>
                ))}
             </div>
             <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={back} style={{ width: '56px', height: '56px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft color="white" /></button>
                <button onClick={next} style={S.btnNext}>Select Goal <ChevronRight size={18} /></button>
             </div>
          </div>
        )}

        {stepIdx === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <h1 style={S.h1}>Tell us about<br />yourself.</h1>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                   <label style={S.label}>Weight (kg)</label>
                   <input type="number" style={S.input} placeholder="70" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
                <div>
                   <label style={S.label}>Height (cm)</label>
                   <input type="number" style={S.input} placeholder="175" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} />
                </div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                   <label style={S.label}>Age</label>
                   <input type="number" style={S.input} placeholder="25" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
                </div>
                <div>
                   <label style={S.label}>Gender</label>
                   <select style={S.input as any} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                   </select>
                </div>
             </div>
             <div style={{ marginBottom: '40px' }}>
                <label style={S.label}>Activity Level</label>
                <select style={S.input as any} value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}>
                   <option value="1.2">Mostly Sedentary</option>
                   <option value="1.375">Lightly Active</option>
                   <option value="1.55">Moderately Active</option>
                   <option value="1.725">Very Active</option>
                </select>
             </div>
             <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={back} style={{ width: '56px', height: '56px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft color="white" /></button>
                <button onClick={next} disabled={!form.weight || !form.height || !form.age} style={{ ...S.btnNext, opacity: (form.weight && form.height && form.age) ? 1 : 0.4 }}>Continue <ChevronRight size={18} /></button>
             </div>
          </div>
        )}

        {/* Step 4: Strategy */}
        {stepIdx === 4 && strategy && (
          <div className="animate-in zoom-in-95 fade-in duration-700">
             <h1 style={{ ...S.h1, fontSize: '30px' }}>Your daily targets<br />are ready.</h1>
             
             <div style={{ ...S.card, background: 'rgba(212,255,0,0.05)', borderColor: '#d4ff00', textAlign: 'center', padding: '32px 20px' }}>
                <p style={S.label}>Daily Calories</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                   <span style={{ fontSize: '54px', fontWeight: 900, color: '#d4ff00', letterSpacing: '-0.04em' }}>{strategy.calories}</span>
                   <span style={{ fontSize: '14px', fontWeight: 800, opacity: 0.6 }}>KCAL</span>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '40px' }}>
                {[
                  { label: 'Prot', val: strategy.protein, color: '#d4ff00' },
                  { label: 'Carbs', val: strategy.carbs, color: '#ff2d55' },
                  { label: 'Fat', val: strategy.fat, color: '#00d9ff' }
                ].map(m => (
                  <div key={m.label} style={{ ...S.card, padding: '16px 10px', textAlign: 'center', marginBottom: 0 }}>
                     <p style={{ ...S.label, fontSize: '9px', marginBottom: '4px' }}>{m.label}</p>
                     <span style={{ fontSize: '16px', fontWeight: 900, color: m.color }}>{m.val}g</span>
                  </div>
                ))}
             </div>

             <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={back} style={{ width: '56px', height: '56px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft color="white" /></button>
                <button onClick={next} style={S.btnNext}>Looks Good <ChevronRight size={18} /></button>
             </div>
          </div>
        )}

        {/* Step 5: Ready */}
        {stepIdx === 5 && (
          <div className="animate-in fade-in zoom-in-95 duration-700" style={{ textAlign: 'center' }}>
             <div style={{ width: '72px', height: '72px', background: '#d4ff00', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                <Zap size={36} color="#0a0e27" fill="#0a0e27" />
             </div>
             <h1 style={S.h1}>Ready to go!</h1>
             <p style={{ fontSize: '15px', color: '#8a8a8a', lineHeight: 1.6, marginBottom: '48px' }}>Your plan is loaded. You can now start logging your meals and tracking your progress.</p>
             
             {error && <p style={{ color: '#ff2d55', fontSize: '12px', fontWeight: 700, marginBottom: '20px' }}>{error}</p>}
             
             <button onClick={finish} disabled={loading} style={S.btnNext}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Start Tracking'}
             </button>
          </div>
        )}

      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '40px' }}>
         {STEPS.map((_, i) => (
           <div key={i} style={{ width: i === stepIdx ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === stepIdx ? '#d4ff00' : 'rgba(255,255,255,0.1)', transition: 'all 0.4s' }} />
         ))}
      </div>
    </div>
  )
}
