'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8a8a8a', marginLeft: '4px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', borderRadius: '12px', padding: '14px 18px', fontSize: '14px', fontWeight: 700,
            outline: 'none', border: '2px solid #f0f0f0', background: 'white', color: '#0a0e27',
            transition: 'all 0.2s ease', paddingRight: suffix ? '52px' : '18px'
          }}
        />
        {suffix && <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,39,0.5)', backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '540px', background: 'white', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ width: '40px', height: '4px', background: '#f0f0f0', borderRadius: '99px', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.02em' }}>{tpl ? 'Edit Preset' : 'New Preset'}</h2>
            <p style={{ fontSize: '12px', color: '#8a8a8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Save your favorite fuels</p>
          </div>
          <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #f0f0f0', background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#0a0e27" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          <Field id="tpl-name" label="Preset Name" value={vals.template_name} onChange={v => setVals(x => ({ ...x, template_name: v }))} />
          <Field id="tpl-desc" label="Description" value={vals.description} onChange={v => setVals(x => ({ ...x, description: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field id="tpl-cal" label="Calories" value={vals.total_calories || ''} onChange={v => setVals(x => ({ ...x, total_calories: parseFloat(v) || 0 }))} type="number" suffix="kcal" />
            <Field id="tpl-prot" label="Protein" value={vals.total_protein_g || ''} onChange={v => setVals(x => ({ ...x, total_protein_g: parseFloat(v) || 0 }))} type="number" suffix="g" />
            <Field id="tpl-carbs" label="Carbs" value={vals.total_carbs_g || ''} onChange={v => setVals(x => ({ ...x, total_carbs_g: parseFloat(v) || 0 }))} type="number" suffix="g" />
            <Field id="tpl-fat" label="Fat" value={vals.total_fat_g || ''} onChange={v => setVals(x => ({ ...x, total_fat_g: parseFloat(v) || 0 }))} type="number" suffix="g" />
          </div>
        </div>

        {error && <p style={{ fontSize: '13px', fontWeight: 700, color: '#ff2d55', marginBottom: '20px', padding: '14px', background: 'rgba(255,45,85,0.05)', borderRadius: '12px', border: '1px solid rgba(255,45,85,0.1)' }}>{error}</p>}

        <button onClick={handleSave} disabled={saving}
          style={{
            width: '100%', padding: '18px', borderRadius: '14px', background: '#d4ff00', color: '#0a0e27',
            border: 'none', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: '0 8px 20px rgba(212,255,0,0.3)', transition: 'all 0.2s ease'
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={18} /> Save Preset</>}
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
    try {
      const data = await api.getTemplates(tok)
      setTemplates(data)
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
      await api.logTemplate(id, token)
      router.push('/log')
    } catch (e) {
      alert('Failed to log meal')
    }
  }

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', padding: '28px 20px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.03em' }}>Presets</h1>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>{templates.length} saved fuel profiles ✨</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0', height: '100px', borderRadius: '16px', opacity: 0.5 }} />)}
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', border: '1px solid #f0f0f0', borderRadius: '20px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📋</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#0a0e27' }}>No templates yet</p>
          <p style={{ fontSize: '13px', color: '#8a8a8a', marginTop: '4px' }}>Create one to skip the typing later.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {templates.map(tpl => (
            <div key={tpl.id} className="task-enter" style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0a0e27', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tpl.template_name}
                  </h3>
                  {tpl.description && (
                    <p style={{ fontSize: '11px', color: '#8a8a8a', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tpl.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => setShowModal(tpl)}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #f0f0f0', background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit3 size={14} color="#0a0e27" />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,45,85,0.15)', background: 'rgba(255,45,85,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} color="#ff2d55" />
                  </button>
                </div>
              </div>

              {/* Macros Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px' }}>
                {[
                  { label: 'CAL', value: tpl.total_calories, color: '#00d9ff' },
                  { label: 'PRO', value: tpl.total_protein_g, color: '#d4ff00' },
                  { label: 'CHO', value: tpl.total_carbs_g, color: '#0a0e27' },
                  { label: 'FAT', value: tpl.total_fat_g, color: '#0a0e27' },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', borderRadius: '10px', background: '#fafafa', border: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{Math.round(m.value)}</span>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Quick Log Action */}
              <button
                onClick={() => handleLog(tpl.id)}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: '#d4ff00', color: '#0a0e27', fontWeight: 900, fontSize: '12px',
                  textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'transform 0.1s active', boxShadow: '0 4px 12px rgba(212,255,0,0.2)'
                }}
              >
                <Play size={14} fill="currentColor" strokeWidth={0} />
                Quick Log Preset
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FAB - Lime */}
      <button onClick={() => setShowModal(true)}
        style={{
          position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)',
          width: '56px', height: '56px', borderRadius: '16px',
          background: '#d4ff00', color: '#0a0e27', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(212,255,0,0.5)', zIndex: 50,
        }}
      >
        <Plus size={24} strokeWidth={3} />
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
