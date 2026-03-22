import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import { Card, Button, Badge, EmptyState, SkeletonTable } from '../../components/ui'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { formatDate, formatPaise } from '../../lib/utils'
import api from '../../lib/api'
import { Dumbbell, Plus, Calendar, Users, Clock } from 'lucide-react'

const fontBody = "'Inter', -apple-system, sans-serif"
const fontDisplay = "'Inter', -apple-system, sans-serif"
const fontMono = "'JetBrains Mono', monospace"

export default function Classes() {
  const { gym } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { theme } = useTheme()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', class_type: 'group', duration_minutes: 60, max_capacity: 20, price_paise: 0 })

  const { data, isLoading } = useQuery({
    queryKey: ['classes', gym?.id],
    queryFn: () => api.get(`/gyms/${gym.id}/classes`).then(r => r.data),
    enabled: !!gym?.id,
  })

  const createClass = useMutation({
    mutationFn: (body) => api.post(`/gyms/${gym.id}/classes`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      toast.success('Class created')
      setShowAdd(false)
      setForm({ name: '', class_type: 'group', duration_minutes: 60, max_capacity: 20, price_paise: 0 })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create class'),
  })

  const classes = data?.classes || data || []

  const typeBadge = (type) => {
    const map = {
      group: { bg: `${theme.accent}22`, color: theme.accent, label: 'Group' },
      pt: { bg: `${theme.amber}22`, color: theme.amber, label: 'PT' },
      workshop: { bg: `${theme.cyan}22`, color: theme.cyan, label: 'Workshop' },
    }
    const m = map[type] || map.group
    return (
      <span style={{
        display: 'inline-block', padding: '4px 12px', borderRadius: 20,
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
        background: m.bg, color: m.color, fontFamily: fontBody,
      }}>{m.label}</span>
    )
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${theme.border}`, background: theme.bgTer, color: theme.text,
    fontSize: 14, fontFamily: fontBody, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: theme.textSec, marginBottom: 6, fontFamily: fontBody }

  return (
    <div style={{ fontFamily: fontBody }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: theme.text, fontFamily: fontDisplay, margin: 0 }}>Classes</h1>
          <p style={{ color: theme.textSec, fontSize: 14, marginTop: 4 }}>Manage group classes and PT sessions</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: theme.brandAccent, color: '#fff', fontSize: 14, fontWeight: 600,
            fontFamily: fontBody, transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={16} /> Add Class
        </button>
      </div>

      {isLoading ? <SkeletonTable rows={4} cols={5} /> : classes.length === 0 ? (
        <div style={{
          background: theme.bgSec, borderRadius: 16, border: `1px solid ${theme.border}`,
          padding: 48, textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: theme.accentSoft,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Dumbbell size={28} color={theme.accent} />
          </div>
          <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 600, marginBottom: 6, fontFamily: fontDisplay }}>No classes yet</h3>
          <p style={{ color: theme.textSec, fontSize: 14, marginBottom: 20 }}>Create group classes or PT sessions for your members</p>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: theme.brandAccent, color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fontBody,
            }}
          >Add First Class</button>
        </div>
      ) : (
        <div style={{
          background: theme.bgSec, borderRadius: 16, border: `1px solid ${theme.border}`, overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {['Class Name', 'Type', 'Duration', 'Capacity', 'Price', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '14px 18px', fontSize: 11, fontWeight: 600, color: theme.textTer,
                      textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left',
                      fontFamily: fontBody, background: theme.bgTer,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classes.map((c, idx) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: idx < classes.length - 1 ? `1px solid ${theme.border}` : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 18px', fontWeight: 600, color: theme.text, fontSize: 14 }}>{c.name}</td>
                    <td style={{ padding: '16px 18px' }}>{typeBadge(c.class_type)}</td>
                    <td style={{ padding: '16px 18px', color: theme.textSec, fontFamily: fontMono, fontSize: 13 }}>
                      {c.duration_minutes} <span style={{ color: theme.textTer }}>min</span>
                    </td>
                    <td style={{ padding: '16px 18px', fontFamily: fontMono, fontSize: 13 }}>
                      <span style={{ color: theme.text }}>{c.current_bookings || 0}</span>
                      <span style={{ color: theme.textTer }}>/</span>
                      <span style={{ color: theme.textSec }}>{c.max_capacity}</span>
                    </td>
                    <td style={{ padding: '16px 18px', fontFamily: fontMono, fontSize: 13 }}>
                      {c.price_paise > 0 ? (
                        <span style={{ color: theme.text }}>{formatPaise(c.price_paise)}</span>
                      ) : (
                        <span style={{ color: theme.green, fontWeight: 500 }}>Included</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: c.is_active ? `${theme.green}18` : `${theme.textTer}30`,
                        color: c.is_active ? theme.green : theme.textTer,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: c.is_active ? theme.green : theme.textTer,
                        }} />
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        }} onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 440, margin: 16,
            background: theme.bgSec, borderRadius: 20,
            border: `1px solid ${theme.border}`, padding: 28,
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text, fontFamily: fontDisplay, marginBottom: 24 }}>Add Class</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Class Name</label>
              <input
                style={inputStyle}
                placeholder="e.g. Morning Yoga"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Type</label>
              <select
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                value={form.class_type}
                onChange={e => setForm({ ...form, class_type: e.target.value })}
              >
                <option value="group">Group Class</option>
                <option value="pt">Personal Training</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Duration (min)</label>
                <input
                  style={{ ...inputStyle, fontFamily: fontMono }}
                  type="number"
                  value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label style={labelStyle}>Max Capacity</label>
                <input
                  style={{ ...inputStyle, fontFamily: fontMono }}
                  type="number"
                  value={form.max_capacity}
                  onChange={e => setForm({ ...form, max_capacity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Price (Rs, 0 = included in membership)</label>
              <input
                style={{ ...inputStyle, fontFamily: fontMono }}
                type="number"
                value={form.price_paise / 100}
                onChange={e => setForm({ ...form, price_paise: Math.round(parseFloat(e.target.value || 0) * 100) })}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                  background: theme.bgTer, border: `1px solid ${theme.border}`,
                  color: theme.textSec, fontSize: 14, fontWeight: 500, fontFamily: fontBody,
                }}
              >Cancel</button>
              <button
                disabled={createClass.isPending}
                onClick={() => createClass.mutate(form)}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: theme.brandAccent, color: '#fff', fontSize: 14, fontWeight: 600,
                  fontFamily: fontBody, opacity: createClass.isPending ? 0.6 : 1,
                }}
              >{createClass.isPending ? 'Creating...' : 'Create Class'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
