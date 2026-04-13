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
  { id: 'identity', title: 'Identity' },
  { id: 'metrics', title: 'Metrics' },
  { id: 'goal', title: 'Mission' },
  { id: 'strategy', title: 'Strategy' },
  { id: 'ignition', title: 'Ignition' }
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

  const strategy = useMemo(() => {
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    const a = parseFloat(form.age)
    if (!w || !h || !a) return null

    // Mifflin-St Jeor
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

      // 1. Update Backend Profile & Targets
      await api.completeOnboarding({
        display_name: form.display_name,
        calories_target: parseFloat(form.calories_target),
        protein_target_g: parseFloat(form.protein_target_g),
        carbs_target_g: parseFloat(form.carbs_target_g),
        fat_target_g: parseFloat(form.fat_target_g),
      }, session.access_token)

      // 2. Sync with Supabase Auth Metadata (prevents UI jump/flicker)
      await supabase.auth.updateUser({
        data: { display_name: form.display_name }
      })

      router.push('/')
    } catch (e: any) {
      console.error('FINISH_ERROR:', e)
      setError(e.message || 'Transmission failed')
    } finally {
      setLoading(false)
    }
  }

  // Styles
  const S = {
    container: { background: '#0a0e27', minHeight: '100dvh', color: 'white', padding: '40px 24px', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#8a8a8a', marginBottom: '8px', display: 'block' } as React.CSSProperties,
    h1: { fontSize: '42px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '24px' } as any,
    input: { width: '100%', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px 24px', fontSize: '18px', fontWeight: 700, color: 'white', outline: 'none', transition: 'all 0.3s' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '20px' } as React.CSSProperties,
    btnNext: { background: '#d4ff00', color: '#0a0e27', borderRadius: '18px', padding: '20px', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%' } as React.CSSProperties,
  }

  return (
    <div style={S.container}>
      {/* HUD Tracker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: '#d4ff00', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0e27', fontWeight: 900 }}>M</div>
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '-0.02em' }}>Initialize Morsel</span>
         </div>
         <div style={{ fontSize: '10px', fontWeight: 900, color: '#8a8a8a' }}>SYSTEM_SECURE_01</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '440px', margin: '0 auto', width: '100%' }}>
        
        {/* Step 0: Welcome */}
        {stepIdx === 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div style={{ width: '60px', height: '60px', background: 'rgba(212,255,0,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Zap size={30} color="#d4ff00" />
             </div>
             <h1 style={S.h1}>Witness the<br />New Era of<br />Tracking.</h1>
             <p style={{ fontSize: '15px', color: '#8a8a8a', lineHeight: 1.6, marginBottom: '40px' }}>Welcome to Morsel. A high-fidelity engine built for precision fueling and bio-metric analysis.</p>
             <button onClick={next} style={S.btnNext}>Initialize Profile <ChevronRight size={18} /></button>
          </div>
        )}

        {/* Step 1: Identity */}
        {stepIdx === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <h1 style={S.h1}>Identity.<br />Who is this?</h1>
             <div style={{ marginBottom: '40px' }}>
                <label style={S.label}>Assigned Name</label>
                <input 
                  autoFocus
                  style={S.input} 
                  placeholder="e.g. Maverick" 
                  value={form.display_name} 
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                />
             </div>
             <button onClick={next} disabled={!form.display_name} style={{ ...S.btnNext, opacity: form.display_name ? 1 : 0.4 }}>Next Phase <ChevronRight size={18} /></button>
          </div>
        )}

        {/* Step 2: Goal */}
        {stepIdx === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <h1 style={S.h1}>Mission.<br />Target Outcome?</h1>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
                {[
                  { id: 'burn', label: 'Burn', desc: 'Accelerated fat loss phase', icon: <Zap size={18} /> },
                  { id: 'balance', label: 'Balance', desc: 'Hold current bio-mass', icon: <Activity size={18} /> },
                  { id: 'build', label: 'Build', desc: 'Hypertrophic surplus', icon: <Dumbbell size={18} /> }
                ].map(g => (
                  <button key={g.id} onClick={() => setForm(f => ({ ...f, goal: g.id }))}
                    style={{ ...S.card, textAlign: 'left', border: form.goal === g.id ? '2px solid #d4ff00' : '1px solid rgba(255,255,255,0.05)', background: form.goal === g.id ? 'rgba(212,255,0,0.05)' : 'rgba(255,255,255,0.02)', padding: '20px', transition: 'all 0.2s', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                       <div style={{ color: form.goal === g.id ? '#d4ff00' : '#8a8a8a' }}>{g.icon}</div>
                       <div>
                          <p style={{ fontSize: '15px', fontWeight: 800, color: form.goal === g.id ? '#d4ff00' : 'white' }}>{g.label}</p>
                          <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>{g.desc}</p>
                       </div>
                    </div>
                  </button>
                ))}
             </div>
             <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={back} style={{ width: '64px', height: '64px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft color="white" /></button>
                <button onClick={next} style={S.btnNext}>Select Target <ChevronRight size={18} /></button>
             </div>
          </div>
        )}

        {/* Step 3: Metrics */}
        {stepIdx === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <h1 style={S.h1}>Bio-metrics.<br />The Data.</h1>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                   <label style={S.label}>Weight (kg)</label>
                   <input type="number" style={S.input} placeholder="70" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
                <div>
                   <label style={S.label}>Height (cm)</label>
                   <input type="number" style={S.input} placeholder="175" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} />
                </div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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
                <label style={S.label}>Activity Intensity</label>
                <select style={S.input as any} value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}>
                   <option value="1.2">Low (Office)</option>
                   <option value="1.375">Active (1-2 days)</option>
                   <option value="1.55">Moderate (3-5 days)</option>
                   <option value="1.725">Elite (6-7 days)</option>
                </select>
             </div>
             <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={back} style={{ width: '64px', height: '64px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft color="white" /></button>
                <button onClick={next} disabled={!form.weight || !form.height || !form.age} style={{ ...S.btnNext, opacity: (form.weight && form.height && form.age) ? 1 : 0.4 }}>Analyze <ChevronRight size={18} /></button>
             </div>
          </div>
        )}

        {/* Step 4: Strategy (The Reveal) */}
        {stepIdx === 4 && strategy && (
          <div className="animate-in zoom-in-95 fade-in duration-1000">
             <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <Sparkles size={32} color="#d4ff00" style={{ marginBottom: '16px' }} />
                <h1 style={{ ...S.h1, fontSize: '36px' }}>Blueprint.<br />Strategy Calculated.</h1>
             </div>
             
             <div style={{ ...S.card, background: 'rgba(212,255,0,0.05)', borderColor: '#d4ff00', textAlign: 'center', padding: '32px' }}>
                <p style={S.label}>Daily Energy Target</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                   <span style={{ fontSize: '64px', fontWeight: 900, color: '#d4ff00', letterSpacing: '-0.05em' }}>{strategy.calories}</span>
                   <span style={{ fontSize: '14px', fontWeight: 800, opacity: 0.6 }}>KCAL</span>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '40px' }}>
                {[
                  { label: 'Prot', val: strategy.protein, color: '#d4ff00' },
                  { label: 'Carbs', val: strategy.carbs, color: '#ff2d55' },
                  { label: 'Fat', val: strategy.fat, color: '#00d9ff' }
                ].map(m => (
                  <div key={m.label} style={{ ...S.card, padding: '16px', textAlign: 'center', marginBottom: 0 }}>
                     <p style={{ ...S.label, marginBottom: '4px' }}>{m.label}</p>
                     <span style={{ fontSize: '20px', fontWeight: 900, color: m.color }}>{m.val}g</span>
                  </div>
                ))}
             </div>

             <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={back} style={{ width: '64px', height: '64px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft color="white" /></button>
                <button onClick={next} style={S.btnNext}>Accept Protocol <ChevronRight size={18} /></button>
             </div>
          </div>
        )}

        {/* Step 5: Ignite */}
        {stepIdx === 5 && (
          <div className="animate-in fade-in zoom-in-95 duration-700" style={{ textAlign: 'center' }}>
             <div style={{ width: '80px', height: '80px', background: '#d4ff00', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 0 40px rgba(212,255,0,0.3)' }}>
                <Zap size={40} color="#0a0e27" fill="#0a0e27" />
             </div>
             <h1 style={S.h1}>Ignition Ready.</h1>
             <p style={{ fontSize: '15px', color: '#8a8a8a', lineHeight: 1.6, marginBottom: '48px' }}>Your bio-metric blueprint is loaded. You are now cleared for tracking. Welcome to the future of fueling.</p>
             
             {error && <p style={{ color: '#ff2d55', fontSize: '12px', fontWeight: 700, marginBottom: '20px' }}>{error}</p>}
             
             <button onClick={finish} disabled={loading} style={S.btnNext}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Ignite System'}
             </button>
          </div>
        )}

      </div>

      {/* Footer HUD */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '40px' }}>
         {STEPS.map((_, i) => (
           <div key={i} style={{ width: i === stepIdx ? '24px' : '6px', height: '6px', borderRadius: '3px', background: i === stepIdx ? '#d4ff00' : 'rgba(255,255,255,0.1)', transition: 'all 0.4s' }} />
         ))}
      </div>
    </div>
  )
}
