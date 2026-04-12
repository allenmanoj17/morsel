'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, Save, Scale, ChevronRight, LogOut, User, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
      <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#8a8a8a', display: 'block', marginBottom: '6px', marginLeft: '2px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder="Not set"
          style={{ width: '100%', borderRadius: '10px', padding: '14px 20px', paddingRight: suffix ? '52px' : '20px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '2px solid #f0f0f0', background: 'white', color: '#0a0e27' }}
        />
        {suffix && <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{suffix}</span>}
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
      
      // Fallback from session metadata
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
    card: { background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '20px', marginBottom: '12px' } as React.CSSProperties,
    sectionLabel: { fontSize: '11px', fontWeight: 900 as const, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: '10px' } as React.CSSProperties,
  }

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', padding: '28px 20px 120px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em' }}>Profile</h1>
        <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>your fuel targets ✨</p>
      </div>

      {/* ── Display Name ── */}
      <p style={S.sectionLabel}>Identity</p>
      <div style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#8a8a8a', display: 'block', marginBottom: '6px', marginLeft: '2px' }}>Display Name</label>
          <div style={{ position: 'relative' }}>
            <User size={14} color="#8a8a8a" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              id="display-name" type="text" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onBlur={handleSaveName}
              placeholder="e.g. Alex"
              style={{ width: '100%', borderRadius: '10px', padding: '14px 20px 14px 38px', fontSize: '14px', fontWeight: 700, outline: 'none', border: '2px solid #f0f0f0', background: 'white', color: '#0a0e27' }}
            />
          </div>
        </div>
        <button onClick={handleSaveName} disabled={savingName}
          style={{ height: '47px', padding: '0 16px', borderRadius: '10px', background: savingName ? '#f0f0f0' : '#d4ff00', color: '#0a0e27', border: 'none', fontWeight: 900, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {savingName ? <Loader2 size={12} /> : <Save size={14} />}
        </button>
      </div>

      {/* ── Targets ── */}
      <p style={S.sectionLabel}>Daily Targets</p>
      {loading ? (
        <div style={{ ...S.card, height: 200, opacity: 0.5 }} />
      ) : (
        <div style={S.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <Field id="set-cal"   label="Daily Energy"   value={form.calories_target}   onChange={v => setForm(f => ({ ...f, calories_target: v }))}   suffix="kcal" />
            <Field id="set-prot"  label="Protein Target"  value={form.protein_target_g}  onChange={v => setForm(f => ({ ...f, protein_target_g: v }))}  suffix="g" />
            <Field id="set-carbs" label="Carb Goal"       value={form.carbs_target_g}    onChange={v => setForm(f => ({ ...f, carbs_target_g: v }))}    suffix="g" />
            <Field id="set-fat"   label="Fat Threshold"   value={form.fat_target_g}      onChange={v => setForm(f => ({ ...f, fat_target_g: v }))}      suffix="g" />
          </div>
          <button id="save-settings-btn" onClick={handleSave} disabled={saving}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: success ? '#d4ff00' : '#0a0e27', color: success ? '#0a0e27' : '#d4ff00',
              fontWeight: 900, fontSize: '13px', textTransform: 'uppercase' as const, letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.3s ease',
            }}>
            {saving ? <Loader2 size={14} /> : success ? '✓ Saved!' : <><Save size={16} /> Update Targets</>}
          </button>
        </div>
      )}

      {/* ── Preferences ── */}
      <p style={S.sectionLabel}>Preferences</p>
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#0a0e27' }}>Weight Units</p>
          <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '1px' }}>kg or lbs for tracking</p>
        </div>
        <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: '10px', padding: '4px' }}>
          {['kg', 'lbs'].map(u => {
            const active = unit === u
            return (
              <button
                key={u}
                onClick={() => { localStorage.setItem('morsel_unit', u); setUnit(u); router.refresh() }}
                style={{
                  padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 800, textTransform: 'uppercase',
                  background: active ? 'white' : 'transparent',
                  color: active ? '#0a0e27' : '#8a8a8a',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
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
      <p style={S.sectionLabel}>Biometrics</p>
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <button onClick={() => router.push('/weight')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={18} color="#0a0e27" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#0a0e27' }}>Body Composition</p>
              <p style={{ fontSize: '11px', color: '#8a8a8a', marginTop: '1px' }}>track weight trends</p>
            </div>
          </div>
          <ChevronRight size={18} color="#8a8a8a" />
        </button>
      </div>

      {/* ── Macro Targets Info ── */}
      {(form.calories_target || form.protein_target_g) && (
        <>
          <p style={S.sectionLabel}>Current Targets</p>
          <div style={{ ...S.card, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: 'Energy', val: form.calories_target, unit: 'kcal', color: '#00d9ff' },
              { label: 'Protein', val: form.protein_target_g, unit: 'g', color: '#d4ff00' },
              { label: 'Carbs', val: form.carbs_target_g, unit: 'g', color: '#0a0e27' },
              { label: 'Fat', val: form.fat_target_g, unit: 'g', color: '#0a0e27' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center', padding: '12px 8px', background: '#fafafa', borderRadius: '10px' }}>
                <p style={{ fontSize: '18px', fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{m.val || '—'}</p>
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '3px' }}>{m.label}</p>
                <p style={{ fontSize: '8px', color: '#8a8a8a' }}>{m.unit}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Sign Out ── */}
      <div style={{ marginTop: '24px' }}>
        <button id="sign-out-btn" onClick={handleSignOut}
          style={{
            width: '100%', padding: '16px', borderRadius: '12px',
            background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.15)',
            color: '#ff2d55', fontWeight: 900, fontSize: '13px',
            textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
