import { useState, useEffect } from 'react'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import { StatCard } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { SkeletonTable, EmptyState } from '../../components/ui'
import Input, { Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { formatPaise } from '../../lib/utils'
import { Megaphone, Plus, Pause, Play, DollarSign } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const EMPTY_SPONSOR = {
  brand_name: '',
  brand_logo_url: '',
  ad_html: '',
  cta_url: '',
  cpm_paise: '',
  budget_paise: '',
  start_date: '',
  end_date: '',
}

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_SPONSOR)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { theme, isDark } = useTheme()

  const font = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  const adminToken = localStorage.getItem('ivira_admin_token')
  const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } }

  useEffect(() => {
    fetchSponsors()
  }, [])

  const fetchSponsors = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/sponsors', authHeaders)
      setSponsors(data.sponsors || data || [])
    } catch (err) {
      console.error('Failed to fetch sponsors:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_SPONSOR)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (sponsor) => {
    setEditingId(sponsor.id)
    setForm({
      brand_name: sponsor.brand_name || '',
      brand_logo_url: sponsor.brand_logo_url || '',
      ad_html: sponsor.ad_html || '',
      cta_url: sponsor.cta_url || '',
      cpm_paise: sponsor.cpm_paise ? String(sponsor.cpm_paise / 100) : '',
      budget_paise: sponsor.budget_paise ? String(sponsor.budget_paise / 100) : '',
      start_date: sponsor.start_date ? sponsor.start_date.slice(0, 10) : '',
      end_date: sponsor.end_date ? sponsor.end_date.slice(0, 10) : '',
    })
    setError('')
    setModalOpen(true)
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.brand_name.trim()) return setError('Brand name is required')
    if (!form.cpm_paise || isNaN(form.cpm_paise)) return setError('Enter a valid CPM amount')
    if (!form.budget_paise || isNaN(form.budget_paise)) return setError('Enter a valid budget')

    setError('')
    setSaving(true)

    const payload = {
      brand_name: form.brand_name.trim(),
      brand_logo_url: form.brand_logo_url.trim(),
      ad_html: form.ad_html,
      cta_url: form.cta_url.trim(),
      cpm_paise: Math.round(Number(form.cpm_paise) * 100),
      budget_paise: Math.round(Number(form.budget_paise) * 100),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }

    try {
      if (editingId) {
        await api.put(`/admin/sponsors/${editingId}`, payload, authHeaders)
      } else {
        await api.post('/admin/sponsors', payload, authHeaders)
      }
      setModalOpen(false)
      fetchSponsors()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save sponsor')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (sponsor) => {
    const newStatus = sponsor.status === 'active' ? 'paused' : 'active'
    try {
      await api.put(`/admin/sponsors/${sponsor.id}`, { status: newStatus }, authHeaders)
      fetchSponsors()
    } catch (err) {
      console.error('Failed to toggle sponsor status:', err)
    }
  }

  const totalEarned = sponsors.reduce((sum, s) => sum + (s.spent_paise ?? 0), 0)

  const darkCard = {
    background: theme.bgSec,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 24,
  }

  const actionBtnBase = {
    padding: '4px 10px', borderRadius: 6, border: `1px solid ${theme.border}`,
    background: theme.bgTer, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4, fontFamily: font,
    transition: 'background 0.15s',
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 24, fontFamily: font }}>Sponsored Newsletters</h1>
        <div style={{
          background: theme.bgSec, borderRadius: 12, border: `1px solid ${theme.border}`,
          padding: 24, height: 120, marginBottom: 24,
        }} />
        <SkeletonTable rows={6} cols={7} />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Sponsored Newsletters</h1>
          <p style={{ fontSize: 14, color: theme.textSec }}>Manage newsletter sponsorship slots and ad inventory</p>
        </div>
        <Button onClick={openCreate} style={{ background: theme.brandAccent }}>
          <Plus size={16} /> Create Sponsor
        </Button>
      </div>

      {/* Revenue Summary Card */}
      <div style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Sponsor Revenue"
          value={formatPaise(totalEarned)}
          icon={<DollarSign size={20} />}
          color={theme.green}
        />
      </div>

      {/* Sponsors Table */}
      {sponsors.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={28} />}
          title="No sponsors yet"
          description="Create a sponsor slot to start monetizing your newsletters."
          action="Create Sponsor"
          onAction={openCreate}
        />
      ) : (
        <div style={darkCard}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                  {['Brand Name', 'CPM', 'Budget', 'Spent', 'Impressions', 'Clicks', 'CTR%', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 12px', fontSize: 13,
                      fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sponsors.map((s) => {
                  const ctr = s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(2) : '0.00'
                  const spentPct = s.budget_paise > 0
                    ? Math.min(100, Math.round((s.spent_paise / s.budget_paise) * 100))
                    : 0

                  return (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px', fontSize: 14, fontWeight: 500, color: theme.text }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {s.brand_logo_url ? (
                            <img
                              src={s.brand_logo_url}
                              alt={s.brand_name}
                              style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: 28, height: 28, borderRadius: 6, background: theme.brandAccentSoft,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: theme.brandAccent, fontWeight: 700, fontSize: 12,
                            }}>
                              {(s.brand_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          {s.brand_name}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                        {formatPaise(s.cpm_paise ?? 0)}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                        {formatPaise(s.budget_paise ?? 0)}
                      </td>
                      <td style={{ padding: '12px', minWidth: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            flex: 1, height: 6, borderRadius: 3, background: theme.bgTer,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${spentPct}%`, height: '100%', borderRadius: 3,
                              background: spentPct >= 90 ? theme.red : spentPct >= 70 ? theme.amber : theme.brandAccent,
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: theme.textSec, whiteSpace: 'nowrap', fontFamily: fontMono }}>
                            {formatPaise(s.spent_paise ?? 0)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                        {(s.impressions ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                        {(s.clicks ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                        {ctr}%
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge color={s.status === 'active' ? 'success' : s.status === 'paused' ? 'warning' : 'neutral'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => toggleStatus(s)}
                            style={{
                              ...actionBtnBase,
                              color: s.status === 'active' ? theme.amber : theme.green,
                            }}
                          >
                            {s.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                            {s.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            style={{
                              ...actionBtnBase,
                              color: theme.textSec,
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Sponsor' : 'Create Sponsor'}
        width={560}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Brand Name"
            placeholder="e.g. HealthKart"
            value={form.brand_name}
            onChange={(e) => handleChange('brand_name', e.target.value)}
          />
          <Input
            label="Brand Logo URL"
            placeholder="https://example.com/logo.png"
            value={form.brand_logo_url}
            onChange={(e) => handleChange('brand_logo_url', e.target.value)}
          />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.textSec, marginBottom: 6 }}>
              Ad HTML
            </label>
            <textarea
              placeholder="<div>Your ad creative HTML...</div>"
              value={form.ad_html}
              onChange={(e) => handleChange('ad_html', e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${theme.border}`,
                fontSize: 14, fontFamily: fontMono, resize: 'vertical', outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
                background: theme.bgTer, color: theme.text,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.brandAccent
                e.target.style.boxShadow = `0 0 0 3px ${theme.brandAccentSoft}`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.border
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>
          <Input
            label="CTA URL"
            placeholder="https://brand.com/offer"
            value={form.cta_url}
            onChange={(e) => handleChange('cta_url', e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="CPM (in Rupees)"
              type="number"
              placeholder="50"
              value={form.cpm_paise}
              onChange={(e) => handleChange('cpm_paise', e.target.value)}
              helper="Cost per 1000 impressions"
            />
            <Input
              label="Budget (in Rupees)"
              type="number"
              placeholder="10000"
              value={form.budget_paise}
              onChange={(e) => handleChange('budget_paise', e.target.value)}
              helper="Total budget for this sponsor"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={form.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: theme.red, fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} type="submit" style={{ background: theme.brandAccent }}>
              {editingId ? 'Update Sponsor' : 'Create Sponsor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
