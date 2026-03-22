import { useState, useEffect } from 'react'
import api from '../../lib/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { SkeletonTable, EmptyState, Tabs } from '../../components/ui'
import Input, { Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { formatPaise } from '../../lib/utils'
import { Link2, RefreshCw, Zap } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const CAMPAIGN_TYPE_COLORS = { CPV: 'primary', CPM: 'success', CPI: 'warning', CPA: 'error' }

const EMPTY_CAMPAIGN = {
  name: '',
  campaign_type: 'CPV',
  offer_url: '',
  postback_url: '',
  payout_amount: '',
  payout_type: 'fixed',
  daily_cap: '',
  total_cap: '',
  start_date: '',
  end_date: '',
  brand_id: '',
}

export default function AdminAffiliate() {
  const [activeTab, setActiveTab] = useState('campaigns')
  const [campaigns, setCampaigns] = useState([])
  const [conversions, setConversions] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const { theme, isDark } = useTheme()

  const font = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  // Campaign modal
  const [campaignModalOpen, setCampaignModalOpen] = useState(false)
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN)
  const [editingCampaignId, setEditingCampaignId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Brand modal
  const [brandModalOpen, setBrandModalOpen] = useState(false)
  const [brandForm, setBrandForm] = useState({ name: '', category: '', base_url: '' })
  const [editingBrandId, setEditingBrandId] = useState(null)

  // Retry loading
  const [retrying, setRetrying] = useState(null)

  const adminToken = localStorage.getItem('ivira_admin_token')
  const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } }

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'campaigns') {
        const { data } = await api.get('/super/affiliate/campaigns', authHeaders)
        setCampaigns(data.campaigns || data || [])
      } else if (activeTab === 'conversions') {
        const { data } = await api.get('/super/affiliate/conversions', authHeaders)
        setConversions(data.conversions || data || [])
      } else if (activeTab === 'brands') {
        const { data } = await api.get('/affiliate/brands', authHeaders)
        setBrands(data.brands || data || [])
      }
    } catch (err) {
      console.error('Failed to load affiliate data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Campaign handlers
  const openNewCampaign = () => {
    setEditingCampaignId(null)
    setCampaignForm(EMPTY_CAMPAIGN)
    setError('')
    setCampaignModalOpen(true)
  }

  const handleCampaignChange = (field, value) => {
    setCampaignForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCampaignSubmit = async (e) => {
    e.preventDefault()
    if (!campaignForm.name.trim()) return setError('Campaign name is required')
    if (!campaignForm.offer_url.trim()) return setError('Offer URL is required')

    setError('')
    setSaving(true)

    const payload = {
      ...campaignForm,
      payout_amount: Math.round(Number(campaignForm.payout_amount || 0) * 100),
      daily_cap: campaignForm.daily_cap ? Number(campaignForm.daily_cap) : null,
      total_cap: campaignForm.total_cap ? Number(campaignForm.total_cap) : null,
    }

    try {
      if (editingCampaignId) {
        await api.put(`/super/affiliate/campaigns/${editingCampaignId}`, payload, authHeaders)
      } else {
        await api.post('/super/affiliate/campaigns', payload, authHeaders)
      }
      setCampaignModalOpen(false)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  const toggleCampaignStatus = async (campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    try {
      await api.put(`/super/affiliate/campaigns/${campaign.id}`, { status: newStatus }, authHeaders)
      fetchData()
    } catch (err) {
      console.error('Failed to toggle campaign status:', err)
    }
  }

  // Conversion retry
  const retryPostback = async (id) => {
    setRetrying(id)
    try {
      await api.post(`/super/affiliate/postback/retry/${id}`, {}, authHeaders)
      fetchData()
    } catch (err) {
      console.error('Failed to retry postback:', err)
    } finally {
      setRetrying(null)
    }
  }

  // Brand handlers
  const openNewBrand = () => {
    setEditingBrandId(null)
    setBrandForm({ name: '', category: '', base_url: '' })
    setError('')
    setBrandModalOpen(true)
  }

  const openEditBrand = (brand) => {
    setEditingBrandId(brand.id)
    setBrandForm({ name: brand.name || '', category: brand.category || '', base_url: brand.base_url || '' })
    setError('')
    setBrandModalOpen(true)
  }

  const handleBrandSubmit = async (e) => {
    e.preventDefault()
    if (!brandForm.name.trim()) return setError('Brand name is required')

    setError('')
    setSaving(true)
    try {
      if (editingBrandId) {
        await api.put(`/affiliate/brands/${editingBrandId}`, brandForm, authHeaders)
      } else {
        await api.post('/affiliate/brands', brandForm, authHeaders)
      }
      setBrandModalOpen(false)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save brand')
    } finally {
      setSaving(false)
    }
  }

  const truncate = (str, len = 16) => {
    if (!str) return '\u2014'
    return str.length > len ? str.slice(0, len) + '...' : str
  }

  const postbackBadge = (status) => {
    const map = { pending: 'warning', sent: 'success', failed: 'error' }
    return <Badge color={map[status] || 'neutral'}>{status}</Badge>
  }

  const darkCard = {
    background: theme.bgSec,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 24,
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

  const actionBtnBase = {
    padding: '4px 12px', borderRadius: 6, border: `1px solid ${theme.border}`,
    background: theme.bgTer, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: font, transition: 'background 0.15s',
  }

  const tabs = [
    { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
    { id: 'conversions', label: 'Conversions', count: conversions.length },
    { id: 'brands', label: 'Brands', count: brands.length },
  ]

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Affiliate Management</h1>
          <p style={{ fontSize: 14, color: theme.textSec }}>Manage S2S affiliate campaigns, conversions, and brands</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'campaigns' && (
            <Button onClick={openNewCampaign} style={{ background: theme.brandAccent }}>
              <Zap size={16} /> New Campaign
            </Button>
          )}
          {activeTab === 'brands' && (
            <Button onClick={openNewBrand} style={{ background: theme.brandAccent }}>
              <Link2 size={16} /> New Brand
            </Button>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : (
        <>
          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            campaigns.length === 0 ? (
              <EmptyState
                icon={<Zap size={28} />}
                title="No campaigns yet"
                description="Create your first affiliate campaign to start tracking."
                action="New Campaign"
                onAction={openNewCampaign}
              />
            ) : (
              <div style={darkCard}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                        {['Name', 'Type', 'Brand', 'Clicks', 'Conversions', 'CVR%', 'Payout', 'Status', 'Actions'].map((h) => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '10px 12px', fontSize: 13,
                            fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c) => {
                        const cvr = c.clicks > 0 ? ((c.conversions / c.clicks) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={c.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '12px', fontSize: 14, fontWeight: 500, color: theme.text }}>
                              {c.name}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <Badge color={CAMPAIGN_TYPE_COLORS[c.campaign_type] || 'neutral'}>
                                {c.campaign_type}
                              </Badge>
                            </td>
                            <td style={{ padding: '12px', fontSize: 14, color: theme.textSec }}>
                              {c.brand_name || '\u2014'}
                            </td>
                            <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                              {(c.clicks ?? 0).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                              {(c.conversions ?? 0).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                              {cvr}%
                            </td>
                            <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: theme.green, fontFamily: fontMono }}>
                              {formatPaise(c.payout_amount ?? 0)}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <Badge color={c.status === 'active' ? 'success' : 'warning'}>
                                {c.status}
                              </Badge>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <button
                                onClick={() => toggleCampaignStatus(c)}
                                style={{
                                  ...actionBtnBase,
                                  color: c.status === 'active' ? theme.amber : theme.green,
                                }}
                              >
                                {c.status === 'active' ? 'Pause' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Conversions Tab */}
          {activeTab === 'conversions' && (
            conversions.length === 0 ? (
              <EmptyState
                icon={<Link2 size={28} />}
                title="No conversions yet"
                description="Conversions will appear here once campaigns start tracking."
              />
            ) : (
              <div style={darkCard}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                        {['Click ID', 'Campaign', 'Gym', 'Type', 'Amount', 'Postback Status', 'Actions'].map((h) => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '10px 12px', fontSize: 13,
                            fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {conversions.map((conv) => (
                        <tr key={conv.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{
                            padding: '12px', fontSize: 13, color: theme.textSec,
                            fontFamily: fontMono,
                          }} title={conv.click_id}>
                            {truncate(conv.click_id, 12)}
                          </td>
                          <td style={{ padding: '12px', fontSize: 14, fontWeight: 500, color: theme.text }}>
                            {conv.campaign_name || '\u2014'}
                          </td>
                          <td style={{ padding: '12px', fontSize: 14, color: theme.textSec }}>
                            {conv.gym_name || '\u2014'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <Badge color={CAMPAIGN_TYPE_COLORS[conv.conversion_type] || 'neutral'}>
                              {conv.conversion_type || '\u2014'}
                            </Badge>
                          </td>
                          <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: theme.green, fontFamily: fontMono }}>
                            {formatPaise(conv.amount ?? 0)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {postbackBadge(conv.postback_status)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {conv.postback_status === 'failed' && (
                              <button
                                onClick={() => retryPostback(conv.id)}
                                disabled={retrying === conv.id}
                                style={{
                                  ...actionBtnBase,
                                  color: theme.cyan, display: 'flex', alignItems: 'center', gap: 4,
                                  opacity: retrying === conv.id ? 0.6 : 1,
                                }}
                              >
                                <RefreshCw size={12} style={{
                                  animation: retrying === conv.id ? 'spin 1s linear infinite' : 'none',
                                }} />
                                Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Brands Tab */}
          {activeTab === 'brands' && (
            brands.length === 0 ? (
              <EmptyState
                icon={<Link2 size={28} />}
                title="No brands yet"
                description="Add a brand to start creating affiliate campaigns."
                action="New Brand"
                onAction={openNewBrand}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    style={{ ...glassCard, position: 'relative' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${theme.brandAccent}4D`
                      e.currentTarget.style.boxShadow = `0 4px 30px rgba(0,0,0,0.3), 0 0 0 1px ${theme.brandAccentSoft}`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.border
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <button
                      onClick={() => openEditBrand(brand)}
                      style={{
                        position: 'absolute', top: 16, right: 16,
                        width: 32, height: 32, borderRadius: 8, border: 'none',
                        background: theme.bgTer, color: theme.textSec, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontFamily: font,
                      }}
                    >
                      Edit
                    </button>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, background: theme.brandAccentSoft,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 12, color: theme.brandAccent, fontWeight: 700, fontSize: 18,
                    }}>
                      {(brand.name || '?')[0].toUpperCase()}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
                      {brand.name}
                    </h3>
                    {brand.category && (
                      <Badge color="neutral" style={{ marginBottom: 8 }}>{brand.category}</Badge>
                    )}
                    {brand.base_url && (
                      <p style={{ fontSize: 13, color: theme.textSec, wordBreak: 'break-all', marginTop: 8 }}>
                        {brand.base_url}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Campaign Modal */}
      <Modal
        open={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        title={editingCampaignId ? 'Edit Campaign' : 'New Campaign'}
        width={560}
      >
        <form onSubmit={handleCampaignSubmit}>
          <Input
            label="Campaign Name"
            placeholder="e.g. Summer Fitness Push"
            value={campaignForm.name}
            onChange={(e) => handleCampaignChange('name', e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Select
              label="Campaign Type"
              value={campaignForm.campaign_type}
              onChange={(e) => handleCampaignChange('campaign_type', e.target.value)}
            >
              <option value="CPV">CPV (Cost Per Visit)</option>
              <option value="CPM">CPM (Cost Per Mille)</option>
              <option value="CPI">CPI (Cost Per Install)</option>
              <option value="CPA">CPA (Cost Per Action)</option>
            </Select>
            <Select
              label="Payout Type"
              value={campaignForm.payout_type}
              onChange={(e) => handleCampaignChange('payout_type', e.target.value)}
            >
              <option value="fixed">Fixed</option>
              <option value="percentage">Percentage</option>
            </Select>
          </div>
          <Input
            label="Offer URL"
            placeholder="https://brand.com/offer"
            value={campaignForm.offer_url}
            onChange={(e) => handleCampaignChange('offer_url', e.target.value)}
          />
          <Input
            label="Postback URL"
            placeholder="https://tracker.com/postback?click_id={click_id}"
            value={campaignForm.postback_url}
            onChange={(e) => handleCampaignChange('postback_url', e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Input
              label="Payout Amount (in Rupees)"
              type="number"
              placeholder="50"
              value={campaignForm.payout_amount}
              onChange={(e) => handleCampaignChange('payout_amount', e.target.value)}
            />
            <Input
              label="Daily Cap"
              type="number"
              placeholder="1000"
              value={campaignForm.daily_cap}
              onChange={(e) => handleCampaignChange('daily_cap', e.target.value)}
            />
            <Input
              label="Total Cap"
              type="number"
              placeholder="50000"
              value={campaignForm.total_cap}
              onChange={(e) => handleCampaignChange('total_cap', e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Start Date"
              type="date"
              value={campaignForm.start_date}
              onChange={(e) => handleCampaignChange('start_date', e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={campaignForm.end_date}
              onChange={(e) => handleCampaignChange('end_date', e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: theme.red, fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" type="button" onClick={() => setCampaignModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} type="submit" style={{ background: theme.brandAccent }}>
              {editingCampaignId ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Brand Modal */}
      <Modal
        open={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        title={editingBrandId ? 'Edit Brand' : 'New Brand'}
        width={480}
      >
        <form onSubmit={handleBrandSubmit}>
          <Input
            label="Brand Name"
            placeholder="e.g. HealthKart"
            value={brandForm.name}
            onChange={(e) => setBrandForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Category"
            placeholder="e.g. Supplements"
            value={brandForm.category}
            onChange={(e) => setBrandForm((p) => ({ ...p, category: e.target.value }))}
          />
          <Input
            label="Base URL"
            placeholder="https://brand.com"
            value={brandForm.base_url}
            onChange={(e) => setBrandForm((p) => ({ ...p, base_url: e.target.value }))}
          />

          {error && (
            <p style={{ color: theme.red, fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" type="button" onClick={() => setBrandModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} type="submit" style={{ background: theme.brandAccent }}>
              {editingBrandId ? 'Update Brand' : 'Create Brand'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
