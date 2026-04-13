'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, Save, Scale, ChevronRight, LogOut, User, Target as TargetIcon, Zap } from 'lucide-react'

interface Target {
  id: string; target_type: string; calories_target: number | null
  protein_target_g: number | null; carbs_target_g: number | null; fat_target_g: number | null
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
    calories_target: '', protein_target_g: '', carbs_target_g: '', fat_target_g: ''
  })
  const [unit, setUnit] = useState('kg')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      
      const metaName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name
      const emailPrefix = session.user.email?.split('@')[0]
      setDisplayName(metaName || emailPrefix || '')

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
        })
        const storedU = localStorage.getItem('morsel_unit')
        if (storedU) setUnit(storedU)
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
        effective_from: new Date().toISOString().split('T')[0],
      }
      if (def) await api.updateTarget(def.id, body, token)
      else await api.createTarget(body, token)
      setSuccess(true); setTimeout(() => setSuccess(false), 2500)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleSaveName = async () => {
    setSavingName(true)
    try { await api.updateOnboarding({ display_name: displayName }, token) }
    catch {} finally { setSavingName(false) }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const S = {
    container: { maxWidth: '540px', margin: '0 auto', padding: '40px 20px 120px', minHeight: '100dvh', background: '#0a0e27', color: 'white' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em' }}>Profile</h1>
        <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Configure your tracking parameters ✨</p>
      </div>

      {/* ── Identity ── */}
      <p style={S.label}>Identity</p>
      <div style={{ ...S.card, display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a8a8a', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>Display Name</label>
          <div style={{ position: 'relative' }}>
            <User size={16} color="#8a8a8a" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              id="display-name" type="text" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onBlur={handleSaveName}
              placeholder="e.g. Alex"
              style={{ width: '100%', borderRadius: '16px', padding: '16px 20px 16px 44px', fontSize: '15px', fontWeight: 700, outline: 'none', border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
            />
          </div>
        </div>
        <button onClick={handleSaveName} disabled={savingName}
          style={{ height: '54px', padding: '0 20px', borderRadius: '16px', background: savingName ? 'rgba(255,255,255,0.05)' : '#d4ff00', color: '#0a0e27', border: 'none', fontWeight: 900, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}>
          {savingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
        </button>
      </div>

      {/* ── Targets ── */}
      <p style={S.label}>Daily Thresholds</p>
      {loading ? (
        <div style={{ ...S.card, height: 240, opacity: 0.3 }} />
      ) : (
        <div style={S.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <Field id="set-cal"   label="Calories"   value={form.calories_target}   onChange={v => setForm(f => ({ ...f, calories_target: v }))}   suffix="kcal" />
            <Field id="set-prot"  label="Protein"  value={form.protein_target_g}  onChange={v => setForm(f => ({ ...f, protein_target_g: v }))}  suffix="g" />
            <Field id="set-carbs" label="Carbs"       value={form.carbs_target_g}    onChange={v => setForm(f => ({ ...f, carbs_target_g: v }))}    suffix="g" />
            <Field id="set-fat"   label="Fat"   value={form.fat_target_g}      onChange={v => setForm(f => ({ ...f, fat_target_g: v }))}      suffix="g" />
          </div>
          <button id="save-settings-btn" onClick={handleSave} disabled={saving}
            style={{
              width: '100%', padding: '18px', borderRadius: '16px', border: 'none', cursor: 'pointer',
              background: success ? '#d4ff00' : 'rgba(255,255,255,0.1)', color: success ? '#0a0e27' : 'white',
              fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : success ? '✓ Synchronized' : <><Save size={18} /> Update Strategy</>}
          </button>
        </div>
      )}

      {/* ── Preferences ── */}
      <p style={S.label}>System Preferences</p>
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 800 }}>Weight Units</p>
          <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>Local measurement standard</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
          {['kg', 'lbs'].map(u => {
            const active = unit === u
            return (
              <button
                key={u}
                onClick={() => { localStorage.setItem('morsel_unit', u); setUnit(u); router.refresh() }}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 900, textTransform: 'uppercase',
                  background: active ? '#d4ff00' : 'transparent',
                  color: active ? '#0a0e27' : '#8a8a8a',
                  transition: 'all 0.2s ease'
                }}
              >
                {u}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Biometrics ── */}
      <p style={S.label}>Biometrics</p>
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <button onClick={() => router.push('/weight')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={20} color="#d4ff00" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '15px', fontWeight: 800 }}>Weight Tracking</p>
              <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '2px' }}>Log morphological shifts</p>
            </div>
          </div>
          <ChevronRight size={20} color="#8a8a8a" />
        </button>
      </div>

      {/* ── Sign Out ── */}
      <div style={{ marginTop: '32px' }}>
        <button id="sign-out-btn" onClick={handleSignOut}
          style={{
            width: '100%', padding: '18px', borderRadius: '16px',
            background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.1)',
            color: '#ff2d55', fontWeight: 900, fontSize: '13px',
            textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            transition: 'all 0.2s ease'
          }}>
          <LogOut size={18} /> Decommission Session
        </button>
      </div>
    </div>
  )
}
