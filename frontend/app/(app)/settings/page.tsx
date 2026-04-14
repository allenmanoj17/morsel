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
  const [savingName, setSavingName] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    calories_target: '', protein_target_g: '', carbs_target_g: '', fat_target_g: '', water_target_ml: '2500'
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      
      const metaName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name
      setDisplayName(metaName || session.user.email?.split('@')[0] || '')

      try {
        const [data, onb] = await Promise.all([
          api.getTargets(session.access_token),
          api.getOnboarding(session.access_token).catch(() => null),
        ])
        setTargets(data)
        if (onb?.display_name) setDisplayName(onb.display_name)
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
       await api.updateOnboarding({ display_name: displayName }, token) 
       await supabase.auth.updateUser({ data: { display_name: displayName } })
       setSuccess(true); setTimeout(() => setSuccess(false), 2500)
    }
    catch {} finally { setSavingName(false) }
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
      padding: '24px 20px 140px', 
      minHeight: '100dvh', 
      background: '#030409', 
      color: 'white',
      boxSizing: 'border-box'
    } as React.CSSProperties,
    card: { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--card-radius)', padding: '24px', marginBottom: '16px', backdropFilter: 'blur(16px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', color: '#d4ff00' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Customise your physiological targets ✨</p>
      </div>

      {/* ── Name ── */}
      <p style={S.label}>Display Name</p>
      <div style={{ ...S.card, display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <User size={16} color="#8a8a8a" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            id="display-name" type="text" value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onBlur={handleSaveName}
            style={{ width: '100%', borderRadius: '16px', padding: '14px 16px 14px 44px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
          />
        </div>
        <button onClick={handleSaveName} disabled={savingName}
          style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(212,255,0,0.3)' }}>
          {savingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={20} />}
        </button>
      </div>

      {/* ── Nutrition Goals ── */}
      <p style={S.label}>Nutrition targets (Daily)</p>
      {loading ? (
        <div style={{ ...S.card, height: 200, opacity: 0.3 }} />
      ) : (
        <div style={S.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
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

      {/* ── Body ── */}
      <p style={S.label}>Measurements</p>
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <button onClick={() => router.push('/weight')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Scale size={20} color="#d4ff00" />
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '15px', fontWeight: 800 }}>Body Weight</p>
              <p style={{ fontSize: '11px', color: '#8a8a8a' }}>Track your daily progress</p>
            </div>
          </div>
          <ChevronRight size={20} color="#3a3a3a" />
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
