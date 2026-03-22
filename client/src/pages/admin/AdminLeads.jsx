import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { formatDate, formatPaise } from '../../lib/utils'
import { useTheme } from '../../context/ThemeContext'
import { Target, Phone, MessageCircle, ChevronDown, ArrowUpDown, RefreshCw, UserPlus, TrendingUp, IndianRupee, StickyNote, X } from 'lucide-react'

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost']

const STATUS_STYLES = {
  new: { border: '#7C3AED', bg: '#7C3AED18', color: '#A78BFA' },
  contacted: { border: '#F59E0B', bg: '#F59E0B18', color: '#FBBF24' },
  qualified: { border: '#06B6D4', bg: '#06B6D418', color: '#22D3EE' },
  converted: { border: '#10B981', bg: '#10B98118', color: '#34D399' },
  lost: { border: '#EF4444', bg: '#EF444418', color: '#F87171' },
}

const PACKAGE_PRICES = {
  starter: 1200000,
  growth: 2400000,
  pro: 4800000,
  enterprise: 9600000,
}

const PRIORITY_PACKAGES = ['pro', 'enterprise']

export default function AdminLeads() {
  const { theme } = useTheme()
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState('created_at:desc')
  const [editingNotes, setEditingNotes] = useState(null)
  const [notesValue, setNotesValue] = useState('')
  const [converting, setConverting] = useState(null)

  const font = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  const adminToken = localStorage.getItem('ivira_admin_token')
  const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } }

  useEffect(() => {
    fetchAll()
  }, [statusFilter, sort])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const params = { limit: 100, sort }
      if (statusFilter) params.status = statusFilter

      const [leadsRes, statsRes] = await Promise.all([
        api.get('/leads', { ...authHeaders, params }),
        api.get('/leads/stats', authHeaders),
      ])
      setLeads(leadsRes.data.leads || [])
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to load leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (id, newStatus) => {
    try {
      await api.patch(`/leads/${id}`, { status: newStatus }, authHeaders)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
      // Refresh stats
      const statsRes = await api.get('/leads/stats', authHeaders)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const saveNotes = async (id) => {
    try {
      await api.patch(`/leads/${id}`, { notes: notesValue }, authHeaders)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, notes: notesValue } : l))
      setEditingNotes(null)
    } catch (err) {
      console.error('Failed to save notes:', err)
    }
  }

  const convertLead = async (id) => {
    if (!confirm('Convert this lead to a gym? This will create a new gym record.')) return
    setConverting(id)
    try {
      const res = await api.put(`/leads/${id}/convert`, {}, authHeaders)
      alert(`Gym created: ${res.data.gym.gym_name}`)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert lead')
    } finally {
      setConverting(null)
    }
  }

  const whatsappUrl = (lead) => {
    const phone = (lead.phone || '').replace(/\D/g, '').replace(/^(\+?91)/, '')
    const pkg = lead.package_interest || 'IVIRA'
    const text = `Hi ${lead.name}, I'm from IVIRA. I saw you were interested in the ${pkg} plan for ${lead.gym_name}. Would love to help you get started!`
    return `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`
  }

  const isPriority = (lead) => PRIORITY_PACKAGES.includes((lead.package_interest || '').toLowerCase())

  const cardStyle = {
    background: '#121212',
    borderRadius: 12,
    border: '1px solid #1F1F1F',
    padding: 24,
  }

  const statCardStyle = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  }

  if (loading && !leads.length) {
    return (
      <div style={{ fontFamily: font }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 24 }}>
          Lead Pipeline
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ ...cardStyle, height: 100 }} />
          ))}
        </div>
        <div style={{ ...cardStyle, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={24} color={theme.textSec} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Target size={24} color="#7C3AED" />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, margin: 0 }}>
            Lead Pipeline
          </h1>
        </div>
        <button
          onClick={fetchAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'transparent', border: `1px solid ${theme.border}`,
            color: theme.textSec, cursor: 'pointer', fontFamily: font,
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="#7C3AED" />
            <span style={{ fontSize: 13, fontWeight: 500, color: theme.textSec }}>Total Leads (MTD)</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, fontFamily: fontMono }}>
            {stats?.total_leads ?? 0}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#10B981" />
            <span style={{ fontSize: 13, fontWeight: 500, color: theme.textSec }}>Conversion Rate</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#10B981', fontFamily: fontMono }}>
            {stats?.conversion_rate ?? 0}%
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IndianRupee size={18} color="#F59E0B" />
            <span style={{ fontSize: 13, fontWeight: 500, color: theme.textSec }}>Projected Revenue</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B', fontFamily: fontMono }}>
            {formatPaise(stats?.projected_revenue ?? 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              appearance: 'none', padding: '8px 32px 8px 12px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, fontFamily: font,
              background: '#121212', border: '1px solid #1F1F1F',
              color: theme.text, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <ChevronDown size={14} color={theme.textSec} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              appearance: 'none', padding: '8px 32px 8px 12px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, fontFamily: font,
              background: '#121212', border: '1px solid #1F1F1F',
              color: theme.text, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="created_at:desc">Newest First</option>
            <option value="created_at:asc">Oldest First</option>
            <option value="name:asc">Name A-Z</option>
            <option value="name:desc">Name Z-A</option>
            <option value="package_interest:asc">Package A-Z</option>
          </select>
          <ChevronDown size={14} color={theme.textSec} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        <span style={{ fontSize: 13, color: theme.textSec, marginLeft: 'auto' }}>
          {leads.length} lead{leads.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Pipeline Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1F1F1F' }}>
                {['Name', 'Gym', 'Phone', 'Package', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '14px 16px', fontSize: 12,
                    fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                    letterSpacing: '0.5px', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const priority = isPriority(lead)
                const st = STATUS_STYLES[lead.status] || STATUS_STYLES.new
                return (
                  <tr
                    key={lead.id}
                    style={{
                      borderBottom: '1px solid #1F1F1F',
                      borderLeft: priority ? '3px solid #7C3AED' : '3px solid transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A1A'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Name */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{lead.name}</div>
                      {lead.owner_name && lead.owner_name !== lead.name && (
                        <div style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>Owner: {lead.owner_name}</div>
                      )}
                      {lead.email && (
                        <div style={{ fontSize: 12, color: theme.textTer, marginTop: 2 }}>{lead.email}</div>
                      )}
                    </td>

                    {/* Gym */}
                    <td style={{ padding: '14px 16px', fontSize: 14, color: theme.textSec }}>
                      {lead.gym_name}
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                          {lead.phone}
                        </span>
                        <a
                          href={whatsappUrl(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in WhatsApp"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: 6,
                            background: '#25D36618', color: '#25D366',
                            border: 'none', cursor: 'pointer', textDecoration: 'none',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#25D36630'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#25D36618'}
                        >
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </td>

                    {/* Package */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600, color: priority ? '#A78BFA' : theme.text,
                        fontFamily: fontMono, textTransform: 'capitalize',
                      }}>
                        {lead.package_interest || '--'}
                      </span>
                      {lead.package_interest && (
                        <div style={{ fontSize: 11, color: theme.textTer, fontFamily: fontMono, marginTop: 2 }}>
                          {formatPaise(PACKAGE_PRICES[(lead.package_interest || '').toLowerCase()] || 0)}/yr
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: font,
                            background: st.bg,
                            border: `1px solid ${st.border}`,
                            color: st.color,
                            cursor: 'pointer',
                            outline: 'none',
                            textTransform: 'capitalize',
                          }}
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s} style={{ background: '#121212', color: '#fff' }}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={10} color={st.color} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      </div>
                    </td>

                    {/* Created */}
                    <td style={{ padding: '14px 16px', fontSize: 13, color: theme.textSec, whiteSpace: 'nowrap' }}>
                      {formatDate(lead.created_at)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Notes */}
                        <button
                          onClick={() => {
                            if (editingNotes === lead.id) {
                              setEditingNotes(null)
                            } else {
                              setEditingNotes(lead.id)
                              setNotesValue(lead.notes || '')
                            }
                          }}
                          title={lead.notes ? 'Edit notes' : 'Add notes'}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 6,
                            background: lead.notes ? '#7C3AED18' : 'transparent',
                            border: `1px solid ${lead.notes ? '#7C3AED40' : '#1F1F1F'}`,
                            color: lead.notes ? '#A78BFA' : theme.textSec,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <StickyNote size={14} />
                        </button>

                        {/* Convert */}
                        {lead.status !== 'converted' && (
                          <button
                            onClick={() => convertLead(lead.id)}
                            disabled={converting === lead.id}
                            title="Convert to Gym"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 12px', borderRadius: 6,
                              fontSize: 12, fontWeight: 600, fontFamily: font,
                              background: '#7C3AED', border: 'none',
                              color: '#fff', cursor: 'pointer',
                              opacity: converting === lead.id ? 0.6 : 1,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { if (converting !== lead.id) e.currentTarget.style.background = '#6D28D9' }}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#7C3AED'}
                          >
                            <UserPlus size={12} />
                            {converting === lead.id ? 'Converting...' : 'Convert'}
                          </button>
                        )}

                        {lead.status === 'converted' && (
                          <span style={{
                            fontSize: 12, fontWeight: 600, color: '#34D399',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            Converted
                          </span>
                        )}
                      </div>

                      {/* Notes popover */}
                      {editingNotes === lead.id && (
                        <div style={{
                          position: 'absolute', right: 24, marginTop: 8, zIndex: 50,
                          background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10,
                          padding: 16, width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Notes</span>
                            <button
                              onClick={() => setEditingNotes(null)}
                              style={{ background: 'none', border: 'none', color: theme.textSec, cursor: 'pointer', padding: 2 }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <textarea
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            placeholder="Add notes about this lead..."
                            rows={4}
                            style={{
                              width: '100%', background: '#121212', border: '1px solid #2A2A2A',
                              borderRadius: 8, padding: 10, fontSize: 13, color: theme.text,
                              fontFamily: font, resize: 'vertical', outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#7C3AED'}
                            onBlur={(e) => e.target.style.borderColor = '#2A2A2A'}
                          />
                          <button
                            onClick={() => saveNotes(lead.id)}
                            style={{
                              marginTop: 8, padding: '6px 16px', borderRadius: 6,
                              fontSize: 12, fontWeight: 600, fontFamily: font,
                              background: '#7C3AED', border: 'none', color: '#fff',
                              cursor: 'pointer', transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#6D28D9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#7C3AED'}
                          >
                            Save Notes
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} style={{
                    padding: 48, textAlign: 'center', color: theme.textSec, fontSize: 14,
                  }}>
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
