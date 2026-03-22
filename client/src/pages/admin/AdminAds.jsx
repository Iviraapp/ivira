import { useState, useEffect } from 'react'
import { Megaphone, Plus, Eye, MousePointer, Calendar, MapPin, Trash2, Edit3, X } from 'lucide-react'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"
const N = {
  bg: '#0A0F1E', card: '#141C33', border: '#1E2A4A',
  text: '#E2E8F0', textSec: '#94A3B8', textTer: '#64748B',
  accent: '#1A3A8F', green: '#22C55E', red: '#EF4444', amber: '#F59E0B',
}

export default function AdminAds() {
  const [campaigns, setCampaigns] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '', description: '', image_url: '', click_url: '',
    target_city: '', target_tier: '', active_from: '', active_until: '',
  })

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('ivira_admin_token')}` })

  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get('/super/ads', { headers: headers() })
      setCampaigns(data.campaigns || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaigns() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/super/ads', form, { headers: headers() })
      setShowForm(false)
      setForm({ title: '', description: '', image_url: '', click_url: '', target_city: '', target_tier: '', active_from: '', active_until: '' })
      fetchCampaigns()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return
    await api.delete(`/super/ads/${id}`, { headers: headers() })
    fetchCampaigns()
  }

  const toggleActive = async (campaign) => {
    await api.put(`/super/ads/${campaign.id}`, { is_active: !campaign.is_active }, { headers: headers() })
    fetchCampaigns()
  }

  const inputSty = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    background: N.bg, border: `1px solid ${N.border}`,
    color: N.text, fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
  }

  const isLive = (c) => c.is_active && new Date(c.active_from) <= new Date() && new Date(c.active_until) >= new Date()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Megaphone size={22} color={N.accent} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: N.text, fontFamily: FONT, margin: 0 }}>Global Ad Manager</h1>
            <p style={{ fontSize: 13, color: N.textSec, margin: '2px 0 0', fontFamily: FONT }}>Target ads by city or gym tier</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 8, background: N.accent, border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Campaign'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: N.card, borderRadius: 12, padding: 24, border: `1px solid ${N.border}`,
          marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: N.textSec, marginBottom: 4, display: 'block' }}>Campaign Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputSty} required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: N.textSec, marginBottom: 4, display: 'block' }}>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputSty} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: N.textSec, marginBottom: 4, display: 'block' }}>Image URL</label>
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} style={inputSty} placeholder="https://..." />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: N.textSec, marginBottom: 4, display: 'block' }}>Click URL</label>
            <input value={form.click_url} onChange={(e) => setForm({ ...form, click_url: e.target.value })} style={inputSty} placeholder="https://..." />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: N.textSec, marginBottom: 4, display: 'block' }}>Target City</label>
            <select value={form.target_city} onChange={(e) => setForm({ ...form, target_city: e.target.value })} style={inputSty}>
              <option value="">All Cities</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chennai">Chennai</option>
              <option value="Delhi">Delhi</option>
              <option value="Pune">Pune</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: N.textSec, marginBottom: 4, display: 'block' }}>Target Tier</label>
            <select value={form.target_tier} onChange={(e) => setForm({ ...form, target_tier: e.target.value })} style={inputSty}>
              <option value="">All Tiers</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: N.textSec, marginBottom: 4, display: 'block' }}>Active From *</label>
            <input type="datetime-local" value={form.active_from} onChange={(e) => setForm({ ...form, active_from: e.target.value })} style={inputSty} required />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: N.textSec, marginBottom: 4, display: 'block' }}>Active Until *</label>
            <input type="datetime-local" value={form.active_until} onChange={(e) => setForm({ ...form, active_until: e.target.value })} style={inputSty} required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" style={{
              padding: '10px 24px', borderRadius: 8, background: N.accent, border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
            }}>Launch Campaign</button>
          </div>
        </form>
      )}

      {/* Campaigns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {campaigns.map(c => (
          <div key={c.id} style={{
            background: N.card, borderRadius: 12, border: `1px solid ${N.border}`,
            overflow: 'hidden', position: 'relative',
          }}>
            {c.image_url && (
              <div style={{ height: 140, background: `url(${c.image_url}) center/cover`, borderBottom: `1px solid ${N.border}` }} />
            )}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: N.text, margin: 0, fontFamily: FONT }}>{c.title}</h3>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                  background: isLive(c) ? N.green + '20' : N.textTer + '20',
                  color: isLive(c) ? N.green : N.textTer,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>{isLive(c) ? 'LIVE' : c.is_active ? 'SCHEDULED' : 'PAUSED'}</span>
              </div>
              {c.description && <p style={{ fontSize: 13, color: N.textSec, margin: '0 0 12px', fontFamily: FONT }}>{c.description}</p>}

              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Eye size={13} color={N.textTer} />
                  <span style={{ fontSize: 12, color: N.textSec, fontFamily: FONT_M }}>{c.impressions || 0}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MousePointer size={13} color={N.textTer} />
                  <span style={{ fontSize: 12, color: N.textSec, fontFamily: FONT_M }}>{c.clicks || 0}</span>
                </div>
                {c.target_city && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} color={N.textTer} />
                    <span style={{ fontSize: 12, color: N.textSec }}>{c.target_city}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                <Calendar size={12} color={N.textTer} />
                <span style={{ fontSize: 11, color: N.textTer }}>
                  {new Date(c.active_from).toLocaleDateString('en-IN')} — {new Date(c.active_until).toLocaleDateString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => toggleActive(c)}
                  style={{
                    flex: 1, padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: c.is_active ? N.amber + '18' : N.green + '18',
                    border: `1px solid ${c.is_active ? N.amber : N.green}40`,
                    color: c.is_active ? N.amber : N.green,
                    cursor: 'pointer', fontFamily: FONT,
                  }}
                >{c.is_active ? 'Pause' : 'Activate'}</button>
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{
                    padding: '7px 12px', borderRadius: 6,
                    background: N.red + '18', border: `1px solid ${N.red}40`,
                    color: N.red, cursor: 'pointer',
                  }}
                ><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && !loading && (
        <div style={{
          textAlign: 'center', padding: 60, background: N.card,
          borderRadius: 12, border: `1px solid ${N.border}`,
        }}>
          <Megaphone size={40} color={N.textTer} style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 15, color: N.textSec, fontFamily: FONT }}>No ad campaigns yet</p>
          <p style={{ fontSize: 13, color: N.textTer, fontFamily: FONT }}>Create your first campaign to start targeting gyms</p>
        </div>
      )}
    </div>
  )
}
