import { useState, useEffect } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import { Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { formatPaise } from '../../lib/utils'
import api from '../../lib/api'
import { Plus, Edit2, Package } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const DEFAULT_FEATURES = [
  'Member Management',
  'QR Check-in',
  'Payment Tracking',
  'WhatsApp Notifications',
  'Analytics Dashboard',
  'Staff Management',
  'Class Scheduling',
  'Custom Branding',
  'API Access',
  'Priority Support',
]

const EMPTY_FORM = {
  name: '',
  slug: '',
  price: '',
  billing_cycle: 'yearly',
  max_members: '',
  features: [],
}

export default function AdminPackages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { theme, isDark } = useTheme()

  const font = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  const adminToken = localStorage.getItem('ivira_admin_token')
  const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } }

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/super/packages', authHeaders)
      setPackages(data.packages || data || [])
    } catch (err) {
      console.error('Failed to fetch packages:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (pkg) => {
    setEditingId(pkg.id)
    setForm({
      name: pkg.name || '',
      slug: pkg.slug || '',
      price: pkg.price ? String(pkg.price / 100) : '',
      billing_cycle: pkg.billing_cycle || 'yearly',
      max_members: pkg.max_members ? String(pkg.max_members) : '',
      features: pkg.features || [],
    })
    setError('')
    setModalOpen(true)
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleFeature = (feature) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Package name is required')
    if (!form.slug.trim()) return setError('Slug is required')
    if (!form.price || isNaN(form.price)) return setError('Enter a valid price')
    if (!form.max_members || isNaN(form.max_members)) return setError('Enter max members')

    setError('')
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      price: Math.round(Number(form.price) * 100),
      billing_cycle: form.billing_cycle,
      max_members: Number(form.max_members),
      features: form.features,
    }

    try {
      if (editingId) {
        await api.put(`/super/packages/${editingId}`, payload, authHeaders)
      } else {
        await api.post('/super/packages', payload, authHeaders)
      }
      setModalOpen(false)
      fetchPackages()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save package')
    } finally {
      setSaving(false)
    }
  }

  const cycleLabel = (cycle) => {
    const map = { monthly: '/mo', quarterly: '/qtr', yearly: '/yr' }
    return map[cycle] || ''
  }

  const glassCard = {
    background: isDark ? 'rgba(26,26,26,0.7)' : 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '24px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, fontFamily: font }}>Subscription Packages</h1>
        <Button onClick={openAdd} style={{ background: theme.brandAccent }}>
          <Plus size={16} /> Add Package
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              background: theme.bgSec, borderRadius: 16, border: `1px solid ${theme.border}`,
              padding: 24, height: 240,
            }} />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div style={{ ...glassCard, textAlign: 'center', padding: 60 }}>
          <Package size={40} style={{ color: theme.textTer, marginBottom: 16 }} />
          <p style={{ color: theme.textSec, fontSize: 16, marginBottom: 16 }}>No packages yet</p>
          <Button onClick={openAdd} style={{ background: theme.brandAccent }}>Create First Package</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{ ...glassCard, display: 'flex', flexDirection: 'column', position: 'relative' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${theme.brandAccent}4D`
                e.currentTarget.style.boxShadow = `0 4px 30px rgba(0,0,0,0.3), 0 0 0 1px ${theme.brandAccentSoft}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.border
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Edit button */}
              <button
                onClick={() => openEdit(pkg)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: theme.bgTer, color: theme.textSec, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = theme.bgHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = theme.bgTer)}
              >
                <Edit2 size={14} />
              </button>

              {/* Header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: font }}>{pkg.name}</span>
                  <Badge color="primary">{pkg.billing_cycle}</Badge>
                </div>
                <span style={{
                  fontSize: 13, color: theme.textSec, background: theme.bgTer,
                  padding: '2px 8px', borderRadius: 4, fontFamily: fontMono,
                }}>
                  {pkg.slug}
                </span>
              </div>

              {/* Price */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: theme.text, fontFamily: fontMono }}>
                  {formatPaise(pkg.price)}
                </span>
                <span style={{ fontSize: 14, color: theme.textSec }}>{cycleLabel(pkg.billing_cycle)}</span>
              </div>

              {/* Limits */}
              <div style={{
                fontSize: 14, color: theme.textSec, marginBottom: 16,
                padding: '8px 0', borderTop: `1px solid ${theme.border}`,
              }}>
                Up to <strong style={{ color: theme.text, fontFamily: fontMono }}>{pkg.max_members}</strong> members
              </div>

              {/* Features */}
              {pkg.features && pkg.features.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pkg.features.map((f) => (
                    <div key={f} style={{ fontSize: 13, color: theme.textSec, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: theme.green, fontWeight: 700 }}>&#10003;</span> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Package' : 'Add Package'}
        width={520}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Package Name"
            placeholder="e.g. Growth"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
          <Input
            label="Slug"
            placeholder="e.g. growth"
            value={form.slug}
            onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            helper="Unique identifier (lowercase, no spaces)"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Price (in Rupees)"
              type="number"
              placeholder="24000"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
            />
            <Select
              label="Billing Cycle"
              value={form.billing_cycle}
              onChange={(e) => handleChange('billing_cycle', e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <Input
            label="Max Members"
            type="number"
            placeholder="500"
            value={form.max_members}
            onChange={(e) => handleChange('max_members', e.target.value)}
          />

          {/* Features Checkboxes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.textSec, marginBottom: 10 }}>
              Features
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DEFAULT_FEATURES.map((feature) => (
                <label
                  key={feature}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    fontSize: 13, color: theme.textSec, padding: '6px 8px', borderRadius: 6,
                    background: form.features.includes(feature) ? theme.brandAccentSoft : 'transparent',
                    border: '1px solid',
                    borderColor: form.features.includes(feature) ? theme.brandAccent : theme.border,
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.features.includes(feature)}
                    onChange={() => toggleFeature(feature)}
                    style={{ accentColor: theme.brandAccent }}
                  />
                  {feature}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: theme.red, fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} type="submit" style={{ background: theme.brandAccent }}>
              {editingId ? 'Update Package' : 'Create Package'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
