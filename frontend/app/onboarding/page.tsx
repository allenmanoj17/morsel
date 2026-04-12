'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Leaf, ChevronRight, ChevronLeft, Loader2, Sparkles, User, Dumbbell, Target } from 'lucide-react'

const STEPS = ['intro', 'smart_calc', 'manual_verify'] as const
type Step = typeof STEPS[number]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStepIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [setupMode, setSetupMode] = useState<'smart' | 'manual'>('smart')

  const [form, setForm] = useState({
    display_name: '',
    calories_target: '',
    protein_target_g: '',
    carbs_target_g: '',
    fat_target_g: '',
    // Calc helpers
    weight: '',
    height: '',
    age: '',
    gender: 'male',
    activity: '1.2',
    goal: 'maintain' // maintain, lose, gain
  })

  // TDEE Logic
  const calculatedMacros = useMemo(() => {
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    const a = parseFloat(form.age)
    if (!w || !h || !a) return null

    // Mifflin-St Jeor
    let bmr = (10 * w) + (6.25 * h) - (5 * a)
    bmr = form.gender === 'male' ? bmr + 5 : bmr - 161

    const tdee = bmr * parseFloat(form.activity)
    
    let targetCals = tdee
    if (form.goal === 'lose') targetCals -= 500
    if (form.goal === 'gain') targetCals += 300

    // Protein: 1.8g per kg for gain/lose (high retention), 1.5g for maintain
    const protPerKg = form.goal === 'maintain' ? 1.6 : 2.0
    const targetProt = w * protPerKg

    return {
      calories: Math.round(targetCals),
      protein: Math.round(targetProt),
      carbs: Math.round((targetCals * 0.45) / 4), // 45% carbs default
      fat: Math.round((targetCals * 0.25) / 9)    // 25% fat default
    }
  }, [form.weight, form.height, form.age, form.gender, form.activity, form.goal])

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (currentStep === 'intro' && setupMode === 'manual') {
      setStepIdx(2) // Jump to verify/manual
      return
    }
    if (step < STEPS.length - 1) setStepIdx(s => s + 1)
  }
  const handleBack = () => {
    if (currentStep === 'manual_verify' && setupMode === 'manual') {
      setStepIdx(0)
      return
    }
    if (step > 0) setStepIdx(s => s - 1)
  }

  const applyCalculated = () => {
    if (calculatedMacros) {
      setForm(f => ({
        ...f,
        calories_target: String(calculatedMacros.calories),
        protein_target_g: String(calculatedMacros.protein),
        carbs_target_g: String(calculatedMacros.carbs),
        fat_target_g: String(calculatedMacros.fat)
      }))
      handleNext()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      await api.completeOnboarding({
        display_name: form.display_name,
        calories_target: form.calories_target ? parseFloat(form.calories_target) : null,
        protein_target_g: form.protein_target_g ? parseFloat(form.protein_target_g) : null,
        carbs_target_g: form.carbs_target_g ? parseFloat(form.carbs_target_g) : null,
        fat_target_g: form.fat_target_g ? parseFloat(form.fat_target_g) : null,
      }, session.access_token)

      router.push('/')
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, id, placeholder, value, onChange, type = 'text', suffix }: {
    label: string; id: string; placeholder: string; value: string;
    onChange: (v: string) => void; type?: string; suffix?: string
  }) => (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] uppercase font-black tracking-widest text-[#8a8a8a] ml-2">{label}</label>
      <div className="relative group">
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="relative w-full rounded-[10px] px-5 py-4 text-base font-bold outline-none border-2 border-[#f0f0f0] bg-white text-[#0a0e27] transition-all focus:border-[#f0f0f0]"
        />
        {suffix && (
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#8a8a8a] uppercase tracking-widest">{suffix}</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh flex flex-col p-8 max-w-lg mx-auto overflow-hidden relative bg-[#fafafa]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-12 mt-6 z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg bg-[#d4ff00] text-[#0a0e27]">M</div>
        <div className="flex flex-col">
          <span className="font-bold text-2xl tracking-tighter text-[#0a0e27]">Morsel</span>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#8a8a8a] -mt-1">Initialization</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2.5 mb-10 z-10">
        {STEPS.map((_, i) => (
          <div key={i} className="h-1.5 rounded-full flex-1 transition-all duration-700 overflow-hidden bg-[#f0f0f0]">
             <div 
               className="h-full bg-[#d4ff00] transition-all duration-700"
               style={{ 
                 width: i < step ? '100%' : (i === step ? '100%' : '0%'),
                 opacity: i <= step ? 1 : 0
               }} 
             />
          </div>
        ))}
      </div>

      <div className="flex-1 z-10 animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-y-auto pb-4 custom-scrollbar">
        {currentStep === 'intro' && (
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold tracking-tighter text-[#0a0e27] leading-tight mb-2">Initialize.<br />Who are you?</h1>
            <Field
              id="display-name"
              label="Display Name"
              placeholder="e.g. Maverick"
              value={form.display_name}
              onChange={v => setForm(f => ({ ...f, display_name: v }))}
            />
            
            <div className="mt-8">
              <label className="text-[10px] uppercase font-black tracking-widest text-[#8a8a8a] ml-2 mb-4 block">Choose Setup Protocol</label>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setSetupMode('smart')}
                  className={`p-6 rounded-2xl border-2 transition-all flex items-start gap-4 text-left ${setupMode === 'smart' ? 'border-[#d4ff00] bg-[#d4ff00]/[0.05]' : 'border-[#f0f0f0] bg-white'}`}
                >
                  <Sparkles className={setupMode === 'smart' ? 'text-[#0a0e27]' : 'text-[#8a8a8a]'} />
                  <div>
                    <p className="font-bold text-[15px] text-[#0a0e27]">Smart Setup (Recommended)</p>
                    <p className="text-[12px] text-[#8a8a8a] font-medium leading-relaxed mt-1">We calculate your macros using the MSJ equation based on your biometrics.</p>
                  </div>
                </button>
                <button 
                  onClick={() => setSetupMode('manual')}
                  className={`p-6 rounded-2xl border-2 transition-all flex items-start gap-4 text-left ${setupMode === 'manual' ? 'border-[#d4ff00] bg-[#d4ff00]/[0.05]' : 'border-[#f0f0f0] bg-white'}`}
                >
                  <User className={setupMode === 'manual' ? 'text-[#0a0e27]' : 'text-[#8a8a8a]'} />
                  <div>
                    <p className="font-bold text-[15px] text-[#0a0e27]">Manual Override</p>
                    <p className="text-[12px] text-[#8a8a8a] font-medium mt-1">You already know your numbers. Input them directly.</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'smart_calc' && (
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tighter text-[#0a0e27] leading-tight">Bio-Metrics.</h1>
            <p className="text-[13px] font-medium text-[#8a8a8a] mb-4">Precision is key to tracking ✨</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field id="age" label="Age" placeholder="25" type="number" value={form.age} onChange={v => setForm(f => ({ ...f, age: v }))} suffix="yrs" />
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#8a8a8a] ml-2">Gender</label>
                <select 
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full rounded-[10px] px-5 py-4 text-base font-bold outline-none border-2 border-[#f0f0f0] bg-white text-[#0a0e27]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field id="weight" label="Weight" placeholder="80" type="number" value={form.weight} onChange={v => setForm(f => ({ ...f, weight: v }))} suffix="kg" />
              <Field id="height" label="Height" placeholder="180" type="number" value={form.height} onChange={v => setForm(f => ({ ...f, height: v }))} suffix="cm" />
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <label className="text-[10px] uppercase font-black tracking-widest text-[#8a8a8a] ml-2">Activity Level</label>
              <select 
                value={form.activity}
                onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}
                className="w-full rounded-[10px] px-5 py-4 text-base font-bold outline-none border-2 border-[#f0f0f0] bg-white text-[#0a0e27]"
              >
                <option value="1.2">Sedentary (Office job)</option>
                <option value="1.375">Lightly Active (1-2 days/wk)</option>
                <option value="1.55">Moderately Active (3-5 days/wk)</option>
                <option value="1.725">Very Active (6-7 days/wk)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 shadow-sm border border-[#f0f0f0] bg-white p-4 rounded-xl">
              <label className="text-[10px] uppercase font-black tracking-widest text-[#8a8a8a] ml-2">Current Goal</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['lose', 'maintain', 'gain'] as const).map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, goal: g }))} className={`py-3 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${form.goal === g ? 'bg-[#0a0e27] text-white' : 'bg-[#fafafa] text-[#8a8a8a]'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {calculatedMacros && (
              <div className="bg-[#d4ff00] rounded-2xl p-6 mt-4 flex flex-col gap-4 animate-in fade-in duration-513 scale-in">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} color="#0a0e27" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#0a0e27]">Calculated Payload</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#0a0e27] tracking-tighter">{calculatedMacros.calories}</span>
                  <span className="text-sm font-black text-[#0a0e27] opacity-60">kcal / day</span>
                </div>
                <div className="flex gap-4 border-t border-[#0a0e27]/10 pt-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#0a0e27] opacity-60 mb-1">PRO</p>
                    <p className="font-black text-[#0a0e27]">{calculatedMacros.protein}g</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#0a0e27] opacity-60 mb-1">CHO</p>
                    <p className="font-black text-[#0a0e27]">{calculatedMacros.carbs}g</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#0a0e27] opacity-60 mb-1">FAT</p>
                    <p className="font-black text-[#0a0e27]">{calculatedMacros.fat}g</p>
                  </div>
                </div>
                <button 
                  onClick={applyCalculated}
                  className="w-full bg-[#0a0e27] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest mt-2 active:scale-95 transition-all"
                >
                  Accept Strategy
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 'manual_verify' && (
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tighter text-[#0a0e27] leading-tight">Verification.</h1>
            <p className="text-[13px] font-medium text-[#8a8a8a] mb-6">fine-tune your exact targets ✨</p>
            <div className="flex flex-col gap-6">
              <Field id="calories-target" label="Energy Threshold" placeholder="2200" value={form.calories_target} onChange={v => setForm(f => ({ ...f, calories_target: v }))} type="number" suffix="kcal" />
              <div className="grid grid-cols-3 gap-3">
                <Field id="protein-target" label="PRO" placeholder="150" value={form.protein_target_g} onChange={v => setForm(f => ({ ...f, protein_target_g: v }))} type="number" suffix="g" />
                <Field id="carbs-target" label="CHO" placeholder="250" value={form.carbs_target_g} onChange={v => setForm(f => ({ ...f, carbs_target_g: v }))} type="number" suffix="g" />
                <Field id="fat-target" label="FAT" placeholder="70" value={form.fat_target_g} onChange={v => setForm(f => ({ ...f, fat_target_g: v }))} type="number" suffix="g" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl p-4 text-sm font-black text-red-500/80 mb-4 bg-red-500/10 border border-red-500/20 z-10">{error}</div>
      )}

      {/* Navigation */}
      <div className="flex gap-4 mt-6 mb-8 z-10">
        {step > 0 && (
          <button
            id="onboarding-back"
            onClick={handleBack}
            className="w-16 h-16 rounded-xl flex items-center justify-center bg-white border-2 border-[#f0f0f0] hover:bg-[#fafafa] transition-all cursor-pointer group"
          >
            <ChevronLeft size={24} className="text-[#0a0e27]" />
          </button>
        )}
        {(currentStep !== 'smart_calc' || setupMode === 'manual') && (
          <button
            id={isLast ? 'onboarding-finish' : 'onboarding-next'}
            onClick={isLast ? handleSubmit : handleNext}
            disabled={loading || (currentStep === 'intro' && !form.display_name.trim())}
            className="flex-1 h-16 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all enabled:bg-[#d4ff00] enabled:text-[#0a0e27] disabled:bg-[#f0f0f0] disabled:text-[#8a8a8a] cursor-pointer shadow-sm active:scale-95"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : (
              <>
                {isLast ? 'Ignite' : 'Next Step'}
                <ChevronRight size={18} />
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-center text-[10px] font-black uppercase tracking-widest text-[#8a8a8a] z-10">
        {isLast ? 'update anytime in settings ✨' : 'step ' + (step + 1) + ' of ' + STEPS.length}
      </p>
    </div>
  )
}
