'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { getLocalDateString } from '@/lib/utils'
import { Plus, Trash2, Edit3, Loader2, Play, X, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  template_name: string
  description?: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
}

function TemplateModal({ tpl, token, onClose, onSaved }: {
  tpl: Template | null; token: string; onClose: () => void; onSaved: () => void
}) {
  const [vals, setVals] = useState({
    template_name: tpl?.template_name || '',
    description: tpl?.description || '',
    total_calories: tpl?.total_calories || 0,
    total_protein_g: tpl?.total_protein_g || 0,
    total_carbs_g: tpl?.total_carbs_g || 0,
    total_fat_g: tpl?.total_fat_g || 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!vals.template_name.trim()) return setError('Name is required')
    setSaving(true)
    setError('')
    try {
      if (tpl) {
        await api.updateTemplate(tpl.id, vals, token)
      } else {
        await api.createTemplate({ ...vals, ingredient_snapshot: {} }, token)
      }
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, id, value, onChange, type = 'text', suffix = '' }: {
    label: string; id: string; value: string | number; onChange: (v: string) => void; type?: string; suffix?: string
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a8a8a', marginLeft: '4px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', borderRadius: '16px', padding: '16px 20px', fontSize: '15px', fontWeight: 700,
            outline: 'none', border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white',
            transition: 'all 0.2s ease', paddingRight: suffix ? '56px' : '20px'
          }}
        />
        {suffix && <span style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,39,0.7)', backdropFilter: 'blur(12px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '540px', background: '#030409', borderRadius: '32px 32px 0 0', padding: '32px 24px 48px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: '40px', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', margin: '0 auto 24px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '-0.04em' }}>{tpl ? 'Edit Template' : 'Create Template'}</h2>
            <p style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Save your favorite meals</p>
          </div>
          <button onClick={onClose} style={{ width: '44px', height: '44px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color="#8a8a8a" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <Field id="tpl-name" label="Meal Name" value={vals.template_name} onChange={v => setVals(x => ({ ...x, template_name: v }))} />
          <Field id="tpl-desc" label="Description" value={vals.description} onChange={v => setVals(x => ({ ...x, description: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field id="tpl-cal" label="Energy" value={vals.total_calories || ''} onChange={v => setVals(x => ({ ...x, total_calories: parseFloat(v) || 0 }))} type="number" suffix="kcal" />
            <Field id="tpl-prot" label="Protein" value={vals.total_protein_g || ''} onChange={v => setVals(x => ({ ...x, total_protein_g: parseFloat(v) || 0 }))} type="number" suffix="g" />
            <Field id="tpl-carbs" label="Carbs" value={vals.total_carbs_g || ''} onChange={v => setVals(x => ({ ...x, total_carbs_g: parseFloat(v) || 0 }))} type="number" suffix="g" />
            <Field id="tpl-fat" label="Fat" value={vals.total_fat_g || ''} onChange={v => setVals(x => ({ ...x, total_fat_g: parseFloat(v) || 0 }))} type="number" suffix="g" />
          </div>
        </div>

        {error && <p style={{ fontSize: '13px', fontWeight: 800, color: '#ff2d55', marginBottom: '24px', padding: '16px', background: 'rgba(255,45,85,0.05)', borderRadius: '16px', border: '1px solid rgba(255,45,85,0.1)' }}>{error}</p>}

        <button onClick={handleSave} disabled={saving}
          style={{
            width: '100%', padding: '20px', borderRadius: '18px', background: '#d4ff00', color: '#030409',
            border: 'none', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.12em',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: '0 12px 32px rgba(212,255,0,0.3)', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)'
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={20} /> Save Template</>}
        </button>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [showModal, setShowModal] = useState<boolean | Template>(false)
  const router = useRouter()

  const load = useCallback(async (tok: string) => {
    // ── Instant Load from Cache ──
    const cached = localStorage.getItem('morsel_templates_cache')
    if (cached) {
      try {
        setTemplates(JSON.parse(cached))
      } catch (e: any) {
        console.error('Failed to parse templates cache:', e)
      }
    }

    try {
      const data = await api.getTemplates(tok)
      setTemplates(data)
      // Persist for next fast load
      localStorage.setItem('morsel_templates_cache', JSON.stringify(data))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        load(session.access_token)
      }
    })
  }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await api.deleteTemplate(id, token)
    load(token)
  }

  const handleLog = async (id: string) => {
    try {
      await api.logTemplate(id, token, getLocalDateString())
      router.push('/log')
    } catch (e) {
      alert('Failed to log meal')
    }
  }

  const S = {
    container: { width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 140px', minHeight: '100dvh', background: '#030409', color: 'white', boxSizing: 'border-box' } as React.CSSProperties,
    card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: '0.2em', marginBottom: '12px' } as React.CSSProperties
  }

  return (
    <div style={S.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em' }}>Templates</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>{templates.length} saved meal profiles ✨</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ ...S.card, height: '180px', opacity: 0.3 }} />)}
        </div>
      ) : templates.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '80px 24px' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
          <p style={{ fontSize: '16px', fontWeight: 800 }}>No templates yet</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '6px' }}>Create templates to log your meals faster.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {templates.map(tpl => (
            <div key={tpl.id} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tpl.template_name}
                  </h3>
                  {tpl.description && (
                    <p style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 600, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tpl.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => setShowModal(tpl)}
                    style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit3 size={16} color="#8a8a8a" />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)}
                    style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid rgba(255,45,85,0.1)', background: 'rgba(255,45,85,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={16} color="#ff2d55" />
                  </button>
                </div>
              </div>

              {/* Macros Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
                {[
                  { label: 'Energy', value: tpl.total_calories, color: '#00d9ff', unit: 'k' },
                  { label: 'Protein', value: tpl.total_protein_g, color: '#d4ff00', unit: 'g' },
                  { label: 'Carbs', value: tpl.total_carbs_g, color: 'white', unit: 'g' },
                  { label: 'Fat', value: tpl.total_fat_g, color: 'white', unit: 'g' },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 4px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: m.color, letterSpacing: '-0.04em' }}>{Math.round(m.value)}<small style={{ fontSize: '10px', opacity: 0.6, marginLeft: '1px' }}>{m.unit}</small></span>
                    <span style={{ fontSize: '8px', fontWeight: 900, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '4px' }}>{m.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={() => handleLog(tpl.id)}
                  style={{
                    padding: '16px', borderRadius: '14px', border: 'none',
                    background: '#d4ff00', color: '#030409', fontWeight: 900, fontSize: '12px',
                    textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    transition: 'all 0.1s ease', boxShadow: '0 8px 16px rgba(212,255,0,0.1)'
                  }}
                >
                  <Play size={16} fill="currentColor" strokeWidth={0} />
                  Log meal
                </button>
                <button onClick={() => setShowModal(tpl)}
                  style={{
                    padding: '16px', borderRadius: '14px', border: '1px solid #d4ff00', 
                    background: 'transparent', color: '#d4ff00', fontWeight: 900, fontSize: '12px',
                    textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <Edit3 size={16} />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setShowModal(true)}
        style={{
          position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)',
          width: '64px', height: '64px', borderRadius: '20px',
          background: '#d4ff00', color: '#030409', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(212,255,0,0.4)', zIndex: 50,
        }}
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {showModal && (
        <TemplateModal
          tpl={typeof showModal === 'boolean' ? null : showModal}
          token={token}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(token) }}
        />
      )}
    </div>
  )
}
